# Attack on the Process4 definition, second draft: corruption and stall

14 Nov 2026. Read-only. Nothing in any repository was changed and no session was started.

Angle: that Process4 as defined goes the way of Process3 (sessions add checks, caution, records and stops), or stalls, or reports success while the product does not work.

Marks used for evidence, kept apart throughout:

- **[measured]** in Process3's record, with file and passage. "Measured by me today" means I read it from the read-only clones on 14 Nov.
- **[platform]** stated in a platform document, as quoted by another worker's paper (I did not re-read vendor pages).
- **[reasoning]** my reasoning only.

A simulation in finding 5 is [reasoning] run on [measured] inputs. Its script is `/tmp/claude-0/-home-user/53c12ae4-2f57-537f-a714-d9dd7c364da1/scratchpad/sim/sim.py`.

---

## Verdict first

**The definition would not run to its one output as written.** Three sentences, read as written, leave a tranche with no reachable end:

1. "A round that completes with no failures ends the tranche." Process3 never had such a round, the walk in Process3 carried 63 failures for three days while every step read "ok", and nothing in the definition bounds the number of rounds (finding 1).
2. "When every module that had work has merged, several sessions walk the product." A notified module is a module with work. Nine in ten notified modules have nothing to change, so nothing to merge, and "done means merged" (finding 5).
3. "A failure already on the tranche branch before the job began is named, and is not the job's to fix", beside "ARCH merges it ... once the tests pass". A module whose tests were broken by somebody else's merge can neither pass nor be fixed by its own job (finding 6).

Each has a wording repair. But the first has a second horn that no wording removes: the only sessions that can make a round end clean are the sessions that write the walk.

