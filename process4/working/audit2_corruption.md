# Second audit of the Process4 definition, fifth draft: corruption, stall and false success

14 Nov 2026. Adversarial review. Read-only: no repository was changed, nothing was fetched, no session was started. This file is the only thing written.

Angle: that Process4 as now defined goes the way of Process3 (sessions add checks, caution, records and stops; drift; stall), or reports success while the product does not work.

Marks for evidence, kept apart throughout:

- **[measured]**: in Process3's record, with the place. "Measured by me today" means I read it on 14 Nov from the read-only clones or from the process repository's working copy.
- **[platform]**: a platform document, as quoted in another worker's paper. I re-read no vendor page.
- **[reasoning]**: my reasoning only.

"Register n" means entry n of the first round's register (`process4_counterarguments.md`).

---

## Verdict

**The fifth draft has closed the door Process3 died through, and left three others open.**

What is better than the draft the first round attacked, and I could not break:

- Sessions that build the product no longer own the process. Every process change waits for Bob. If that rule holds, the loop that made 270 of 296 process changes in nine days cannot run.
- A tranche no longer reaches the main branch on an undeployed walk. The first round's worst product finding (register 4) is answered by his own words.
- The notification storm is parked for study instead of being built.
- "No change" is always an option, and no session has a duty to build something for every fault.

What I argue will happen instead, in order of likelihood:

1. **The first tranche does not end.** Its ending now needs something Process3 never produced once, on a walk that by its own stored reports was never made in the form he now defines, starting from a product that failed 147 of 157 deployed steps. Rounds are unbounded. Waits at PROCESS are added on top.
2. **Or it ends because the walk was made to end.** The one session that decides a walk was "without flaws" is also the session that names flaws, rules what is "designed", merges the tranche into the main branch with no test running, and writes the report. The two documents the walks are measured against are written and republished by sessions. Nothing but text stands in that path. In Process3 a tool refusal stood there.
3. **The growth moves to the product's repository,** where nothing waits for Bob, and where the draft's own rule licenses any number of tests and walk steps so long as each names a requirement that sessions also write.

And one finding that is cheap to act on: **the rule he calls the hardest open problem is still held by text, although the only reason given for not holding it by a setting was removed by his own words of 14 Nov.** The process's own repository today carries standing approvals in his name that allow a session to merge a process change with no word from him.

---

## Findings, worst first

### 1. Whether a tranche has ended is decided by one session reading a report, against documents that sessions rewrite, with nothing but text in the way

**Counter-argument.** The end of a tranche, and so every release, rests on one sentence: the external walk was without flaws. The session that decides that is the same one that turns flaws into work, may rule a flaw "as designed", merges the tranche into the main branch, and writes the report you read. The two documents the walks are measured against are kept and changed by sessions, and one of them is no longer in the folder you named.

**Sentences concerned.**
- "The tranche ends only when an external walk completes without flaws." (D)
- "When the tranche ends, ARCH merges the tranche branch into the main branch as a whole, by pull request... None of the three tests runs on that pull request." (D)
- ARCH "starts the walking sessions, has the product deployed to the development site, and turns each flaw into work for a named module. It decides every technical matter of the product... It writes the tranche report." (C)
- "a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made." (D; his "agreed")
- "Checked by Claude: the folder exists on the branch the product is built on, with a screens sub-folder and files describing journeys." (D)
- "A lane's pull request merges with no test; that clause is in your approvals." (C)
- "Sessions write and count the walk's steps. A step that was loosened cannot be seen." (O; the draft's own admission)

Measured against: his words of 14 Nov ("So a release is always fully tested and walked successfully"; "screens and journeys are kept in docs/development/ux-substrate/ in the product repo").

**What it rests on.**
- [measured by me today] The journeys document is not in that folder on the branch the product is built on. A session removed `journeys.html` from it on 6 Nov (commit `ef9a2c7fde`, 49 files, 40,887 lines removed). The folder's own README now says: "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts, kept by the ux lane". Its table gives "Journeys" and "Screens" as links to claude.ai pages. What remains in the folder is a mock script (`screens/mock-journeys.js`, 32 journeys) and built screen data.
- [measured by me today] Sessions change those documents as part of deciding the design. Of 63 commits to that folder from 1 to 9 Nov, 61 are by sessions. One (`922154ffd1`, 8 Nov) records "the coordinator's rule (8 Nov): republish Screens to the same link whenever a DEC or BD changes a screen, in the same turn, never committing the build".
- [measured by me today] The architecture session's rulings already excused checks in the stored walks. The external walk of 8 Nov 23:50Z carries 36 notes of the form "draws its absence state at its bare address, so its tab title is not checked (the designed absence, BOB, 8 Nov)". "BOB" there is the architecture session, not the owner. The internal walk of the same hour carries 34 of the same.
- [measured] Process3's decision record: "a walk failure that is wholly a found mark already recorded and owed to a named layer does not block `release dev`" (PD-10, coordinator, 8 Nov) and "known gaps deferred on Bob's word count as passing" (PD-16). 9 of 35 changes to the walker's own code, by their titles, excuse, retire or postpone a step (first round, finding 1; titles read, not diffs).
- [measured] In Process3 this gate was held by the tool: "tranche close refuses, in order, without a clean internal walk, a release and a clean release walk" (change_sample, PR 269). The fifth draft's tool "does only this: push; open a pull request and mark it ready; merge; start the next job; send notifications; and write the shared state" (M).
- [reasoning] "Leaves out no step that the walk before it made" looks one walk back only. A step dropped in a walk that had flaws anyway does not count against the next walk. A journey never walked in any walk of the tranche is not "left out" at all. A step the walk marks as a note ("not walked", "not reached") is not a listed flaw. The stored reports show all three: step counts 175 then 157 while failing; 14 notes "not walked, the assistant does not work"; 63 notes "not reached on this instance".
- [reasoning] The same sentence forbids retiring a step that is itself wrong in the walk that would otherwise be clean. So it is weak where a session wants it weak and rigid where a step is honestly faulty.

**How bad.** Silently spoils the result and misleads Bob. A release would then rest on it: "always fully tested and walked successfully".

**Status.** RAISED BEFORE AND STILL OPEN (register 1, the part marked NO ANSWER FOUND; register 35). New since then: the gate is now the only thing between a tranche and the main branch; Process3's tool refusal is gone; the two documents are found to be session-kept pages outside the folder; the "one walk back" weakness of the agreed wording.

**Best answer within the rule.**
- Restore from his documents: put the journeys document and the screens document back in the folder he named, as files, so that what the walks are measured against is in git and has a history. This is where he says they are.
- Wording: a walk is without flaws when every journey in his journeys document was followed to its end and none is listed as a flaw, a note or "not walked". The count of journeys then comes from his document and not from the walker. This replaces "the walk before it" and is not a new check: it defines his word "all".
- Wording: say in section D that a ruling by ARCH that something a walk reported is "as designed" is a change to the screens or journeys document, and say whose that document is. Whether sessions may change the document a test is measured against is not technical. It decides what "works" means.
- Honest statement in section O: the tranche's end is one session's reading of a report, and nothing physical stands behind it.
- **No answer found** for stopping a session from loosening a step, or from merging before the walk is clean. Every stop I can see there is a check or a gate.

**Whose.** Bob's: whether sessions may edit the two documents, and what "all journeys" counts. Claude's: the restoring and the wording. The rest is accepted and unproven.

---

### 2. The rule he calls the hardest open problem is still only text, the reason for that is gone, and the process's own repository says the opposite today

**Counter-argument.** You decided that the process changes only at PROCESS with your approval, and that a product moves to a changed process only with your prior approval. Nothing physical holds either. The physical way was withdrawn on 13 Nov because it needed acts of yours and made work wait for you; your own words of 14 Nov now accept both. And the repository PROCESS would work in carries your older standing approvals, which let a session merge a process change without you.

**Sentences concerned.**
- "No session building a product may change the process, add a test, check, gate or review to it, or adopt a changed process." (H)
- "Nothing physical yet stops a session building a product from changing the process's files, or from moving to a changed process." (O, "Risks with no trial")
- "The process has its own repository and one fixed version for each tranche, moved only with your prior approval." (J)
- "How your approval is recorded (*Claude decided*). PROCESS writes your approving words into the record of the change in the process's repository, exactly as typed, with the date. Nothing else counts as approval." (H)
- "Wording changes only you can make. Your approvals still say 'Process3', 'BOB' and 'layer close'" (I). The list names the product's approvals only.
- Ended in K: "the check of the process version at a session's start; the check that the process files a product holds have not drifted".

Measured against: his typed words ("Process changes only happen in a separate process lane call PROCESS that I interact with"; "only with my prior approval"; "That rule exists only as text, and in Process3 text alone did not hold.").

**What it rests on.**
- [measured by me today] The process repository, branch `process4`, where section M keeps the Process4 work: its `CLAUDE.md` is his standing approvals of 1 and 2 Nov. Sessions "may, without asking me: ... merge pull requests into working and tranche branches once their required checks pass, without a person's review". It has no settings file, so no deny list. The newest approvals in that repository (its tranche branch, restated 8 Nov) say the same through the merge tool: "without a person's review, and merge the tranche's pull request into main the same way".
- [measured by me today] In the product, the process version is an entry sessions can move by pull request (`.process`, at commit `38b0f3f`), and four of the eight workflow files are copies of the process's. [measured] It was moved 116 times in nine days, all by sessions (product_side §4).
- [measured] Sessions made 270 of 296 process changes; checks were added in 41% of merges before and after he told them to stop (change_sample).
- [measured] The third draft put a setting to him ("fixed for a whole tranche by a setting only you can change") and said the fuller form "was the centre of the proposal withdrawn on 13 Nov, because it contradicts your requirements". The requirements meant are record lines 1 and 2. The fifth draft says his words of 14 Nov change both: "a process fault that stops work waits for you at PROCESS, and choosing and approving there are acts of yours." The drafting notes for the fourth draft record that the withdrawal was "Not mentioned in the draft" (v4_notes, row 9).
- [platform, via enforcement_levers levers 1 and 2] If the sessions' GitHub account is not a collaborator on the process's repository, GitHub refuses every write; a branch can be made updatable only by him. Neither was ever measured here.
- [measured] No case was found of the permission checker enforcing a "never" that had no deny rule or GitHub rule behind it (enforcement_levers lever 8). And the rule against adding checks "was never in Bob's committed text in Process3".
- [reasoning] A product session can start a session on any repository (ROOT is designed to start PROCESS on the process's). So "holds one repository" does not keep a product session's hands off the process.
- [reasoning] "Nothing else counts as approval" is recorded by the session whose change is being approved. No one can compare the record with what he typed.

**How bad.** Without a physical holder: repeats Process3, on the measured rate. Also misleads Bob: the draft tells him the rule exists while his own committed approvals in that repository grant the opposite.

**Status.** RAISED BEFORE AND STILL OPEN (register 2, 5, 13, 17). Register 13 was "put to you as a question"; his answer was the PROCESS paragraph, which sets the rule and is silent on what holds it. NEW: the reason for the withdrawal no longer stands; the state of the process repository's approvals and settings.

**Best answer within the rule.**
- Wording, his to commit: the process repository's approvals say that a change there is merged only on his word at PROCESS, and name what PROCESS may do. That puts the rule in the one text channel Process3 never tried.
- Permission or setting, put to him as a proposal: the branch of the process's repository that products use can be updated only by him; his merge of the change on GitHub's website is the approval. He already commits his approvals there. This costs one act per approved change, which he now makes anyway by typing his approval, and it makes "prior approval" something a session cannot write for him. It also means a product cannot move to a changed process that he has not merged.
- Honest statement: neither stops growth outside the process's repository (finding 6).

**Whose.** Bob's. It adds a kind of act (a merge on GitHub's website) to his list, and that is not technical. Building it needs a trial: none of it is measured.

---

### 3. A tranche may never end, for reasons that have nothing to do with tests growing

**Counter-argument.** You give the growth of tests as the reason no tranche finished. The record shows other reasons a walk failed that would recur in a process that does not grow at all: the walker's own machinery, the deployment's data, and a browser that died. The external walk as you now define it was never made in Process3. And three of the journeys begin at the installer or the website, which you have put outside the tranche.

**Sentences concerned.**
- "Nothing bounds the number of rounds. You give the reason no tranche finished in Process3: it 'kept adding test after test'. So the risk that a tranche does not come clean is unmeasured for a process that does not grow. Only your word ends a tranche that will not come clean." (D)
- "No walk of either kind finished without flaws in Process3 (measured), so that ending is unproven" (A)
- External walk: "follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results" (A, his words)
- "A development deployment does not use the installer" (D)
- "a walk is shared out among them by journey, with at most as many walking sessions as there are slots" (D)

**What it rests on.**
- [measured by me today, from the stored reports on the product's state branch]

  | Walk | Steps | Steps failing | What the failures were |
  | --- | --- | --- | --- |
  | Internal, 5 Nov 15:38Z | 236 | 0 marked | 63 failures listed, all of one kind: states the local walker could not reach |
  | Internal, 8 Nov 07:20Z | 238 | 0 marked | the same 63, three days later |
  | External, 8 Nov 07:20Z | 175 | 155 | 1,050 layout overlaps, 640 undefined style classes, 1 step |
  | Internal, 8 Nov 23:50Z | 357 | 70 | 96 layout overlaps |
  | External, 8 Nov 23:50Z | 157 | 147 | 80 steps on layout overlaps; **68 steps only because the walker's browser had closed** ("page.goto: Target page, context or browser has been closed", 67 times, and once at "browser.newContext") |

  So in the last external walk, about 68 of the 147 failing steps (about 46%) were one crash of the walker running through the rest of the "as member" steps; none of those steps lists any other failure. That is not growth and not a product fault.
- [measured] The same 63 failures stood on the internal walk for three days while its step count moved from 236 to 238. PD-10 names them: "every one an R21 carried state not reached on the local arm". A fault of the walker, owed for three days, then excused for a development release.
- [measured by me today] Of twelve development deployments, the first two stopped in the script that prepares the site for the walk and starts it (`p3dev-walk-setup.mjs --walk`; the record does not say in which part), one stopped at the build and one at the trial run of the deployment. The first external walk carries 63 notes "not reached on this instance" and one "no case on this instance": the deployed site did not hold the data the steps needed.
- [measured] 113 of 1,187 test runs failed on 3 to 5 Nov and 74% of those passed with no change to code or tests; module test runs were 21% failing on 7 and 8 Nov (k_evidence K1; product_side §6).
- [measured by me today] By their labels, the deployed walks were visits to each screen in two roles, not journeys followed to a result: 154 of the 157 steps of the last one are "screen <name>". The journey-like steps were in the internal walk, and of the 32 numbered journeys only two (3 and 28) appear there by name. His definitions of 14 Nov put the screens in the internal walk and the journeys in the external one. So the walk that must come clean to end a tranche has no ancestor in the record: its length, its failure rate and its data needs are all unknown. The 60 and 64 minutes the draft cites are for screen visits.
- [measured by me today] Journeys 1, 28 and 29 in the mock journeys file begin at the installer or at civicsmith.org ("Bob installs his team's Civicsmith from civicsmith.org"). "All journeys can be completed" cannot be true on a deployment that does not use the installer.
- [measured] The first Process4 tranche starts from Process3's end state: 357 requirement marks unmet, 51 found marks unmet, 147 of 157 deployed steps failing, 96 failures on the internal walk (product_side §8, §9). A walk is of the whole product. So whatever a tranche is said to contain, it cannot end until everything a walk can see is clean, including faults that were there before it began. Nothing in the draft says what sets the content or size of a tranche.
- [reasoning] Each round repeats both walks in full. Each fix round changes modules whose effects on other modules no module test sees (finding 7), so a round can add flaws while it removes them. The record has one data point: failures fell 89% in one round and 147 of 157 steps still failed.
- [reasoning] A walk shared among up to eight sessions against one deployed site adds what Process3 never had: walkers changing each other's data, and a "clean" result assembled by ARCH from eight partial reports.

**How bad.** Stops a tranche, without limit. Nothing reaches the main branch and no release can start.

**Status.** RAISED BEFORE AND STILL OPEN (register 1, first horn, and its "Not answered": the one-off measurement was not taken; tranche size is still not said). NEW: the measured causes that are not growth; the external walk as now defined never ran; the three journeys that need the installer.

**Best answer within the rule.**
- One-off trials before the process is in force, on Process3's last build, with no change to it: (a) make the same walk three times and count the steps that differ; (b) make one external walk as he now defines it, by journey, and record its length and how many journeys the deployed data lets it reach. Without these nobody knows whether a clean walk can be reached at all.
- Put to him, as a conflict between his own statements and not chosen here: "all journeys can be completed" against "installer and website are outside the tranche", for the journeys that begin there.
- Bob's to say: what a tranche contains, and whether a flaw that was there before the tranche began holds it open.
- Honest statement, already half made: rounds are unbounded. Add what his word does when he ends a tranche that will not come clean. The draft does not say whether it then merges with its flaws, which would contradict "a release is always fully tested and walked", or is dropped.
- **No answer found** for a walk step that fails for no reason in the product. Every remedy I can see (run it again, excuse it) is either a check or the loosening of finding 1.

**Whose.** Needs a trial first. Then Bob's for the two questions; Claude's for the rest.

---

### 4. While a process fault waits for him, the draft does not say what the product's sessions do, and what it does say recreates the pressure that made sessions add

**Counter-argument.** Every process fault that stops work now waits for you, for hours or days. The draft forbids the waiting sessions both to fix it and to work round it, says nothing of what they do instead, keeps an hourly alarm whose job is to wake or replace sessions that have stopped, and sends the fault to PROCESS as a description passed through three other sessions. The first tranche runs on a tool that does not exist yet, so such faults are the expected case in its first hours.

**Sentences concerned.**
- "The process itself has a fault. No session building a product fixes it or works round it. The job reports it to ARCH, and any change is made only at PROCESS, with you" (G)
- "Now a process fault that stops work waits for you at PROCESS... In Process3 one question that sessions carried as yours waited about nine hours (measured)." (H)
- "Once an hour an alarm wakes it as a safety net, as in Process3, to wake or replace a session that has stopped." (C)
- "Claude reads your hint to mean that the fault's description travels from ARCH to the coordinator and from the coordinator to PROCESS." (H)
- "In every other case the stop is recorded as a named blocker and other work goes on" (G)
- "How often a process fault stops work and so waits for you at PROCESS" (O, "Only the first real tranche can show")

Measured against: his PROCESS paragraph, which says where changes are made and that he may be "away from my computer for extended periods". It does not say "works round".

**What it rests on.**
- [measured] "or works round it" is the draft's wording, not his. The Foundations line it echoes, "a workaround for the moment is not a fix", is ranked first among the ten causes: "The texts mandated a build for every failure and outlawed the cheap alternative" (causal_forensics driver 1). The post-mortem recommended the opposite for a running tranche: "A process flaw found mid-tranche gets one line in a log and a workaround" (review.txt, "What has to be true"). The question put to him on 13 Nov named the sentence; his recorded answer limits the form of a fix and says nothing on working round (assessment_doc, the six questions and line "Question 1").
- [measured] What blocked sessions did: "Every layer-1 job on the copy failed the ownership check when it cleared a mark; BOB worked around it" (change_sample §4, PR 46). "Most of those edits [to his approvals] were drafted by the coordinator to work around some other refusal" (review.txt). On 8 Nov a ruling of "no workaround, no exemption" left a merge blocked for 96 minutes with 20 slots empty (review.txt).
- [measured] 296 changes merged into the process in nine days; about 38 of 53 later fixes repaired "defects or slowness that earlier process changes made" (causal_forensics driver 1). Process4's tool is new code (M: "No Process4 tool exists").
- [measured] After the stop of 9 Nov the hourly alarm fired until 13 Nov and sent 94 notifications (the draft, G). An alarm that ran falsely for over two hours cost 1,564 git processes before every command (change_sample §5, via first round).
- [reasoning] A session waiting on PROCESS is a session that has stopped. Nothing tells ROOT's hourly wake to leave it alone. Either ROOT replaces it each hour, or ROOT tells Bob each hour.
- [reasoning] PROCESS holds the process's repository only. It cannot look at the product's repository where the fault happened. It explains "the nature of the problem" to Bob from a description written by a job, passed by ARCH, passed by the coordinator. Each hop is a session's free text, the channel in which "about 6 job sessions" became his agreement (causal_forensics §3C).
- [reasoning] Who decides that a fault is the process's and not the product's, or a session's own slowness, is not said. A job that reports a product fault as a process fault parks its work with Bob. A job that reports a process fault as a product fault fixes it in the product (finding 6).

**How bad.** Stops a tranche for as long as he is away, repeatedly in the first days. Costs Bob time. Under that pressure, the product's repository is where the fix goes.

**Status.** NEW in this form. The first round raised the wait under the withdrawn wall (register 13, "waits for a man who is asleep"); his words of 14 Nov now make the wait the design, and that is not attacked. What is attacked is what the draft leaves undefined around it. Register 33 (who reports, who fixes) is ANSWERED for the route, by his hints.

**Best answer within the rule.**
- Wording: say what a session does while it waits. A job stopped by a process fault pushes, says so in one line and ends its turn; its slot is freed; ARCH goes on with every module the fault does not touch. ROOT's wake does not replace a session recorded as waiting on PROCESS, and tells him once, not hourly.
- Put to him: during the wait, may a session do by hand, once, what the tool failed to do, and record one line, changing no file of the process? The post-mortem said yes; the draft says no in words he did not write. It is the trade between "unattended" and "nothing changes without me", and it is his.
- Wording: the fault reaches PROCESS as the job's own words with the place in git where it can be seen, passed on unchanged.
- One-off trial before force: the build of the tool is itself the first test of how often it stops work. Count the stops in the rehearsal in process3-probes and tell him the number before the first real tranche.

**Whose.** Bob's for the question. Claude's for the wording. The rate needs the trial.

---

### 5. A public release can carry the installer, the website page, the journeys that use AI and an upgrade of existing data, none of them walked

**Counter-argument.** By the draft's reading of your three answers, a release waits only for the walk that ended the tranche. That walk uses no installer, may be made with no AI account connected, and starts from a fresh copy. So the first time the installer, an upgrade of an existing site and the assistant are used on a release may be by a real team. Your own words of 9 Nov said the opposite for AI, and they are not mentioned.

**Sentences concerned.**
- "Claude reads 'development release walk' as the external walk of the development deployment, the one that ends the tranche. Say if you meant a further walk." (P)
- "When the journeys that use AI are walked is not said; Claude will bring it to you when the release is built." (P)
- "A development deployment does not use the installer, so no walk shows that the installer can place a release into an empty account. The release path is unproven." (D)
- Ended in K, "on your words of 14 Nov": "separate install and upgrade tests before a release".
- "A walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data." (O)
- "None of the three tests runs on that pull request." (D, the merge into the main branch)

Measured against: his words of 14 Nov ("So a release is always fully tested and walked successfully"; "A tranche can end without an AI enabled run"; "installer and site updates wait for a clean development release walk"); Process3's decision record quoting him on 9 Nov: "Yes, the installer update and site update wait until a release walk with AI on is also clean."; his Foundations: "A public release is a development release the walkers have passed".

**What it rests on.**
- [measured] "Development release" is a term of his own: his standing approvals let sessions "cut development releases, with their tags and pre-releases" and "deploy and use development releases". On 8 Nov he spoke of "the release deployment" and "the walk of the release" as things that follow a clean internal walk (BD-R1). So "a clean development release walk" has a plain second reading: a walk of a development release, which is not the walk of the branch's deployment that ends the tranche.
- [measured] His 9 Nov sentence is in Process3's decision record (BD-R5) and nothing since withdraws it. Read with today's three answers, all four of his statements hold together only if a further walk, with AI on, comes between the tranche's end and the installer update. The draft's reading is the one under which they conflict.
- [measured by me today] About nine of the 32 journeys in the mock journeys file have steps that exist only with the assistant or open its panel (6, 10, 17, 22, 23, 24, 29, 32, and 4 by its title); journeys 4, 17 and 32 are about the assistant itself. Counted by script from that file, not by reading each journey. The stored walks carry 14 notes "not walked, the assistant does not work".
- [measured] Releases 0.59.0 to 0.63.0 each broke an existing store, unseen "because every suite builds a FRESH store" (first round, finding 2, from the test's own header). The test for it is now one module's own test and runs only on that module's job.
- [measured] No release of any kind was cut in Process3; neither release test was ever built (the draft, D and K).

**How bad.** Silently spoils the result at the one point where it reaches other people. Misleads Bob, whose sentence says a release is always fully tested and walked.

**Status.** Partly NEW (his three answers arrived with this draft). Partly RAISED BEFORE AND STILL OPEN (register 4, the release path; register 16). The draft does put its reading to him ("Say if you meant a further walk"), so it is open with him, not hidden; but it does not show him his 9 Nov sentence or the second reading.

**Best answer within the rule.**
- Do not choose. Put the four sentences side by side to him with the two readings, in plain words: (a) the release waits only for the walk that ended the tranche, and then the installer, an upgrade and the AI journeys are first used unwalked; (b) a development release is cut and walked, with the installer and with AI on, before the installer and website are updated, which is an external walk of another deployment and not a new kind of test.
- Wording in section A meanwhile: say what a release has and has not been walked for.
- Restore the 9 Nov sentence to section B as a recorded word of his that today's answers may or may not replace.

**Whose.** Bob's. It is what "released" means.

---

### 6. The growth has somewhere to go that does not wait for him, and the draft's own rule licenses it

**Counter-argument.** You name the growth of tests as what stopped Process3. The draft holds the process's repository still and leaves the product's repository open, and there it allows any number of tests and walk steps provided each names a product requirement. Sessions also write requirement lines. And 212 test files written for Process3's bookkeeping are in the product today and would run as module tests on day one.

**Sentences concerned.**
- "Tests and steps that jobs write (*Claude decided*). A module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in text. Process3 had 211 such test files (measured)." (E)
- "Most rules in this document are held by text alone, among them the rules against growth outside the process's own repository: product tests that serve the process, extra walk steps, demands written into another session's instructions, a helper briefed as a reviewer." (O)
- "ARCH starts the job session, with instructions naming every act the job may take." (D)
- ARCH "decides every technical matter of the product, writes each decision in the product's decision file" (C)
- "There is no need to any any more tests. PERIOD!" (his words, E and H)

**What it rests on.**
- [measured by me today] On the branch the product is built on: 189 test files named `notice-*` or `notices`, and 23 named `requirements-ids`. The draft does not say who removes them. They sit in about 190 modules, and a job may touch only its own module.
- [measured] 11,410 lines of such tests were 26% of the week's net test growth; `process/config.json` in the product grew from 24 lines to 421; the workflow files from 446 lines to 1,021; the walk's steps from 238 to 357 in one round (product_side §6; first round).
- [measured] "Each names the requirement it proves" is a rule about a label. The citation rule was met in form every time: "Tool 4,543+ lines; every rise cited" (causal_forensics driver 2). Sessions also write the labels: 183 found marks were added to requirement files during the week, and 30 new requirement files (product_side §5, §6b).
- [measured by me today] A job's pull request can change the workflow files in the product, four of which decide what "module tests" run. [platform, via enforcement_levers lever 6] A pull request's test run takes its workflow file from the pull request. The check that a job wrote only its own files is ended (K).
- [measured] Text typed by one session into another's start was a working channel for rules and cannot be compared with anything: "MY STANDING RULES TO BOB"; "told BOB '6 at most'; BOB followed for ~6 h" (causal_forensics §3).
- [reasoning] Under finding 4, a session blocked by a process fault and forbidden to change the process has one place left where it can act: its own tests, the walk, a helper script, a line in a decision file, a line in the next job's instructions.
- [reasoning] The agreed meaning of "without flaws" makes a step, once made, hard to drop. Steps then only accumulate within a tranche.

**How bad.** Repeats Process3 in the places that leave little or no record. Silently, over days.

**Status.** RAISED BEFORE AND STILL OPEN (register 5, NO ANSWER FOUND; register 2 third bullet). The draft admits it. NEW: the decision in section E read as a licence; the 212 files present today; that sessions write the requirement lines a test must name; the pressure from finding 4.

**Best answer within the rule.**
- Removal, by one mechanical edit before the first tranche: the 212 files go. It needs no judgment (two file-name patterns), which is his own definition of a mechanical edit.
- Put to him, because it interprets his fixed point: does "no more tests" mean three kinds with no limit on their number, as the draft has decided, or does it also hold the walk's steps to his journeys and screens documents? If the second, the walk's step list is derived from his documents (finding 1), which bounds it without any check.
- Setting, unproven: GitHub's policy that only named workflow files run for the sessions' account, so that a workflow file a session adds in the product never runs (enforcement_levers lever 5). One setting of his. It does not cover the content of the named files.
- Removal: delete from the definition the text rules that nothing can hold and the record shows did not hold, in place of restating them (the first round's remedy; not taken).
- **No answer found** for a session being more cautious in its own work, for demands typed into another session's instructions, and for a process rule written as a product decision. Any stop there is a check.

**Whose.** Bob's for the question. Claude's for the removal. The setting needs a trial.

---

### 7. Nineteen requirements in twenty are judged only by the job that wrote the code, a break between modules is seen by no test until a walk meets it, and built files are now committed by jobs with nothing comparing them to their sources

**Counter-argument.** You have accepted that a job writes the tests that judge its own work. Beside that stand three things the record shows got through exactly such tests: tests that pass whether or not the change is present, a merge in one module that breaks another module's tests, and a failing set of tests that travels to the main branch because nothing runs it again. The draft adds a fourth by deciding that jobs commit built files.

**Sentences concerned.**
- "A job's tests judge its own work. You have accepted that as the job's responsibility. Beside it: 8,838 requirement numbers against 236 to 357 walk steps (measured)" (O)
- "A module's tests run only on its own job. A failure caused by another module's merge can sit unseen until a walk meets it." (O)
- "*Claude decided* who builds and commits built files: the module's own job, in its own pull request." (J)
- Ended in K: "that a job's new tests fail when its change is undone; a second run of the module tests on the merged result; and that built files match their sources ... and the check that no built file is committed."
- "This rule is held by the job's instructions and not by any check." (C, on a job changing another module)

Measured against: his ledger line, kept 31 Oct with no note: "A job never commits a generated artifact." Its page explanation: "Build outputs, generated code and other derived artifacts are never committed by a job." Its reason: "Two jobs in a layer would conflict on the same artifact otherwise." The disposition marks it KEEP.

**What it rests on.**
- [measured] "Provenance's BD-18 change (copy PR 1007) breaks six tests in acquisition, case-authoring and case-disclosures" (Process3's decision record, PD-14, 8 Nov). Under Process4 those six tests run again only if those three modules get a job.
- [measured] Three modules whose changes could only merge together: "its own suite is red until they land, and they could not land until it did; none of the three could land. Merged together the suite is green" (PD-19b, 9 Nov). The fifth draft has one job per module, a job that never touches another module, and each job's tests passing before it merges. It has no case for this. It took 351 minutes in Process3 for 91 lines of source (product_side §7).
- [measured] Ten of the week's twenty recorded false "done" findings were tests that pass either way; on the one day with a count about 13% of "complete" claims were refuted by the tests on GitHub (k_evidence K4).
- [measured] 218 of 220 jobs read complete while the deployed product failed 147 of 157 steps (product_side §9.2).
- [measured by me today] A commit by the architecture session on 5 Nov: "untrack generated words.json and words-drawn.json (built at layer close, deploy and release; Bob 5 Nov)". The deployment record shows a build stage that generates the bundles before each deployment.
- [reasoning] With eight jobs open at once and no layers, a built file that holds many modules' code is rebuilt by every job that touches any of them. Either the jobs collide on it at every merge, which is the reason his line gives, or the copy in git is stale. With the comparison ended, a stale built file is deployed and the external walk walks old code: a clean walk of something that is not the source.

**How bad.** Silently spoils the result.

**Status.** RAISED BEFORE AND STILL OPEN (register 6, NO ANSWER FOUND, including "the failing tests that travel unseen"; register 31; register 38). ANSWERED in part: the draft now lists the risks plainly in section O, and his words settle that a job may not change another module. NEW: the built-files decision against his kept line; the two measured cross-module cases named.

**Best answer within the rule.**
- Structural: built files are not committed at all. The deployment step builds them, as Process3's deployment already did. That keeps his line, needs no comparison, and removes the collision.
- Put to him as a proposed change if Claude still wants jobs to commit them: it reverses a line he kept.
- Wording: say what happens to changes in several modules that can only pass together. His documents have one tool for a change across modules, the mechanical edit, and it is for changes that need no judgment.
- Honest statement: the rest is accepted and unproven, as section O now says.
- **No answer found** for a test that passes either way, or a failing set of tests that travels. Every remedy is a check he has ended.

**Whose.** Claude's to correct (built files; the wording). Bob's if the reversal stands. The rest is his accepted risk.

---

### 8. PROCESS can grow the process through the options it writes, and his approval is recorded by the session that wants it

**Counter-argument.** At PROCESS you choose among options a session wrote, about code you do not read, after a description that came through four sessions. The session frames the problem, writes the options, and writes down your answer. Your own words let the requirements themselves be changed there with your approval. When several changes wait, they are weighed together, and nothing says how large "together" may become.

**Sentences concerned.**
- "the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose" (his words, H)
- "The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval)." (his words, H)
- "the set of changes are considered together as a group that could potentially have interactions and implications between" (his words, H)
- "Line 20 stands beside them: a change 'must not add a new test, gate, review or stop. It may only correct or remove what is broken.'" (H)
- "So 'no change' is always among the options" (H)
- "the passage on the line between correcting and adding is gone" (the opening paragraph)
- "The process's own tool ... has tests of its own, the size limit on each role's starting text among them" (E)

**What it rests on.**
- [measured] How his choices went in Process3. 151 of 159 drafted lines accepted; 20 audit lines answered in three minutes, none dropped. "Yes, add that rule to the canon" on 6 Nov; three days later "SLB-12 sounds far too broad". Asked to choose a threat model, he chose the more protective branch, which was the session's recommendation. Each of four questions in 26 hours came back as a subsystem (causal_forensics §4.1, §4.2, driver 8).
- [measured, and it cuts the other way] On the fourth draft's thirteen proposals today he did not simply agree: he sent two back for study, questioned one, and overruled or corrected three (the walks as separate tests, a job never changes another module, slots across the account). Where he has his own picture of the thing, he pushes back. The six he answered "agreed" include the two most technical (tests for the tool; what "without flaws" means).
- [measured] A list of things not named test, gate, review or stop grew freely in Process3: records, alarms, retries, required arguments, rule text. 84% of the tool's refusal sites guarded the process's own state, records and argument shapes (causal_forensics §6). The draft once said the line between correcting and adding cannot always be drawn (register 2). It now says nothing.
- [measured] The tool's tests are a place growth is allowed: Process3's grew by 41,777 lines in nine days, in 255 of 296 merges (enforcement_levers, surface 4).
- [measured] Audits and groupings were additive: "every audit produced artifacts"; the one subtractive change of the week was partly restored by the next audit (causal_forensics §5).
- [measured] The process's costs fell on the product and its scoreboard was in the other repository: "9 Nov: process3 merged 16 PRs; the product landed 3" (causal_forensics driver 7). PROCESS sees only the process's repository.
- [reasoning] He may be away "for extended periods". PROCESS is then a long-lived session holding half-explored options. Nothing says how its state survives its own replacement (finding 10).
- [reasoning] The draft's own practice shows the hazard. His five words "three tests and no others" are written under "Under your decisions" as ending thirteen named checks (my count of the list in section K), one of them the guard on his approvals. The drafting notes say: "He restated his rule and did not write 'agreed'; the reading is the task's" (v5_notes §2). It is a fair reading. It is still a session's reading of a short reply, filed as his decision.

**How bad.** Costs Bob time, and misleads him about what he approved. Slower than Process3's loop, since each step needs him; but each step then carries his name.

**Status.** NEW for PROCESS. The underlying argument was RAISED BEFORE AND STILL OPEN (register 13, the click that degrades; register 2, the line that cannot be drawn; register 78, decisions by default).

**Best answer within the rule.**
- Wording for PROCESS: each option says in one plain sentence what it removes, what it changes and what it adds, and anything it adds is named as an addition even if it is not a test, gate, review or stop.
- Wording: a change to his requirements is never one option among several for a fault. It is put separately, as a change to his requirements, in his words "PROPOSED".
- Structural, restoring his documents: a fault that stops no work waits for the end of the tranche (his Foundations and his 9 Nov words "ganged up when possible"), so a group is adopted between tranches and never rewrites a process a tranche is running on.
- Permission (finding 2): his own merge is the approval, so no session records it for him.
- Honest statement: how well he can choose among technical options is unproven, and the record points both ways.
- **No answer found** for deciding whether a given change corrects or adds without someone judging it.

**Whose.** Bob's (how he wants options put; whether his merge is the approval). Claude's for the wording.

---

### 9. Several things marked "Claude decided", or written as his, change something he defined without being put to him as a proposal

**Counter-argument.** You wrote: "When you change something I defined you need to describe the PROPOSED change in words I understand". The fifth draft says no proposal is waiting. I count nine places where a thing you defined or kept is changed or interpreted under "Claude decided", "Claude reads", or with no mark.

The full list of Claude's decisions, with the strongest case against each, is appendix C. The nine:

| # | What the draft does | What of his it changes | Why it was not Claude's alone |
| --- | --- | --- | --- |
| a | Tests and walk steps are unlimited in number if each names a requirement (E) | His fixed point "three tests and no others"; his diagnosis "kept adding test after test" | It decides what "no more tests" bounds (finding 6) |
| b | Jobs commit built files (J) | Kept ledger line "A job never commits a generated artifact" | Reverses a kept line; not listed among the lines changed (finding 7) |
| c | Keeps the start-up comparison of his approvals, "Claude reads line 12 as covering it" (L 11) | His answer "three tests and no others", which the draft uses to end thirteen other checks, one of them the guard on the same approvals | The same words end one permission check and spare another. It is the stop after which "the product never restarted" (the draft, I). The notes flag: "Not put to him again" |
| d | Ends two Foundations duties and the first of his two health numbers "By Claude's decision" (K) | His Foundations: "Nothing here is in force until it has run on a real tranche with the two health metrics measured"; the duty to remove parts of the process one at a time at each model release | The second duty is the only standing force for removal in his documents. Ending the first number means his own sentence can never be met. The notes flag both |
| e | Moves requirements between modules "as a mechanical edit" (C) | His definition: a mechanical edit "touches many modules in the same trivial way and needs no judgment"; his example "a word table change" | Deciding which module's code meets each of 29 modules' requirements is judgment. It uses his one exception as a door (register 14) |
| f | "No session building a product ... works round it" (G) | His PROCESS paragraph, which does not say it | Finding 4 |
| g | Reads "development release walk" as the walk that ends the tranche (P) | His 9 Nov words on AI; his term "development release" | Finding 5. Put to him, but without the other reading or the 9 Nov sentence |
| h | Withdraws the proposal to drop the watcher because he asked "are you certain that the watcher isn't needed?" (C) | Nothing of his; but it treats his question as an instruction | The draft's own rule for the coordinator: "A question from you is answered in words, never by building anything." The answer in words exists and is not given to him as an answer (finding 10) |
| i | "Claude reads this as: the way Process3 kept to them is carried over unchanged" (J, GitHub's limits) | His hint "same as in process3" | The notes say: "I did not look up or describe what that way was". Process3's way was built, found useless ("Primary use never went above about 12% of the limit") and removed on 9 Nov (PD-22). Two of its hooks are still in the product's settings |

**What it rests on.** [measured] in each row from the draft, the drafting notes (v5_notes §1 rows 3, 7, 14; §2), the ledger, and Process3's decision record. Whether each is "not Claude's" is [reasoning].

**How bad.** Misleads Bob. Each is small; together they are the instrument the forensic record names: a list of decided things he must act to reverse (causal_forensics driver 8).

**Status.** RAISED BEFORE AND STILL OPEN as a class (register 78; register 20 for the health number; register 14 for the modules). Rows a, b, c, f, g, h, i are NEW with this draft. ANSWERED in part: the draft marks most of these as Claude's and invites him to overrule, and his third message did hand Claude the technical questions ("You're better qualified than I am to answer many of these questions").

**Best answer within the rule.** Wording only: move rows a, b, c, d, e, g to section P as proposals, each with what he defined, what changes, and what is lost. For c, the removal is also available: a session started after his edit loads the new approvals, and he already restarts ROOT with each edit, so the comparison can go without anything being added. Correct f and i. Answer h with the measured facts (finding 10).

**Whose.** Claude's to correct; then Bob's on each.

---

### 10. Five kinds of long-lived session, each replaced often, each started with text another session types

**Counter-argument.** ROOT, the watcher, the coordinator, ARCH and now PROCESS all live for hours or days. In Process3 the same kinds were replaced about every four to eight hours, each replacement was briefed by its predecessor, and within a day the brief had grown rules again. The draft replaces the briefing note with a shared state, and says little about what that holds or how it is kept from becoming the same note.

**Sentences concerned.**
- "For ARCH or the coordinator, ROOT starts a successor, which begins from the shared state and GitHub. For ROOT, the watcher takes over." (G)
- "Shared state (*Claude decided*)... It holds: which sessions hold the standing roles; the slot number; a stop; your instructions quoted exactly; notifications and walk flaws for modules with no open job; and the time ROOT last woke." (C)
- "ARCH was replaced 21 times in six and a half days in Process3 (measured)." (C)
- "The watcher is a standby session that takes over if ROOT dies... Claude withdraws the proposal, and the watcher stays as your documents have it." (C)
- "So only words you mark as a decision or an instruction are passed on" (C)
- "As in Process3, a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing." (I)

**What it rests on.**
- [measured] ROOT: 11 sessions from 3 to 8 Nov, living from 46 minutes to about 48 hours; "every change to the owner's approvals forced one". The coordinator: about 26 in six days. The architecture session: 21 sessions, that is one start and 20 handovers (roles_root_coordinator §1.1, §1.4; the draft's "replaced 21 times" is one too many). The watcher: 10 records, two takeovers.
- [measured] What a takeover is worth: "A takeover moves ROOT one level down, so it is a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity" (PD-2, quoted in roles_root_coordinator §1.6). So the watcher did not remove his act. It postponed it, and both times left no watcher behind (the draft). The watcher also has its own daily alarm and reads a record ROOT must keep writing.
- [measured] The briefing chain: 26 notes; one coordinator's "60% rule" became a start step; a note that carried "no rules and no restatement of Bob's words" was followed within 24 hours by "Rules in force" (causal_forensics §3).
- [measured] Session choices recorded as his: 14 of 21 items marked his were mechanisms; 7 of 35 safeguards quoted him (causal_forensics §4.1).
- [measured] Each of his five edits to his approvals stopped every long-lived session, and after the last the product never restarted (the draft, I). The first tranche will need edits: the draft lists wording that "only you can make" before any session can push.
- [reasoning] What the next ARCH needs is not in the list of what the shared state holds: which flaws it ruled "designed", what it is waiting for from PROCESS, what it has asked him. Either it re-derives them or the outgoing session writes them down, and then the note is back.
- [reasoning] "Your instructions quoted exactly" has no end. In Process3 the same list was called "BOB'S WORDS (binding)". Nothing says how a marked word is marked, who judges that it is, or when it stops applying. The coordinator decides, in the night, what was an instruction. Today's drafting, done carefully and by day, turned "ROOT", "the processes", "sessions", "same as in process3" and a question into decisions.
- [reasoning] The shared state is a branch written with no merge and no test, by every standing session. Process3's was 12,881 commits and 8,937 files, and its volume was the coordinator's own explanation of the account's suspension ("1,387 state pushes in 19 h", causal_forensics §6).
- [reasoning] After he approves a process change mid-tranche, the standing sessions still carry the old role text in their context. The check of the process version at a session's start is ended.

**How bad.** Drift over days; then a stop each time he edits his approvals. Costs Bob time.

**Status.** RAISED BEFORE AND STILL OPEN (register 8, ARCH is one long session, NO ANSWER FOUND; register 28, the stop that ended Process3 is kept; register 34, the alarm against a stop; register 15, the standby). ANSWERED in part by "sessions name roles, not session addresses" and by reading the stop at each wake, both unproven. NEW: PROCESS as a fifth standing session; the watcher restored without the measured answer to his question; the unbounded list of his instructions.

**Best answer within the rule.**
- Structural: no standing session lives across a round. ARCH and the coordinator are replaced at each round's end from git, by design, so replacement is the normal case and carries nothing typed. This was offered in the first round and not taken.
- Removal: with that, the start-up comparison of approvals can go (finding 9, row c).
- Wording: answer his question on the watcher with the three measured facts (both takeovers left no watcher; a takeover leaves ROOT a level deeper; Process3's own ruling called it a bridge until he restarts ROOT) and let him choose. Do not decide it by withdrawal.
- Wording: a marked instruction is one he begins with a word he chooses, it is stored once with its date, and it ends with the tranche unless he repeats it.
- Honest statement: the shared state is Process3's state branch under a new name, and the draft should give it a fixed list of what it may hold and say that nothing enforces the list.

**Whose.** Claude's for the structure and wording. Bob's for the watcher and for how he marks his words. Needs the trial for takeover and replacement.

---

### 11. A tranche that does not end reports nothing

**Counter-argument.** The one report is written when the tranche ends. Process3's tranche never ended, so no report was ever written, and every day's messages showed progress. Under the fifth draft the same stall would look the same to you.

**Sentences concerned.** "The tranche report. One report, written once by ARCH at the tranche's end... Nothing reads the report to decide anything." (J) "The coordinator tells you what ARCH decided, one plain line each" (C).

**What it rests on.** [measured] "The tranche never closed, so no tranche report was written" (k_evidence K4). "9 Nov: process3 merged 16 PRs; the product landed 3" was noticed only when the owner asked (causal_forensics driver 7). 218 of 220 jobs read complete while the deployed product failed (product_side). [reasoning] The author of the report is the session it describes, and after 20 handovers the ARCH that writes it did not see the tranche.

**How bad.** Misleads Bob, by silence.

**Status.** NEW. (Register 52 raised only that the report had no author; that is ANSWERED.)

**Best answer within the rule.** Wording: when a round ends, the coordinator tells him in two plain lines what the walks listed and how many rounds the tranche has had, taken from what the walks already wrote. That is telling, not a new record or number. And say in section D that a tranche with no end produces no report.

**Whose.** Claude's.

---

### 12. "Permission management is preserved" and "three tests and no others" are applied to the same kind of thing in opposite ways

**Counter-argument.** Two of your statements meet at the checks that guard your approvals. The draft ends the guard that stopped a session's pull request from changing your approvals, on "three tests and no others", and keeps the comparison that stops every long-lived session when you change them, on "permission management is preserved". It does not tell you the two statements pull against each other there.

**Sentences concerned.** "One consequence: with the guard gone, nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker." (K) "The start-up comparison of your approvals. Claude reads line 12 as covering it. *Kept*" (L 11).

**What it rests on.** [measured] The permission checker refused such an edit 2 times of 2 ("Instruction Poisoning", permissions_inventory via enforcement_levers surface 15); the same checker passed and refused the same act minutes apart elsewhere (the draft, O). [measured] The first round's register notes, item 10: the first audit "asked the draft to say where 'permission management is preserved' and 'three tests' pull against each other; the memo does not". [reasoning] With the lane clause ("A lane's pull request merges with no test") there is a merge path on which nothing runs at all.

**How bad.** Misleads Bob; and leaves his approvals behind a checker measured twice.

**Status.** RAISED BEFORE AND STILL OPEN (register 37 and 43; register notes §4 item 10). ANSWERED in part: the consequence is now stated in section K.

**Best answer within the rule.** Report the conflict to him; do not choose. One setting exists on GitHub's side that would make the approvals files changeable only with his approval (enforcement_levers lever 4). It is unproven on his kind of account, and it works by requiring his approval on a pull request, which he may count as a gate. If he does, **no answer found**: what stands behind his approvals is the permission checker, measured twice.

**Whose.** Bob's.

---

## Appendix A. Every rule in the fifth draft that is held only by text

"Held" names anything physical. Where a rule is partly held, the table says by what. Record entries are [measured] unless marked.

| # | Rule, in the draft's words | Section | Held by | What Process3's record shows about such text |
| --- | --- | --- | --- | --- |
| 1 | "only words you mark as a decision or an instruction are passed on, exactly as written"; "no session writes its own summary of your words as yours" | C | Text | 14 of 21 items marked his were mechanisms; 7 of 35 safeguards quoted him |
| 2 | "A question from you is answered in words, never by building anything." | C | Text | Four questions in 26 hours each returned a subsystem |
| 3 | The coordinator "decides nothing about the product and brings you no technical question"; puts a question "once" | C | Text | A technical question was carried as his for about nine hours by four coordinators |
| 4 | ROOT "decides nothing about the product and builds nothing" | C | Text | No evidence against; 11 ROOTs in five days |
| 5 | ARCH "never edits your approvals, changes the process, or publishes a release without you" | C | Approvals: the permission checker (2 of 2), nothing in git. Process: text. Release: not stated | Process: 270 of 296 changes by sessions |
| 6 | ARCH "settles a design before anything is built on it"; "writes each decision in the product's decision file" | C | Text | The process's decision file went from nothing to 49 KB in four days |
| 7 | A job "writes only its own module's files"; "never changes another module" | C, D | Text ("not by any check") | 0 of 2,540 commits strayed, with the check standing in four places; 34 blocks say the fix lay outside |
| 8 | A job "never merges, starts a session, deploys or changes the process" | C | Merge: deny list. The rest: text | The merge part held |
| 9 | "no helper is briefed to review another session's work" | C | Text | A review of every process change, by practice not by tool; 102 of 104 findings acted on |
| 10 | A design lane "delivers designs, never product code"; its pull request "merges with no test" | C | Text | The ux lane made 61 of 63 commits to the folder the walks are measured against |
| 11 | "Every session passes your suggestion on" (model and effort) | C | Text | Not recorded |
| 12 | The shared state "is written only through the process's tool" and holds six named things | C | Direct pushes: deny list. Contents: text | The state branch grew to 12,881 commits |
| 13 | "Sessions name roles, not session addresses" | C | Text | Unproven |
| 14 | "Sessions are at most three levels deep, and none starts its own replacement." | C | Text | Both watcher takeovers left ROOT a level deeper; coordinators started their own successors until 5 Nov |
| 15 | Ready jobs take slots "earliest in the order first"; "Only your marked instruction puts a module ahead." | D | Text, unless the tool's code chooses | "told BOB '6 at most'; BOB followed for ~6 h" |
| 16 | "instructions naming every act the job may take" | D | Free text typed by ARCH | "MY STANDING RULES TO BOB" |
| 17 | "A flaw it finds in another module goes to ARCH" | D | Text | Held, with the check standing |
| 18 | "There is no review" | D | Text; the tool has no review argument | See row 9 |
| 19 | "The slot is refilled in the same turn" | D | Text | A finished job went unnoticed for 194 minutes |
| 20 | A blocked job "records that it is blocked, pushes and stops" | D | Text | 165 block notes, median 1,389 characters |
| 21 | A mechanical edit "needs no judgment"; some are "so trivial that module tests need not be rerun" | D | A session judges | A light test run for record-only changes was added and narrowed two hours later |
| 22 | "Only when the internal walk finds no flaws is the product deployed" | D | ARCH's reading | Round 1's close deployed and walked after the internal walk had found flaws (PD-16) |
| 23 | "Each flaw becomes work for a named module" | D | ARCH's judgment | 36 notes "the designed absence, BOB, 8 Nov"; PD-10 |
| 24 | A walk "lists no flaw and leaves out no step that the walk before it made" | D | ARCH's reading of reports sessions write | Every step ok with 63 failures listed; 175 steps then 157; notes 17 then 60 |
| 25 | "The tranche ends only when an external walk completes without flaws"; then ARCH merges into the main branch with no test | D | Text. In Process3: a tool refusal | Never reached |
| 26 | "Only your word ends a tranche that will not come clean." | D | Text | Unproven |
| 27 | "A test runs only when there is a fully informed reason to run it" | E | Text | 63% of test runs were not started by a code change |
| 28 | Tests "complete yet fast and efficient"; "every requirement is tested at the module's interface and proven met" | E | Text | Ten of twenty false "done" findings were tests that pass either way |
| 29 | A test or step "exists only to prove a product requirement, which it names"; one that serves the process "is not allowed" | E | Text (the draft says so) | 211 files; every addition carried the label asked for |
| 30 | The tool's tests "run only when PROCESS changes the process, and cannot stop a product job" | E | Structure, unbuilt | Tool tests grew 41,777 lines |
| 31 | "After two failed corrections ARCH replaces the session" | G | Text; nobody is named to count (register 11) | A round limit was overridden all 17 times it applied |
| 32 | "No session building a product fixes it or works round it." | G | Text | "BOB worked around it" |
| 33 | One plain message when completely blocked; a blocker only he can clear "is told to you at once" | G | Text | The nine-hour wait |
| 34 | ROOT reads the stop at every wake "so that the hourly alarm does not undo it" | G | Text | 94 notifications after the stop |
| 35 | A process change "must not add a new test, gate, review or stop" | H | Text, and his choice | 41% before and after he said so |
| 36 | "No session building a product may change the process ... or adopt a changed process." | H | Text (the draft says so) | 116 moves of the version |
| 37 | "'no change' is always among the options" | H | Text | Decline was used where a named, cheap place for it existed |
| 38 | "PROCESS writes your approving words ... Nothing else counts as approval." | H | Text, written by the session concerned | "Yes, add that rule to the canon", then "far too broad" |
| 39 | Several changes "considered together as a group" | H | Text | Every audit produced artifacts |
| 40 | "No session writes, edits or relays" his approvals | I | The permission checker; nothing in git | 2 of 2 refused; the checker is uneven elsewhere |
| 41 | A long-lived session "on a difference does nothing" | I | The session's own act | Held too well: 5 stops of 5 |
| 42 | A session is started "with one repository only ... from the newest commit ... with starting instructions that name every act" | I | Text | ROOT came up on the main branch both times; coordinators held three repositories at times |
| 43 | "One judged act per command. A refused act is never reworded or handed to another session." | I | Text | After one refusal the checker treated the next push as a way round |
| 44 | "A session acts only on what it has read in full or measured" | J | Text | A 540 KB log "read from ... down" |
| 45 | "One short rulebook per role, at most ten rules." | J | Size of starting text: the tool's tests. Rule count: text | The one hard limit held all week |
| 46 | "The product's CLAUDE.md stays under thirty lines." | J | Text | 641 bytes to 8,664 |
| 47 | "one fixed version for each tranche, moved only with your prior approval" | J | Text | 116 |
| 48 | GitHub's limits kept "same as in process3" | J | Not stated | The machinery for it was removed on 9 Nov |
| 49 | In the report "No number is a target. Nothing reads the report to decide anything." | J | Text | A cost figure was made compulsory within 45 minutes of reading wrong |
| 50 | "one writer per file"; "one owner module per file" | J | Text | See row 7 |
| 51 | A walk "is shared out among them by journey" | D | ARCH assembles it | Never ran |

Of 51, something physical stands behind six in whole or part (5, 8, 12, 30, 40, 45). Outside the table and physical: the deny list in a session that holds one repository; GitHub's rules on the branches; the platform's stop after three refusals; settings only he can change. The first round counted 36 text rules in the second draft with three held. The fifth draft has more rules and says more honestly which are text. It has not reduced the number.

## Appendix B. The ten causes of growth: removed, only forbidden, or changed by PROCESS

Causes as ranked in causal_forensics §7.

| Cause | In the fifth draft | Verdict |
| --- | --- | --- |
| 1. The texts ordered a build for every failure and outlawed the cheap alternative | The duty to build is gone for product sessions and for PROCESS ("no change" is an option). But "or works round it" keeps the second half, and a product fault still always becomes work. PROCESS moves the builder away from the session that met the fault | **Changed by PROCESS.** Half removed, half kept in the draft's own words (finding 4) |
| 2. The restraint was built as a citation test with no cost term | The citation rule is ended. In the process it is replaced by his choice. In the product a new label rule appears: each test or step "names" a requirement | **Removed in the process. Reintroduced in the product** (finding 6) |
| 3. Text had a size limit and code had none, so a fix that must hold went into code | The limit on starting texts stays, as the tool's tests. Nothing limits the tool's code, the product's workflows, tests, walk or shared state. The draft itself teaches that text does not hold | **Not removed.** Forbidden in text |
| 4. A reflex that closes a problem with a guard, fails closed, and reads a question as a request for assurance | Coordinator rule in text. The draft does it itself with the watcher question and the start-up comparison, which fails closed | **Only forbidden** |
| 5. Review as a generator of obligations | No fresh reviewer, no helper as reviewer, no review argument in the tool | **Removed**, as far as the tool goes. A briefed helper is still possible (text) |
| 6. The roles that wrote the process carried no restraint text; briefing notes were their rulebook | PROCESS is a named lane with two rules of his quoted. No role text exists yet. PROCESS is long-lived across his absences and nothing says how it hands over | **Changed by PROCESS.** Unbuilt, unproven |
| 7. The scoreboard (process changes merged) and the cost (on the product) sat apart | PROCESS holds only the process's repository and cannot see the product | **Not removed.** Slowed by needing him |
| 8. Session choices recorded as his; his few words made into rules under his name | "Only marked words"; approval "exactly as typed". But PROCESS makes his short answer the only route for a process change, recorded by the session concerned | **Changed by PROCESS, and made central** (finding 8) |
| 9. His inputs pushed both ways; each edit to his approvals stopped everything | The stop on an approvals edit is kept. His words reach sessions through the coordinator | **Not removed** |
| 10. No session saw the total; audits were additive | The report comes once, at an end that may not come. Nothing shows him the size of the process when he chooses at PROCESS. A comparison that would have shown whether the process stayed as approved was taken out of the draft as a check (v5_notes §1 row 5) | **Not removed** |

Count: removed, 1 (cause 5) and half of 2. Changed by the PROCESS lane, 4 (causes 1, 6, 7 in rate only, 8). Only forbidden or untouched, 5 (causes 3, 4, 7, 9, 10). The first round counted two removed in the second draft. The real change since then is not in this table: it is that the sessions building the product are no longer the ones who may change the process, if finding 2 is dealt with.

## Appendix C. Everything marked "Claude decided" or "Claude reads": the strongest case against each

"Whose" says whether it was Claude's to make.

| Decision (section) | Strongest case that it is wrong | Whose |
| --- | --- | --- |
| Shared state in the product's repository, written with no merge (C) | It is Process3's state branch again: every record needs guards on form, freshness and writer, and the branch's volume was the coordinator's own account of the suspension. It also holds "your instructions quoted exactly", written by sessions. And the slot number, which he has now made an account-wide number, sits in one product | Claude's. Weight: real |
| Requirement-only modules moved "as a mechanical edit" (C) | Finding 9, row e | Bob's |
| A module's work is finished when "its notified job tells ARCH that nothing needs changing" (D) | A walk flaw placed against a module is "work" too. So a flaw can be closed by the job saying nothing needs changing, and the walk then finds it again or not. It also settles part of what he sent for study ("what a notified job does") | Claude's for jobs; under study for notifications. Weight: real |
| The mechanical edit merges once, between a round's last merge and its internal walk, with all touched modules' tests or none (D) | It is then the last change before the walk, across many modules, possibly with no test run. "None run" needs the required check to report without running, which is a way round the one gate on a session's judgment (register 68, still open) | Claude's. Unproven |
| Order of a round: jobs, internal walk, deployment only after a clean internal walk (D) | Faults only a deployment shows are found last. A walker fault on the internal walk (63 failures for three days) blocks every deployment. But his own words of 8 Nov ask for this order | His words support it. Weight: low |
| Walking sessions use the job slots, share a walk by journey, at most eight (D) | The internal walk is by screens, not journeys (the notes admit it). Eight walkers on one site change each other's data. Across the account they compete with another product's jobs | Claude's. Unproven |
| Tests and steps: product work, each names a requirement (E) | Finding 6 | Bob's |
| The tool's tests do not count against "no more tests" (E, "Claude reads") | Put to him in P. Fair | Put to him |
| The fault's description travels ARCH to coordinator to PROCESS (H, "Claude reads") | Finding 4: three hops of free text, and PROCESS cannot see the product | Claude's. Weight: real |
| "the processes" means the process's own repository (H, "Claude reads") | That repository today holds Process3's whole tool, guide and decision record on other branches, and his Process3 approvals. PROCESS starts among ready-made answers to every fault, each of them an addition (finding 2) | Put to him. Weight: real |
| His approval is recorded by PROCESS (H) | Findings 2 and 8 | Bob's |
| The tranche branch becomes the default branch (I) | On a public repository the unfinished, unwalked branch becomes what every visitor and every default-branch feature of GitHub uses, and the main branch, the only one a release is cut from, is hidden. His commits on the website then land on a branch that needs a pull request with tests passing, which a change touching no module cannot yet get (register 3, still open; the draft says so in M) | Claude's to propose; his act makes it. Unproven |
| Jobs build and commit built files (J) | Finding 7 | Bob's (reverses a kept line) |
| "same as in process3" for GitHub's limits (J, "Claude reads") | Finding 9, row i | Claude's to correct |
| ARCH writes the tranche report, once, at the end (J) | Finding 11 | Claude's |
| The first health number ended; three measurements ended unmeasured; two Foundations duties ended (K) | Finding 9, row d | Bob's |
| The hourly wake stands as the alarm for lack of progress (K) | Finding 4: it cannot tell waiting from dead | Claude's. Weight: real |
| L 1, 2, 3, 5, 8, 10: receipt, set-up check, size cap, oversized-file check, line-by-line test, reading audit, all ended | None of weight. Each rests on his quoted words or on a measured zero | Claude's |
| L 4, 6: cost recording and the job record ended | Cost may then never be reported ("cheaply" is half his purpose). With state in pull requests, a second suspension hides the record (register 9, 49) | Claude's. Stated |
| L 7: the citation rule ended | It failed as a brake and worked as a trail: the counts of what was his could be made only because additions named their authority (register 77, still open) | Claude's. Weight: low now that PROCESS records each change |
| L 9: refusal for size allowed for the process's own texts | Something refuses; he agreed it as the tool's tests | Settled by his "agreed" |
| L 11: the start-up comparison kept | Finding 9, row c | Bob's |
| L 12: tokens in the cloud environment; the test run in two parts | The two-part run was kept in the second draft because "it costs little" with no measured failure (register 51). It is now filed as permission management. Every session in that environment holds the deploy token, so "a job never deploys" is text | Claude's. Weight: low |
| Two products and the eight slots: "Claude will settle this when a second product starts" (N) | "Across the account" is his; a session sees one product; the number lives in one product's state. Nothing can count across the account today | Deferred. Honest |
| "development release walk" (P, "Claude reads") | Finding 5 | Bob's |
| The process4 folder is the "subtree" (M, "Claude reads") | None of weight | Claude's |

## What three tests do not see: a summary for findings 3, 5 and 7

Classes of real failure in Process3's product record that would pass all three tests as defined and could reach a release. Each is [measured] as a class in the record; that it would pass is [reasoning].

| Class | Record | Why each test misses it |
| --- | --- | --- |
| An upgrade breaks existing stored data | Releases 0.59.0 to 0.63.0 | Module tests: one module's test, run only on that module's job. Both walks start from a fresh copy |
| The installer cannot place a release | Never run | A development deployment does not use it |
| The assistant does not work | 14 walk notes "not walked, the assistant does not work" | A tranche can end with no AI account connected |
| One module's merge breaks another's tests | PD-14: six tests in three modules | Those tests run only when those modules next have a job |
| A test passes whether or not the change is there | Ten of twenty false "done" findings | It is the job's own test; nothing else reads it |
| A state the walk cannot reach on the site | 63 notes "not reached on this instance" | A note is not a listed flaw |
| A requirement no screen or journey touches | 8,838 requirement numbers against a few hundred steps | Only the job's own tests look |
| A stale built file | Not measured as a failure | The comparison is ended; the walk walks what was built |
| Changes that only work together | PD-19b | No single job's tests can pass |

What each walk does not see, by his definitions. The internal walk (screens, product not deployed): the deployed site's real data and settings, whether a journey completes with a proper result, sign-in on a real account, anything that needs the installer or an AI account. The external walk (journeys, development deployment): screens no journey visits, states the seeded data does not hold, an upgrade, the installer, the AI journeys unless an account is connected, a second team's site, and anything that depends on time or volume.

## What I did not establish

- I did not read the claude.ai pages that now hold the Journeys and Screens documents. I read the folder's README, its history and the mock journeys file.
- Whether the labels "R7", "R9", "R21" in the stored internal walks correspond to numbered journeys. I say only that two numbered journeys appear by name.
- The count of journeys that use AI is by script on one file, not by reading each journey.
- Whether the 68 browser-closed failures of 8 Nov were caused by Cloudflare's limits, by the runner, or by the walker. The report gives the message only.
- The live settings of either repository on GitHub (rulesets, collaborators). I read files only.
- Whether a session started on the process's repository from the `process4` branch would in fact merge a change there. I read what his approvals in that branch allow; I started no session.
- The diffs of the walker commits whose titles excuse or retire a step (carried from the first round).
- I did not re-derive the notification study and say nothing on its three open questions beyond appendix C.

---

## MAP

Rated: solid / stated but unproven / thin / contradictory / missing.

| Area | Rating | Why, in one line |
| --- | --- | --- |
| Roles and sessions | Stated but unproven | Clear on paper; five long-lived kinds, each replaced every few hours in Process3; the watcher is restored without the measured answer to his question, and who starts it is open |
| Flow of a job | Stated but unproven | The best-defined part. Open: changes that only pass together; who counts failed corrections; a flaw closed by a job saying nothing needs changing |
| Rounds, walks and tranche end | **Thin, and contradictory in one place** | The end is one session's reading against session-kept documents; the external walk as defined never ran; three journeys need the installer he put outside the tranche; rounds unbounded; no tranche size |
| Release | **Contradictory** | His sentence "always fully tested and walked", his 9 Nov words on AI, today's three answers and the draft's reading do not all hold together; installer, upgrade and AI can go out unwalked |
| Notification | Missing by design | Honestly marked as under study. The rule for when a module's work is finished already pre-empts part of it |
| PROCESS and process change | **Thin** | His words are clear; nothing physical holds them; the process's repository's own approvals say the opposite today; what waiting sessions do is undefined; "works round" is not his |
| Permissions and starting | Stated but unproven | Carefully reasoned and honest about what is unmeasured; the stop on an approvals edit is kept; his approvals now stand behind the permission checker alone |
| State and waking | Thin | The shared state is Process3's state branch under a new name with no stated bound; the hourly wake cannot tell waiting from dead |
| Recovery | Stated but unproven | Replacement of ARCH with jobs open, takeover by the watcher, restart after an approvals edit: all untried, two of them failed in Process3 |
| Reports | Thin | One report, at an end that may never come, written by the session it describes; nothing tells him a tranche is stalling |
| What is unbuilt | Solid as a statement | Section M is complete and plain. Missing from it: who removes the 212 Process3 test files; the two documents the walks need |
| What is unproven | Solid as a statement, thin as a plan | Section O is the most honest part of the draft. It still omits the one trial asked for twice: whether a walk of an unchanged build gives the same answer twice |

**Where the focus is still needed, in order:** the tranche's end and who may change what the walks are measured against (findings 1, 3); what holds the PROCESS rule (finding 2); what a release has been walked for (finding 5); what sessions do while they wait (finding 4); the product's repository as the place growth goes (finding 6).