**On the Process3 loop.** Of the ten causes the forensic record ranks, the definition removes two (the citation rule and the tool's demand for a review). The other eight it forbids in their effect and leaves in place. The strongest of them, that every fault must be fixed and that a fix is built, is still Bob's requirement and still in the definition (finding 3, appendix B).

---

## Findings, worst first

### 1. The tranche can only end in two ways, and both are bad: it never ends, or the sessions that write the walk make it end

**Counter-argument.** No round in Process3 ever finished clean, so under this definition nothing would have reached the main branch, for ever, with every report showing progress. The only way out open to the sessions is to change the walk, which they write themselves, and in Process3 they did exactly that.

**Sentences attacked.**
- "A round that completes with no failures ends the tranche." (C; D test 3: "No failures ends the tranche.")
- "the main branch never moves while a tranche runs" (C)
- "Whether a separate list for a 'completion round' remains. *Decided:* none. Rounds simply repeat." (K, technical 11)
- "it also carries the walk result ...: steps passing out of steps in all, with any steps added or removed since the last round shown beside it ... These are reported, never enforced." (G)

**Evidence.**
- [measured] No clean walk of either kind in Process3; the main branch's last commit is 1 Nov 22:24Z and it was "Not touched during the week" (product_side §1, §9.2; k_evidence K5(b)). Process3 ran 14 layers or rounds; the last completion round still deferred 5 of 33 items (product_side §8).
- [measured by me today] The stored internal walk reports on the product's state branch:

  | Report | Steps | Steps "ok" | Failures listed | Notes of things not walked, not reached or not checked |
  | --- | --- | --- | --- | --- |
  | Internal, 5 Nov 15:38Z | 236 | 236 | 63 (all of kind "state") | 17 |
  | Internal, 8 Nov 07:20Z | 238 | 238 | 63 (the same kind) | 17 |
  | Internal, 8 Nov 23:50Z | 357 | 287 | 96 | 60 (51 by keyword) |
  | External, 8 Nov 07:20Z | 175 | 20 | 1,691 | 83 |
  | External, 8 Nov 23:50Z | 157 | 10 | 178 | 36 |

  So "no failures" already has three readings in the record: every step "ok" (true on 5 and 8 Nov), an empty failure list (never true), and nothing left unwalked (never true). The definition's own sentence in C uses the first reading for 8 Nov ("every one of its 238 steps passing (with 63 failures of a kind already known)"). A session choosing the reading chooses whether the tranche has ended.
- [measured by me today] The walk is ordinary product code in one module, `journey-check`, at place 218 of 220. From 1 to 9 Nov it took 35 non-merge commits. By their subjects, 9 of the 35 excuse, retire, allow or turn a step into a "todo": "a screen's absence state at its bare address is not failed on its tab title" (`763bd8856b`), "connect and teamai states retired; the rest the live arm's or known gaps" (`1e743f5d7d`), "R1 (a) excusing only the states the local copy cannot draw" (`0748ff4add`), "R17's rows scan is a todo owed to the ux lane's word pass (BOB's ruling, 7 Nov)" (`97f6a275af`). I read subjects, not diffs; some of these are surely right. The point is that they are the same act as a wrong one, made by the same job, with no reader.
- [measured] The step count moves both ways: internal 238 to 357 in one round; external 175 to 157 while it was failing (k_evidence K4(b)). The failure count rose from 63 to 96 on the internal walk "as it was given more to check" (product_side §9.2). A target that grows each round recedes.
- [measured] Red results with no cause in the code under test were common: 113 of 1,187 test runs red on 3 to 5 Nov, and "74% went green with no change to job code or tests" (k_evidence K1(i)(b), from the coordinator's check audit). That is about 7% of runs. Module suites were 21% failing on 7 to 8 Nov (product_side §6, CI time).
- [reasoning] A walk of several hundred steps with even a small false-failure rate per step almost never returns zero. A false failure "becomes work for a named module"; that module has nothing to fix; see finding 5 for what happens to a job with nothing to merge.
- [reasoning] The report line shows steps added or removed. It cannot show a step whose check was loosened, a state excused inside a step, or a journey moved to the notes. Those are the changes the record shows.

**How bad.** Stops a tranche (no output, unbounded), or silently corrupts the result and misleads Bob (a "clean" round that was made clean). Both at once is possible: weeks of rounds, then an ending reached by notes.

**Answer within the rule.**
- Wording: define "no failures" once, in the definition, as an empty failure list and no journey unwalked that an earlier round of the same tranche walked. This is a definition, not a new check; the walk already produces both lists.
- Structural: a tranche is small enough that its findings are few. The definition never says what sizes a tranche or who chooses its content. That is Bob's to say.
- Trial (one-off, before force): walk one unchanged build three times and count the steps that differ. Without that number nobody knows whether a clean round is reachable at all.
- Honest statement: there is no bound on rounds, and the only release from a tranche that will not converge is Bob's word to the coordinator. Say so in section E.
- **No answer found** for the second horn. The walk's steps are written, changed and counted by sessions, and any stop on that is a check. The wall of section K could hold the walk's files where only Bob merges them, at one click of his per change to the walk, and with the weakness of his click described in finding 4.

Sources: product_side §1, §5, §8, §9.2; k_evidence K4, K5; redteam_corruption 6; state branch `deploys/p3dev-l11/…/report.json`, `deploys/p3dev-l12/…/report.json`, `walks/internal/ef4ed6fa13-…/report.json`; product commits named above.

### 2. A product that does not work when deployed reaches the main branch by design

**Counter-argument.** On the one day Process3 could compare them, the internal walk had every step passing and the deployed product passed 20 steps of 175. Under this definition that build goes to the main branch, and the definition's one output is "correct, working product behaviour ... merged to the main branch".

**Sentences attacked.**
- "Its one output is correct, working product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later." (A)
- "It does not hold the tranche back. What it finds is the first work of the next tranche." (C)
- "There is no full regression; the internal walk replaces it." (D)
- "there is no separate install test or upgrade test before a release ... a walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data." (D)
- "The main and tranche branches take changes only by pull request with the tests passing." (F)

**Evidence.**
- [measured] 8 Nov 07:20Z, same build: internal 238 of 238 steps ok; external 20 of 175, 1,691 failures. 8 Nov 23:50Z: internal 287 of 357; external 10 of 157 (table in finding 1). Why the second pair differs "is not established in the record" (k_evidence K5(b)).
- [measured] As Process3 was built at its end, "tranche close refuses, in order, without a clean internal walk, a release and a clean release walk" (change_sample PR 269), and Bob's words of 8 Nov end a tranche only "When the release walk is clean" (k_evidence K5(a), BD-R1). The definition reverses that order on the word "optional" in a session's record of 13 Nov.
- [measured] 218 of 220 jobs complete, 542 marks struck, 98.8% of merged lines still present, while the deployed product failed 147 of 157 steps (product_side §5, §9.2).
- [measured] Releases 0.59.0 to 0.63.0 each "BRICKED an existing store", unseen "because every suite builds a FRESH store" (header of `migrate-released.test.mjs`, quoted in k_evidence K1(ii)(b)). That test is now one module's own test and runs only when that module's own files change.
- [measured] The one known break between two modules in about 200 job merges (4 Nov) passed its own module's tests and showed only when "the first development deploy served 500s" (change_sample case 1).
- [reasoning] Nothing in the definition says what runs when the tranche branch itself merges into the main branch. Test one's trigger is "a job's pull request changes its module's files"; the tranche merge is not a job's pull request. Either nothing runs, and GitHub's rule "with the tests passing" is met by an empty check, or every changed module's tests run, which is the full regression Bob ended, and which Process3 found could never go green: "a tranche of 30+ modules would be cancelled and main could never merge" (change_sample PR 92).
- [reasoning] "The first work of the next tranche" assumes a next tranche. If Bob starts none, the findings sit against a main branch that carries the faults.

**How bad.** Silently corrupts the result; misleads Bob, because "merged to the main branch" is the definition's own word for done.

**Answer within the rule.**
- Wording: section A must stop saying that the main branch holds working behaviour. What it holds is behaviour that passed its own module's tests and an undeployed walk. "Proven" and "not proven" are Bob's own fixed distinction.
- Structural, and Bob's: his 8 Nov order (the tranche ends when the deployed walk is clean) held nothing back from the main branch that worked. Restoring it makes the external walk a test that gates, which his "three tests" decision forbids. The two decisions conflict and only he can pick. The definition picked for him and listed it under "Claude decided".
- Wording: say what runs at the tranche-to-main merge. If nothing, say nothing.
- Trial: section J item 11 as written tests one put-back fault. Add to it, as a one-off, both walks on one build, to measure the gap of 8 Nov again after the page checks were added.
- **No answer found** that keeps "three tests, ever" and also makes the main branch hold a product measured to work when deployed.

Sources: product_side §5, §9.2; k_evidence K1(ii), K5; change_sample case 1, PRs 92 and 269; DECISIONS BD-R1; assessment_doc line 25.

### 3. "Correct or remove only" does not remove what made sessions add; it forbids the result, in text, and the line it draws cannot be drawn

**Counter-argument.** Sessions added checks in Process3 because their instructions told them every fault must be fixed and a fix is something built. Process4 still says every process fault is fixed, and adds one sentence about the form of the fix. The record says a sentence about form was obeyed in form: every Process3 addition carried the label the rule asked for.

**Sentences attacked.**
- "The process itself has a fault. Claude fixes it." (E)
- "The fix may only correct or remove what is broken. It must never add a new test, gate (a check that must pass before work goes on), review or stop." (E)
- "A fault that blocks work pauses the product until the process is fixed" (E)
- "end the citation rule. The rule on process fixes (section E) now does its work." (I item 7)
- "It is a rule in text only, and in Process3 text alone did not hold." (J item 8, the definition's own admission)

**Evidence.**
- [measured] The cause, not the effect. "The sessions did not add checks against the text they read. They added checks in obedience to it." The same paragraph that held the restraint ordered "builds the correction; a workaround for the moment is not a fix" (causal_forensics, headline and driver 1). 46 of 121 additions (38%) answered a failure of the process's own earlier machinery (change_sample §2). The disposition marks that sentence "CONFLICT FOR THE OWNER" (row 63); Bob's answer of 14 Nov kept the duty to fix and limited the form (assessment_doc lines 82, 96).
- [measured] A rule about the label is met by the label. "Tool 4,543+ lines; every rise cited" (causal_forensics driver 2). 36 of the 121 check-adding merges were "features or fixes whose merged diff also adds refusals, holds or duties" (change_sample §2): three in ten additions arrived inside something already called a fix. 104 of 117 code-bearing additions contain a review-fix commit.
- [measured] Repair is how checks grew. "A false refusal was treated as a bug in the check, to be fixed by a more exact check" (change_sample §5). The base-red rule was repaired in four more merges; the interface classifier in three; the receipt in about twenty. Each was a correction. "No case exists in the record of a session, unprompted, removing a merged check because it was misfiring" (causal_forensics §8).
- [measured] Telling sessions did not change the rate: 41% of merges added a check before Bob's instruction of 5 Nov and 41% after (change_sample, summary). Restraint showed "within hours of each rebuke" (causal_forensics §8, condition 5).
- [measured] The only restraint that held all week was a hard cap held by a test: role prompts stayed at 4,032 to 4,197 bytes while uncapped code grew 16 times (causal_forensics, headline and driver 3).

**Is the line between "correct" and "add" defined? No.** [reasoning on measured cases]
- Replacing a wrong check with a right one is both. The definition's own example (cost figure) is easy because the right answer is "no check". Where the right answer is "a different condition", the new condition is an addition.
- Widening who is notified strengthens test two. Process3 narrowed notices and widened them again 34 minutes later (change_sample §4, PR 79 then 82). Correction or addition?
- An alarm, a retry, a record or a required argument is not a "test, gate, review or stop" by name. Process3's idle-capacity alarm ran falsely for over two hours and cost 1,564 git processes before every command (change_sample §5).
- The definition itself does it. In one day's drafting, under "Claude decided", it adds: an external walk run by fixed rule after every tranche; a release walk "run on a copy installed with the real installer"; a step count with additions and removals in each round's report; and a comparison of uses against the module order (E: "Process3's check compared what a module declared with what it imported, never with the order"), with nothing said about what makes that comparison if not an extension of test one.

**Three Process3 faults where a purely corrective fix is hard to imagine.**
1. *Two merges, each passing alone, leave the tranche branch red.* Process3's answer was a second run on the merged result and a refusal when the branch "moved since the gate ran" (causal_forensics §6, site 2). Bob has ended that run. Nothing is broken to correct; the remaining fixes are a test or a GitHub setting that stops merges. 48 job blocks cite a suite "already red on the tranche before the job started" (product_side §6d).
2. *The internal walk was blind to a whole class of fault* (1,690 page faults seen only when deployed). The fix was to make the internal walk run the page checks (PD-11), which change_sample case 7 calls "what a good addition looks like". Section K lists "extra steps added to the walk" among what the rules forbid.
3. *A finished job went unnoticed for 194 minutes; Bob asked "why did Process3 not catch it".* Nothing existed to correct. The answer built was holds, alarms and "starts owed as state gating BOB's other acts" (causal_forensics §4.2). Also in this class: a job whose tests pass whether or not its change is present (finding 6), where the only known fix is the check Bob ended.

**Three where the corrective fix is obvious.**
1. The compulsory cost figure: write "unmeasured" (PR 106, 45 minutes).
2. A "too many requests" reply read as a missing token: call it "unknown" (PR 235).
3. Every layer-1 job failing the own-files check when it struck its own mark: admit the mark (PR 46). Also the bookkeeping workflow that ran 495 times where "Nothing reads it": remove it (PR 116).

**What the two lists show.** [reasoning] Every easy case is the repair of a refusal that an earlier session had added. Change_sample says the same of the whole week: session-led loosenings "were almost all narrow repairs of a false refusal that had already stopped work". Process4 starts with few refusals, so its faults will mostly be of the other kind: something missing, or a hole. For that kind the rule offers no fix at all, and "a fault that blocks work pauses the product until the process is fixed". A paused product and a forbidden fix is the strongest pressure to relabel that the definition could create.

**How bad.** Without the wall: repeats Process3 (costs Bob the product). With it: stops a tranche on any fault of the missing kind.

**Answer within the rule.**
- Removal: take out the duty, not only the form. A process fault with no corrective fix is recorded as a named blocker or as one line in the tranche report, and "no change" is written as the expected outcome, with its place named. The record shows sessions used a named, cheap place for a decline when one existed ("Known limits", "note: one line, no change", "flag, not refuse"; causal_forensics §8).
- Structural: have less that can refuse or break. The definition never says how large Process4's own tool is at the start, whether it is new or Process3's 23,429 lines cut down, or what it contains beyond the merge tool, the slot rule, the notice and the status read-out.
- Wording: drop the claim in item I 7 that the rule "now does its work". Nothing shows it does any.
- Honest statement, already half made in J 8: the trial there reads ten fixes made while the rule is fresh. Process3's restraint lasted hours after each reminder. The trial can break the claim on day one and says nothing about day five.
- **No answer found** for making the line between "correct" and "add" decidable without someone judging each change, which is a review.

Sources: causal_forensics headline, §4.2, §6, §7 drivers 1 to 3, §8; change_sample summary, §2, §4, §5, cases 1, 2, 7; disposition rows 63, 64, 193, 232; assessment_doc lines 82, 96; DECISIONS PD-11.

### 4. The wall round the process repository: both answers fail

**Counter-argument, with the wall.** The growth does not stop; it moves to places the wall does not cover, most of which leave no record. Every blocking fault waits for a man who is asleep. And his click, which cannot judge the code, turns a session's addition into "Bob approved it".

**Counter-argument, without the wall.** Nothing stops a repeat. The definition says so itself.

**Sentences attacked.**
- "With the wall, every process fix costs you one click, and a process fault that blocks work waits for you." (K)
- "Each fix comes to you with one plain sentence saying what it corrects or removes, and the size of the process before and after. Your click cannot judge the code and is not claimed to. What it does is make silent growth impossible and every change visible to you." (K)
- "Without the wall, you spend no time, and the growth that ended Process3 is held back by text alone." (K)
- "The process is completely blocked. Only then does it wait for you" (E), beside "A fault that blocks work pauses the product until the process is fixed" (E).

**Evidence, with the wall.**
- *Where growth moves.* [measured] Into the product's own tests: 211 test files, 11,410 lines, "written for the process and not the product", 26% of the week's net test growth (product_side §6c). Into the walk (finding 1). Into free text between sessions: "MY STANDING RULES TO BOB"; "told BOB '6 at most'; BOB followed for ~6 h"; 26 handoff notes that re-grew "Rules in force" within a day of being cleared (causal_forensics §3). Into scheduled tasks: the hourly check "accretes an audit" (§3E). Into the product's settings, workflows and module list: `process/config.json` 24 to 421 lines; workflows 446 to 1,021 lines; the module list's status string carries dozens of dated "AMENDED" clauses (product_side §6a; redteam_corruption 6). The earlier reviewers who could not break the wall said the same: "growth goes to whatever is uncapped" (enforcement_levers §3). The definition names four such places and calls them "rules in text".
- *What waits for Bob.* [measured] A question carried as "Bob's, asked, no answer" waited about nine hours across four coordinators on 5 Nov (causal_forensics §3D). Bob is at UTC-8 and the sessions run all night. [reasoning] Process4's own tool is new code on its first tranche; a blocking fault in the first hours is the expected case, not the rare one (redteam_feasibility 1 and redteam_corruption 1 said the same of the earlier proposal). Each one pauses all product work until he wakes and clicks. That is the definition's "completely blocked" case made routine, against his requirement that the process run unattended.
- *What sessions do while they wait.* [measured] "Every layer-1 job on the copy failed the ownership check when it cleared a mark; BOB worked around it" (change_sample §4, PR 46). [reasoning] A blocked session that cannot fix the process will route round it, in the product repository or in its instructions to other sessions. That is a second, unwalled process.
- *How the click degrades.* [measured] 151 of 159 drafted lines accepted; 20 audit lines answered in three minutes, none dropped; the page had an "Accept suggestions for undecided" button (causal_forensics driver 8; redteam_corruption 5). His few words became canon under his name with enforcement he did not word: "Yes, add that rule to the canon" on 6 Nov, and three days later "SLB-12 sounds far too broad" (causal_forensics §4.1). The heaviest single check of the week entered by his own commit: owner patch 13 of 7 Nov, drafted in answer to a session's finding, put a hook before every shell command in every product session, and it was still in the tree at the end (product_side §6a). A question from him "returned a mechanism every time" (causal_forensics §4.2).
- *What the click is evidence of afterwards.* [reasoning] The definition's own rule is "Only words you wrote yourself count as your word." A click on a session's one-sentence description of its own change is the opposite: consent to a summary he cannot check. After it, the addition is his. Process3's audit of 9 Nov could say "19 of 35 safeguards coordinator only" because they were not his. With the wall every one would read as approved.
- *The size line.* [reasoning] "The size of the process before and after" is a number sessions can hold steady while the process changes shape, or move bulk out of (into the product, where the wall does not count it). In Process3 the capped texts stayed flat and the growth went next door.
- *Unproven parts.* The definition lists them: holding the version where only Bob moves it, and running module tests from where a job's pull request cannot alter them. [platform, via enforcement_levers lever 6] a pull request's test run takes its workflow file from the pull request.

**Evidence, without the wall.**
- [measured] 270 of 296 process changes were made and merged by sessions; 121 added a check; the rate did not move when Bob told them to stop; a change merged in the process was running on the product a median 3 to 21 minutes later, "no soak" (change_sample; product_side §4).
- [measured] "Only a fix for a blocking fault, once" (K, technical 3) is judged by the fixing session. Process3's version moved 116 times, each move a "recorded act" (product_side §4).
- [measured] There is no measured case of the permission checker enforcing a "never" that had no deny rule or GitHub rule behind it (enforcement_levers lever 8).

**How bad.** With the wall: stops a tranche repeatedly, costs Bob time at night, and misleads Bob about what he approved. Without: repeats Process3.

**Answer within the rule.**
- Structural (a third answer the definition does not put to him): wall only what can stop a merge, that is the test workflow, the merge path and the reference to them. Leave the texts open. Then his click is needed only when the gate itself is faulty, and nothing a session adds elsewhere can refuse anything (enforcement_levers §5, combination B).
- Wording: under any wall, the definition must say that his click is not his word about the change, and that no session may cite it as approval of the content.
- Removal: drop "the size of the process before and after" from what he is shown, or accept that it is decoration.
- Trial: before he answers, rehearse a short tranche on a copy and count blocking process faults. The definition admits the rate "is unknown" and still recommends the wall.
- **No answer found** for growth that moves to the product's tests, the walk and the text between sessions. Any stop there is a check.

Sources: enforcement_levers §1 to §5; redteam_corruption 1, 3, 5, 6; causal_forensics §3, §4, drivers 3, 8, 9; product_side §4, §6; change_sample §4.

### 5. The interface notice: most job starts will be notice-driven, and a job with nothing to change cannot finish

**Counter-argument.** Nine notices in ten were noise in Process3, and there a cheap helper cleared them for about 20 cents each. Under Process4 each one makes a module "have work" and take one of eight slots with a whole job. On the real module list that is most of the jobs. And such a job, having nothing to change, has nothing to merge, so by the letter the round never closes.

**Sentences attacked.**
- "If not, the notice is work and the module's job becomes ready." (D)
- "So today every declared user is told, on any change in the provider." (D)
- "Done means merged." (C step 7; G)
- "When every module that had work has merged, several sessions walk the product." (C)
- "Where working state is kept ... *Decided:* each job's pull request" (K, technical 1)

**Evidence.**
- [measured] 178 notices, 2,707 notifications (median 11 per notice, largest 108), 2,342 verdicts, 2,101 "not affected" (89.7%). Triage cost $565 over 1,914 verdicts, median $0.20. A job cost a median $2.45 where a figure exists (interface_and_cycle §1e; k_evidence K4(b)).
- [measured] Even with triage removing nine in ten first, 287 of Process3's 688 job starts list notices handed to the job: 42% (interface_and_cycle §1e).
- [measured] What a no-change answer left behind: 187 `notice-*` test files, 9,321 lines, each pinning "provider notice confirmed, no code change"; 69 product-code commits that are notice confirmations with no code change; 105 of 508 merges that changed nothing but records (product_side §2, §3, §6c).
- [measured by me today] The module list at the tranche tip: 220 modules, 3,120 declared uses, median 8 users per module, mean 14.2, largest 213 (`setup-words`). Process3 told only users whose source imports the provider (1,936 of those uses); Process4 tells every declared user, 1.6 times as many edges.
- [reasoning on measured inputs: a simulation] The real uses graph; the 66 modules that carry an unmet mark today (my count; no_layers_width has 65); eight slots; earliest ready module first; a notice folded into a job that is already open; 10% of notified jobs change their module, as in the record. 200 runs of each case.

  | Case | Jobs with real work | Notice-only job starts | Share of all starts |
  | --- | --- | --- | --- |
  | First round; 46% of real jobs change source (Process3's share of merges that did) | 66 | 95 to 117 | 59% to 64% |
  | First round; 80% change source | 66 | 140 to 162 | 68% to 71% |
  | A later round: 20 walk findings on modules spread through the order | 20 | 147 | 88% |
  | A later round: 5 findings | 5 | 63 | 93% |
  | One source change in `setup-words` | 1 | 221 | |
  | One source change in `record-core` or `membership` | 1 | 132 to 136 | |

  Limits: job lengths are assumed (notice-only jobs a third as long); the 10% is the old triage's judgment, not truth; which modules a walk finding lands on is random here and in life would lean late in the order, which lowers the count. Treat the shares as the order of magnitude: about two job starts in three in a first round, and about nine in ten in the fix rounds that follow.
- **Can rounds end?** [reasoning] A storm does not run for ever. Uses point only to earlier modules, and with the earliest ready module always taking the free slot the work sweeps the order roughly once; in the simulation every case ended. Three uses still point the wrong way today, but the chance of a notified job changing its module is too small for that loop to sustain itself. The round fails to end for a different reason, below.
- **A job with nothing to change.** [reasoning] A pull request cannot be opened with no change in it. State lives in the job's pull request. "Done means merged." So a notified job that finds nothing must either commit something to have a thing to merge, which is how Process3 came by 187 test files and 105 record-only merges, or end with no merge, in which case "every module that had work has merged" is never true and the walk never starts. The definition says nothing on it. A session will fill the gap, and the record shows with what.
- [measured] Bob asked on 9 Nov how triage stopped being "pretty instantaneous"; the notice mechanism "took a median of 52 hours to record a notice by 9 Nov, against 0.2 at the start" (change_sample PR 293; assessment_doc line 64).

**How bad.** Stops a tranche by the letter (rounds cannot close). Read loosely: costs most of the slots and most of the money on jobs that change nothing, and regrows record files in the product.

**Answer within the rule.**
- Wording: a notified job that finds nothing to change ends by saying so in one line where the notice was placed, with no file and no merge, and that counts as done. The round closes when no module has work and no job is open.
- Honest statement to Bob: under his rule that every user is told and each one's job checks, most job starts are notice-driven. He decided the rule; he should see its price before the first tranche.
- Trial: the replay of section J items 4 and 5 can count, at no extra cost, how many job starts the 178 recorded changes would have caused under Process4's rule.
- Structural, Bob's to choose: let the helper that ARCH already may start for "bulk reading" read a notice for a module with no open job, as Process3 did for 20 cents. It is not a new test; it is how test two is carried out. But it is the mechanism that grew ten merges of rules in Process3, so it needs a fixed, small form.

Sources: interface_and_cycle §1d, §1e; product_side §2, §3, §6c, §6d; change_sample §4, §5; `build/modules.json` at `origin/tranche`; simulation script named at the top.

### 6. Test one is written by the job it judges, and nothing else looks at nineteen requirements in twenty

**Counter-argument.** A job writes the code, writes the tests, strikes its own "not yet met" mark and merges with no reader. The only other look at the product is a walk of a few hundred steps over a product with nearly nine thousand requirements.

**Sentences attacked.**
- "The job's own module tests ... *Runs:* that module's tests, never another module's" (D test 1)
- "There is no review and no act of yours. Done means merged." (C step 7)
- "A failure already on the tranche branch before the job began is named, and is not the job's to fix." (D test 1)
- "The job looks only at what the named parts mean for its own module, and runs only the tests that relate to them." (D)
- "Three checks that ran alongside a module's tests ...: that a job's new tests fail when its change is undone; a second run of the module tests on the merged result before merging" (H; ended by Bob)

**Evidence.**
- [measured] 8,838 requirement ids in 191 requirement files at the base (product_side §1). The internal walk had 236 to 357 steps. So at most about 4% of requirement ids can have a step of their own; the rest rest on test one alone.
- [measured] Tests that pass either way exist in number: "Ten of the twenty 'false done' findings that week were the revert check tripping on tests that pass either way by nature" (review.txt, quoted in k_evidence K4(b)); 27 tests-only commits were made to satisfy that check; and it also removed real repairs ("drop the repairs of four stale tests ...: they pass with the change reverted", product_side §6c). Bob ended the check; I do not argue it back. The class of fault it looked for remains and none of the three tests looks for it.
- [measured] On the one day with a count, 20 of about 155 "complete" claims were refuted by the tests run on GitHub: about 13% (k_evidence K4(b); the division is that worker's). Test one still does this.
- [measured] 140 of 508 merges changed tests only; tests grew 43,882 lines net against 23,090 of source (product_side §2, §5).
- [measured] 48 job blocks cite a suite already red on the tranche before the job began; Process3's exemption for it needed five merges (product_side §6d; change_sample §4, PR 101).
- [reasoning] *The deadlock.* GitHub's rule lets a pull request merge only "with the tests passing". A failure that was there before the job began "is not the job's to fix". So the module cannot merge and its job may not repair it. Either the test workflow learns to excuse failures present on the base (new process code, the code that needed five merges last time), or a session decides which red is excusable (a judged way round the only gate).
- [reasoning] *Tests that never run again.* A module's tests run when its own pull request changes its files, or, on a notice, "only the tests that relate", which "cannot yet be picked mechanically, so the notified job must judge" (D). With no full regression, the rest of a module's tests do not run until the module next has work. A suite can go red on the tranche branch and travel to the main branch unseen.

**How bad.** Silently corrupts the result; and the deadlock stops single modules, which then block the round.

**Answer within the rule.**
- Wording: say who owns a failure that was already there. If it is in the job's own module's tests, it is that job's work, whoever caused it; "not the job's to fix" can only mean another module's tests, which test one never runs anyway.
- Honest statement: by Bob's decisions, nineteen requirements in twenty are held by tests their own job wrote, with nothing checking that the tests can fail. That is an accepted and unproven risk, and section J should list it. It does not.
- **No answer found** for the vacuous test or for the red suite that travels. Every remedy I can see is a check Bob has ended.

Sources: product_side §1, §2, §5, §6; k_evidence K1(i), K4; change_sample §4; review.txt as quoted.

### 7. Ending the own-files check opens the one path where a change merges with no test at all, and Bob's recorded answer was "Kept"

**Counter-argument.** If a job edits another module's file, test one runs only the job's own module's tests, so the edit merges untested and the other module is never told. Process3's clean record of none in 2,540 commits was made with the check standing in four places, and Process4 gives jobs a new reason to do it.

**Sentences attacked.**
- "The rule that a job writes only its own module's files has no check behind it; it stands in the job's instructions." (D)
- "*Claude decided:* it ends; the rule stays in the job's instructions." (K, earlier point 1)
- "It does not wait for the modules it uses to finish." (C step 2)

**Evidence.**
- [measured] 0 of 2,540 job commits changed another module's source or tests, while the check ran in the test run, at the merge, at publish and at take-in, and the rule was in every start text. "The measured record cannot tell whether jobs kept to their module because of the check or because their instructions said so" (k_evidence K1(i)(b)).
- [measured] 34 job blocks say the fix they needed lay outside their own files and handed it on (same passage). The pull was there; something held it.
- [measured] The session's record of Bob's answers of 13 Nov reads: "Question 2, in part: a job writes only its own module's files. Kept." The question had asked whether "no other tests, ever" ends that rule (assessment_doc lines 83, 89). The ledger line it names is listed as held by "gate and merge | Built". Whether he kept the rule or the check is not settled by that record, and the definition files the ending under "Claude decided".
- [platform, via k_evidence K1(i)(d)] No GitHub setting can restrict which files a push changes on a public repository.
- [reasoning] In Process4 a job runs while the modules it uses still have jobs open, so it meets half-finished code under it more often than a Process3 job did. The one-line fix in the other module is the quick way, and nothing refuses it. Two jobs then write one file, which is the case the rule exists for.

**How bad.** Silently corrupts the result.

**Answer within the rule.**
- Put the question to Bob in his own words: did "Kept" mean the check? It is his, not Claude's.
- Structural, if he says the check goes: let test one choose the suites from the files the pull request changed, not from the job's module. A stray edit then at least runs the tests of the module it touched. This changes "never another module's" and is his to allow.
- Otherwise **no answer found**; state it in section J as accepted and unproven. It is not listed there.

Sources: k_evidence K1(i); assessment_doc lines 83, 89; ledger_map ARC-2; disposition row 28.

### 8. About thirty-five rules in the definition are held by text alone; the one cap that held in Process3 was a test, and the definition does not say whether it survives

**Counter-argument.** Process3 measured this: the rule with a hard stop behind it held for the whole week and every rule held by words drifted. Process4 has more rules held by words than Process3 had, and its three-tests rule may have removed the one hard stop that worked.

**Sentences attacked.** The full list is appendix A. The sharpest:
- "One short rulebook per role, at most ten rules, rewritten in place." (G)
- "The one hard size limit, on each role's starting text, held all week, while the guide with no limit grew from 8 KB to 134 KB." (I item 8)
- "A worker ... decides nothing and never reviews another session's work." (B)
- "A session never records its own decision, or its summary of what you said, as yours." (B)
- "ARCH starts the job session, with instructions naming every act the job may take." (C step 4)

**Evidence.**
- [measured] The cap is `tool/test/roles.test.mjs:98`, a test in the process's own repository (causal_forensics §1.1). It is not one of the three tests. The definition cites its result twice and never says whether the test is kept. If kept, it is a fourth test. If dropped, the only restraint with a measured record goes with it.
- [measured] Reviews of process changes were never required by Process3's tool. They were "Coordinator practices imposed on builders: cold subagent review of every PR" (causal_forensics §2). 285 of 776 commits were review-fix commits; 102 of 104 findings were acted on. Removing the tool's three review rules removes something that was not the cause.
- [measured] Session choices recorded as Bob's: 14 of 21 items marked his across ten handoffs were mechanisms; of 35 safeguards, 7 quoted him (causal_forensics §4.1). The definition repeats the pattern in its second paragraph: his decisions of 13 and 14 Nov "reached this document through a session's written record of them, not through text you typed."
- [measured] Free text typed by one session into another's start was a working rule channel and cannot be compared with anything (enforcement_levers, surface 9).
- [measured] The Foundations line that a rule held only by text "is a nudge and is marked so" is kept (disposition row 75). It teaches every session that text is the weaker kind, and that a fix that must hold belongs in code (causal_forensics driver 3).

**How bad.** Drift over days: costs Bob time, then repeats Process3 in the places the wall does not cover.

**Answer within the rule.**
- Removal: delete the text rules that nothing can hold and that the record shows did not hold, in place of restating them. A rule that is written and not kept teaches that rules are not kept.
- Honest statement: mark each remaining text rule as unheld, in the definition, as his own kept line requires.
- Bob's to say: whether the existing size test on role texts counts against "no others, ever". enforcement_levers raised the same question and it is not in section K.

Sources: causal_forensics §1.1, §1.4, §2, §3, §4, driver 3; enforcement_levers §1, §4; disposition row 75.

### 9. A reported number becomes a target, and the definition's own example proves it

**Counter-argument.** The definition's showpiece of a bad fix began with a report: two jobs recorded a cost of zero, "so a report read wrong", and a session made the figure compulsory and stopped every job. Process4 keeps that report and adds numbers to it.

**Sentences attacked.**
- "A tranche report: time, work done, cost, overhead, and the minutes it took of yours ... These are reported, never enforced." (G)
- "Report cost where it can be read." (I item 4)
- "the size of the process before and after" (K)

**Evidence.**
- [measured] PR 105 then 106, 45 minutes (change_sample case 2). 229 cost rows for 693 claims; 106 say "unmeasured"; 111 of the 123 figures come from two days (k_evidence K4(b)). The report will read wrong again on day one.
- [measured] Every question Bob asked about a number came back as a mechanism: "Is there a way for you to check that all github traffic is going through" became a hook on every tool call and an hourly audit; "why did Process3 not catch it" became holds, alarms and owed starts (causal_forensics §4.2).
- [measured] A number shown without a stop did not restrain either: "The cap is NOT met", reported nightly, never met (causal_forensics driver 10).
- [measured] Keeping the numbers was itself the bulk of the work: 89% of commits were bookkeeping; 105 of 508 merges changed only records (product_side, summary).
- [reasoning] With the job record ended and state kept in pull requests, somebody must still gather time, cost, overhead and Bob's minutes. That is record-keeping without a named home, which a session will build.

**How bad.** Costs Bob time; a slow route back to compulsory records.

**Answer within the rule.**
- Removal: report only what git and GitHub already hold when the tranche ends (merges, dates, rounds, the walk's lists). Drop cost and overhead until a route to read them is measured; say "not reported" once, not "unmeasured" per job.
- Structural: the report is made once, at the tranche's end, for Bob. It is not a file sessions read while working.
- Wording for the coordinator: a question from Bob about a number is answered with the number.

Sources: change_sample case 2; k_evidence K4; causal_forensics §4.2, driver 10; product_side summary.

### 10. The stop that ended Process3 is kept

**Counter-argument.** Each of Bob's five edits to his approvals stopped every long-lived session, and after the last one the product never restarted. The definition keeps that stop and puts its cure in the list of things not yet proven.

**Sentences attacked.**
- "A session compares the approvals it loaded with the newest, and on a difference does nothing ... *Claude decided:* keep it" (I item 11)
- "At the start of Process4, then only when the wording must change" (B, table)

**Evidence.**
- [measured] 16 owner patches to the product's CLAUDE.md in nine days, each widening or clarifying a permission after a session met a wall (product_side §6a). "one owner edit to one approvals line stops the train and forces every role and task to be replaced" (causal_forensics driver 9). The last product merge was 16:35Z on 9 Nov; his patch merged at 16:45Z; nothing carrying product work moved again (product_side §8).
- [reasoning] Process4 changes how merges are made (no review verdict) and what sessions do. Section J items 1 and 3 expect permission walls to be probed. Walls met mean edits by Bob; edits mean every long-lived session stops. ARCH, ROOT and the coordinator are all long-lived.

**How bad.** Stops a tranche, repeatedly, each time Bob does the one thing only he can do.

**Answer within the rule.**
- Trial first, as J 10 says, and nothing in force until it passes.
- Structural: no session lives across one of his edits by design. If ARCH is replaced at each round's end from the status read-out, an edit is taken up at the next round with nothing compared and nothing stopped. Then the comparison can be removed, which is a removal.

Sources: product_side §6a, §8; causal_forensics driver 9; permissions_inventory as cited by enforcement_levers lever 8.

### 11. Four decisions Claude made today have a strong case against them, and two were not Claude's to make

Each is "the strongest case that it is wrong", as asked. The full list of all the decisions in sections I and K is appendix C.

**(a) Retiring the two judging numbers.**
- *Attacked:* "*Claude decided:* the two numbers ... are retired. Neither was ever produced in Process3, neither runs the product" (K, earlier point 5).
- *Case.* They are Bob's kept line: "Two health metrics from day one" and "the standing judge of every other line" (k_evidence K4(a)). The definition's test for what Claude may decide is "ways of doing something, not purposes". What judges the process is a purpose. The disposition's own note says "the owner should see any change to his judge". And the stated ground is weaker than it reads: the one day with a count gives about 13% false "done", worse than the one in eleven his line cites, so the number would not have "read healthy"; that phrase was "the disposition author's inference" (k_evidence K4(b)). The replacement, walk steps passing, is a number the sessions write (finding 1).
- *How bad:* misleads Bob. *Answer:* wording. Put it back in section K as his question.

**(b) Running the external walk by fixed rule.**
- *Attacked:* "Claude decided how the option works: a fixed rule runs it after every tranche" (C).
- *Case one.* A walk with a trigger, a run and findings that become work is a test by the definition's own form in section D. Run by default after every tranche it is a fourth test in all but name, against "exactly three tests, and no others, ever". Bob made it optional; Claude made it standing.
- *Case two, the opposite.* It is too weak where it sits: it runs after the main branch has moved (finding 2), reversing his 8 Nov order.
- *Case three.* His own words of 8 Nov: "an expensive means of identifying many of the same the flaws the internal walk found", and a caution about Cloudflare limits. It also needs an act of his that is not on his list: connecting an AI account before the AI journeys can be walked (k_evidence K5(d)).
- *How bad:* misleads Bob on whether his three-tests decision is honoured. *Answer:* wording. Ask him whose option it is, and when the tranche ends relative to it.

**(c) Keeping the two-part test run.**
- *Attacked:* "It was added on a reviewer's 'what if', and the failure it guards against was never seen. It costs little. *Claude decided:* keep it." (I item 13)
- *Case.* This is the Process3 reasoning in one line: no measured failure, kept because cheap. Change_sample's caution on exactly this class: such rules are "cheap and inert rather than proven", and drew the longest review loops. Bob's kept rule says a check exists only against a measured failure or his word. A definition that keeps a "what if" check on the ground that it is cheap hands every later session its precedent.
- *How bad:* minor in itself; corrosive as an example. *Answer:* removal, or say plainly it is kept against his rule and why.

**(d) Ending the citation rule.**
- *Attacked:* "*Claude decided:* end the citation rule." (I item 7)
- *Case.* The rule failed as a brake. It worked as a trail. The 9 Nov count, "Bob's quoted words: 7 ... Coordinator only: 19", and the finding that 14 of 21 items marked his were mechanisms, could be made only because additions named their authority. Without it, nothing separates his word from a session's after the fact, and "only words you wrote yourself count" has no record to rest on.
- *How bad:* misleads Bob, later. *Answer:* wording. End it as a licence to add; keep the plain habit that any quoted word of his carries its date and source, which the coordinator rule already asks.

**(e) Ending the own-files check.** Finding 7.

**(f) Ending the earlier requirements of section I as a group.**
- *Case.* Thirteen items in section I, six of the earlier open points and fourteen technical points in section K are reported as decided, with "You can overrule any of them." Process3's approval page worked the same way and kept 119 of 126 lines, then 20 of 20 in three minutes (causal_forensics driver 8). A default he must act to reverse is the instrument the forensic record blames. Three purposes are kept with nothing holding them: "a module fits in one reading", "a lean repository", "act only on what you have read in full". Those are now text rules of the kind in finding 8, or they are dead and should be said to be.
- *How bad:* misleads Bob. *Answer:* wording. Fewer items, each with what is lost stated beside what is saved.

Sources: k_evidence K4, K5; causal_forensics §4.1, driver 8; change_sample §5 (caution on trust rules); disposition rows 73, 193.

### 12. Smaller holes

**(a) A change across many modules may skip the tests on a session's judgment.**
- *Attacked:* "Some such changes are so trivial that module tests need not be rerun." (C) and "*Decided:* ARCH, which reports it." (K, technical 7)
- *Case.* GitHub lets nothing into the tranche branch without the tests passing. So either the check reports green without running, which is a way round the only gate, opened by a session's judgment, or the change cannot merge. Process3 built a "light gate" for record-only changes and narrowed it two hours later (change_sample §4, PR 287 then 288). [measured for the precedent; reasoning for the rest]. The preserving of the pass is Bob's; the judge is Claude's choice.
- *How bad:* silently corrupts, rarely. *Answer:* wording. Say exactly how such a change merges, or run the tests of every module touched and drop the exception.

**(b) ARCH is one long session.**
- *Attacked:* "ARCH is the architecture session, one per product." (B) beside "Sessions. Kept short." (G)
- *Case.* Process3's coordinator was replaced about 25 times in six days and each note re-grew its rules within a day (causal_forensics §3). A long session's own summary of itself is the same chain in one body (redteam_corruption 4, checked against this draft: still applies). ARCH also types every job's start text and passes every notice.
- *How bad:* drift. *Answer:* structural, as in finding 10: replace ARCH each round from the status read-out.

**(c) Bob's own words still arrive as orders.**
- *Attacked:* "It passes your words on exactly as written, with the date, and they are followed." (B)
- *Case.* "BE CAREFUL" became one job at a time and a minute between writes; four questions in 26 hours each became a subsystem (causal_forensics §4.2). Passing his words on exactly does not change what the receiving session does with a question.
- *How bad:* costs Bob time; a route for additions with his name on them. *Answer:* wording, for Bob as much as for sessions: a question is answered; only a sentence he marks as a decision changes anything.

**(d) The first contents are written before any rule or wall exists.** Process4's tool, texts and walk are written by sessions before the first tranche (enforcement_levers §4, item 10). The definition gives no size for them. [reasoning]. *Answer:* state the starting size in the definition, so that there is a round 1 to compare with in J 9.

---

## Appendix A. Every place the definition relies on a rule in text, and what Process3's record shows

"Held" names anything physical behind the rule. "Text only" means nothing is.

| # | Rule, in the definition's words | Section | Held by | What the record shows |
| --- | --- | --- | --- | --- |
| 1 | "A session never records its own decision, or its summary of what you said, as yours." | B | Text only | 14 of 21 items marked Bob's were mechanisms; 7 of 35 safeguards quoted him (causal_forensics §4.1) |
| 2 | "ROOT decides nothing and builds nothing." | B | Text only | No direct evidence against |
| 3 | The coordinator "passes your words on exactly as written", "decides nothing about the product and never brings you a technical question" | B | Text only | "about 6 job sessions" became his agreement; a technical question waited nine hours as "Bob's" (§3C, §3D) |
| 4 | ARCH "does not choose which job starts next"; "has no discretion over it" | B, C | Text, unless the rule is code | Sessions set the session count themselves several times (definition H); "told BOB '6 at most'" |
| 5 | ARCH "never edits your approvals or publishes a release without you" | B | Held: checker, protected area | Held in Process3 with a deny or GitHub rule behind it |
| 6 | A job "writes only its own module's files" | B, D | Text only (check ended) | 0 of 2,540, with the check standing (finding 7) |
| 7 | A job "never merges, starts a session or deploys" | B | Merge: held by deny list. Rest: text | Merge held |
| 8 | A worker "decides nothing and never reviews another session's work" | B | Text only | Cold review of every process change by practice, not by tool; 102 of 104 findings acted on (§2) |
| 9 | "Sessions are at most three levels deep, and none starts its own replacement." | B | Text only | Coordinator refreshes needed tool support of their own (§3B) |
| 10 | "Only your own word ... puts a module ahead." | C | Text only | As row 4 |
| 11 | "instructions naming every act the job may take" | C | Text only; free text typed by ARCH | "MY STANDING RULES TO BOB"; start texts carried lessons (enforcement_levers, surface 9) |
| 12 | "A flaw it finds in another module goes to ARCH" | C | Text only | 34 blocks did hand such fixes on, with the check standing |
| 13 | "There is no review" | C | Text only | As row 8 |
| 14 | A cross-module change "needing no judgment"; tests skipped when "so trivial" | C | Text only; a session judges | Light gate added then narrowed in two hours (PR 287, 288) |
| 15 | External walk: "no session chooses" | C | Text, unless the rule is code | In Process3 a rule or Bob decided; no deployment for 80 hours on a paraphrase of his word (k_evidence K5) |
| 16 | "exactly three tests, and no others, ever" | D | Text only | 211 process test files grew inside the product's own tests (product_side §6c) |
| 17 | "A test runs only when there is a fully informed reason to run it." | D | Text only | 63% of gate runs were not started by a code change (product_side §4) |
| 18 | A failure already there "is not the job's to fix" | D | Text only | 48 blocks; five merges of exemption code (finding 6) |
| 19 | A notified job "runs only the tests that relate" | D | Text only; the definition says it "must judge" | Notices narrowed then widened in 34 minutes (PR 79, 82) |
| 20 | "After two failed corrections ARCH replaces the session" | E | Text only | The round limit of 2 Nov was overridden all 17 times it applied (change_sample §5) |
| 21 | A blocked job "records that it is blocked, pushes everything and stops" | E | Text only | 165 block commits, median 1,389 characters (product_side §6d) |
| 22 | A fix "may only correct or remove" | E | Text only (the definition says so) | Finding 3 |
| 23 | "A fault that blocks nothing waits for the next tranche." | E | Text only; the fixer judges | 116 version moves; median 3 to 21 minutes from process merge to product (product_side §4) |
| 24 | "Only then does it wait for you" | E | Text only | Nine-hour wait on a question that was not his (§3D) |
| 25 | "One judged act per command"; "A refused act is never reworded or handed to another session" | F | Text only | After one refusal the checker treated the next push as a bypass (enforcement_levers lever 8) |
| 26 | "Three refusals in a row stop a session." | F | Held: platform | Measured |
| 27 | How a session must be started (one repository, newest tranche commit, every act named) | F | Text only | "a ROOT you started twice came up on an old copy of the branch" (definition J 2) |
| 28 | "One writer per file." | G | Text only | As row 6 |
| 29 | "acts only on what it has read in full or measured, and starts from a status read-out, not from notes" | G | Text only; the audit for it is ended | 26 handoff notes; a 540 KB findings log "read from ... down" (§1.1) |
| 30 | "One short rulebook per role, at most ten rules, rewritten in place." | G | Was a byte test in Process3; unstated here | The one restraint that held (finding 8) |
| 31 | "Sessions. Kept short." | G | Text only | A coordinator's own "60% rule" became a start step (§3B) |
| 32 | "One fixed version per tranche, changed only by a recorded act." | G | Text only without the wall | 116 recorded acts |
| 33 | "reported, never enforced" | G | Text only | Finding 9 |
| 34 | Purposes kept with the mechanism ended: "a module fits in one reading", "a lean repository" | I | Text only | The size cap was overridden 32 of 32; first run of the file check gave 947 findings |
| 35 | The four things section K says the wall does not stop | K | Text only (the definition says so) | Finding 4 |
| 36 | "Each fix comes to you with one plain sentence saying what it corrects or removes" | K | Text; the fixer describes its own fix | Every Process3 addition carried the label asked for (finding 3) |

Of 36, three have something physical behind them (5, 7 in part, 26). One had it in Process3 and is unstated now (30).

## Appendix B. The ten causes in the forensic record: removed, or only forbidden?

| Cause (causal_forensics §7) | Removed by the definition? |
| --- | --- |
| 1. The texts ordered a build for every failure and outlawed the cheap alternative | **No.** "The process itself has a fault. Claude fixes it." The form of the fix is limited; the duty stands, and a blocking fault pauses the product until it is discharged |
| 2. The restraint was mechanised as a citation test with no cost term | **Yes** (I item 7). Replaced by another test of the label ("corrects or removes"), again with no cost term |
| 3. Text had a budget and code had none; a fix that must "hold" had one place to go | **No.** No budget on the process's code is stated; the one budget that held is unstated (finding 8); the kept "nudge" line still ranks text below code |
| 4. A fix-it reflex that closes a problem with a guard and fails closed | **No**, and not claimed (K: "A session being over-cautious in its own work") |
| 5. Review as a generator of obligations | **In part.** The tool's three review rules go. The reviews of process changes were practice, not tool (row 8) |
| 6. The roles that wrote the process carried no restraint text; handoff notes were their rulebook | **Not stated.** A "short session started for that one fix"; what it loads is not said. ARCH's successor starts from the status read-out, which removes the notes in text |
| 7. The scoreboard (process merges) and the cost (on the product) sat apart | **No.** The fix session's "done" is its fix merged |
| 8. Session choices recorded as Bob's, and his few words turned into canon | **No.** A rule in text; the wall's click would add to it (finding 4); the definition's own source for his decisions is a session's record |
| 9. Bob's inputs pushed both ways and each question returned a mechanism | **No.** His words are passed on "and they are followed" |
| 10. No session saw the total; audits were themselves additive | **In part.** The tranche report and, under the wall, a size line. J 9's comparison runs in the first tranche only |

## Appendix C. The decisions Claude made today in sections I and K: the strongest case against each

| Decision | Strongest case that it is wrong | Weight |
| --- | --- | --- |
| I 1. End the job's receipt | None of weight; Bob said "get rid of it completely" and it caught nothing in 1,187 runs | None |
| I 2. End the set-up check before every job | A missing setting now shows as a job failing later for an unclear reason. Minor; the false stops were measured | Minor |
| I 3. End the size cap on requirement files | The purpose "fits in one reading" now has no holder. But 32 of 32 overrides and a loop put into the order | Minor |
| I 4. End compulsory recording of cost | "Cheaply" is half of Bob's purpose and now may never be reported: 106 of 229 rows said "unmeasured" when it was a duty | Real; say so |
| I 5. End the oversized-file check | 86,347 lines of generated data had been in the tree before (product_side §5). Nothing now keeps them out | Minor |
| I 6. End the job record as a data file | With state in pull requests, a second account suspension hides the record with the account (redteam_corruption 10; the suspension of 6 Nov is measured, the hiding is not) | Real; unproven |
| I 7. End the citation rule | Finding 11(d) | Real |
| I 8, 9. End the advice on instruction texts; allow refusal for size on the process's own texts | Something must do the refusing. That is a test outside the three (finding 8) | Real; Bob's to rule |
| I 10. End the reading audit | Never built. None | None |
| I 11. Keep the approvals check at start-up | Finding 10 | Serious |
| I 12. Keep tokens in the cloud environment's settings | None found | None |
| I 13. Keep the two-part test run | Finding 11(c) | As precedent |
| K 1. End the own-files check | Finding 7 | Serious |
| K 2. End install and upgrade tests as release tests | Releases 0.59.0 to 0.63.0 each broke existing stores. The release walk "on a copy installed with the real installer" is unbuilt, and first runs while Bob waits to approve | Real |
| K 5. Retire the two judging numbers | Finding 11(a) | Bob's, not Claude's |
| K 6. External walk by fixed rule | Finding 11(b) | Bob's, not Claude's |
| K 7. Eight slots for each product | None on my angle | None |
| Technical 1. State in each job's pull request | A notified job with no change has no pull request to hold its state (finding 5) | Real |
| Technical 3. "only a fix for a blocking fault, once" | "Once" is not defined (per tranche, per fault?). If per tranche, the second blocking fault has no route; if per fault, it is Process3's 116 | Real; wording |
| Technical 7. ARCH judges a change trivial enough to skip tests | Finding 12(a) | Real |
| Technical 11. No completion-round list; rounds repeat | Finding 1: no bound | Serious |

## Appendix D. Earlier attacks checked against this draft

| Earlier finding (on the withdrawn proposal) | Still applies to the second draft? |
| --- | --- |
| redteam_corruption 1: the first gate defect stops all work and only the owner can clear it | Yes, under the wall (finding 4) |
| redteam_corruption 3: the process moves to the Claude side | Yes; the definition admits two of the channels in K and offers nothing |
| redteam_corruption 4: a long-lived coordinating session is the handoff chain in one body | Yes (finding 12b) |
| redteam_corruption 5: the owner's merge button is the route for growth | Yes, under the wall (finding 4) |
| redteam_corruption 6: checks move into the product's tests and the walk | Yes; now worse, because the walk alone ends a tranche (finding 1) |
| redteam_corruption 7: byte and line caps that do not cap | Changed: this draft has no caps at all (finding 8) |
| redteam_corruption 11: the draft commits the sins it diagnoses | Yes (finding 3, "The definition itself does it"; finding 11f) |
| redteam_feasibility 4: the required check must report on every pull request | Yes, as findings 5 and 12(a): the no-change job and the skipped-tests change |

## What I did not establish

- The diffs of the nine walker commits whose subjects excuse or retire a step. I read subjects only.
- Whether "no failures" was ever defined by Bob more exactly than the sentence quoted.
- The length of an internal walk. Only the deploy-and-walk runs are timed (60 and 64 minutes).
- A false-failure rate for the walk itself. The 7% figure is for module test runs on 3 to 5 Nov and includes red results caused by record checks, not only by chance.
- The simulation's job lengths and the placing of walk findings are assumptions; the graph, the modules with work and the 10% are from the record.
- I did not re-read vendor documentation. Platform statements are quoted through enforcement_levers and k_evidence.
