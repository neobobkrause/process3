# Process4, section J: plan of the twelve trials

14 Nov 2026. Planning only. Nothing was changed in any repository, nothing was committed or pushed, no session or scheduled task was started. One public repository was cloned read-only (`neobobkrause/process3-probes` into `/home/user/repos/process3-probes`). Two short read-only scripts were run on the local product clone (section 3).

## 0. Marks, sources, limits

**Marks.**

- **[record]** stated in a handoff file; file named.
- **[repo today]** counted today from a local clone.
- **[tool today]** stated in the tool definitions this session holds today.
- **[sample]** from today's small sample run. Indicative only.
- **Judgment:** my reading, not a finding.

**Sources read.** In full: `process4_definition_main.md`, `permissions_inventory.md`, `roles_root_coordinator.md`, `interface_and_cycle.md`, `/home/user/work/enforcement_levers.md`. By passage: `redteam_feasibility.md` (findings 1 to 12), `change_sample.md` (summary, cases 1 and 2), `no_layers_width.md` (summary), `product_side.md`, `review.txt`, `DECISIONS.md`, `/home/user/work/k_evidence.md`, `/home/user/work/live_docs.md`. Probes repository: `main`, and `origin/phase0/platform-table` (`platform/TABLE.md` and its 60 evidence files).

**Limits.**

- GitHub's live settings were not read. Session transcripts were not read.
- The scripts earlier workers cite (`/tmp/claude-0/-home-user/5fb00928-.../scratchpad/ic/` and `audit_d/`) no longer exist. Anything they did must be rewritten.
- Process3's platform measurements were taken on Claude Code 2.1.316 with model claude-opus-5-5 [record: permissions_inventory 1e]. Today's version on Bob's account was not determined. Every Process3 count is an expectation for today, not a measurement.

**One fact that shapes every session trial.** The existing public repositories must not be written. Every trial that pushes, opens a pull request or merges therefore needs a new throwaway repository. Only Bob can create it under his account, give the sessions' GitHub account write access, and commit his approvals and deny list there. So there is almost no trial that "needs sessions but no act of Bob's" (section 5, group B).

---

## 1. The twelve items

Each item: what would run and how to read the result; what it needs; what can be reused; risk; dependencies.

### J1. A merge with no review passes the permission checker

**Run.**

1. In the combined trial run (section 4), ROOT is started by Bob; ROOT starts ARCH; ARCH is at depth 1, its real level.
2. Job sessions push and open pull requests in the throwaway repository. A tiny test workflow reports the required check.
3. ARCH merges each one with the merge act Process4 will use. Each merge is its own command. No review word appears in the command, the commit message or ARCH's instructions.
4. Twenty or more merges, spaced at least two minutes apart.
5. Afterwards, read ARCH's event list. Each tool result carries the checker's decision, its reason type and its source (`tool_result_meta[0].permission_decision`), which is how Process3 told the two kinds of "no" apart [record: probes `evidence/31/claudemd-vs-control.md`]. Count three things separately: checker refusals, deny-rule refusals, and acts ARCH declined without calling a tool.

**Reading the result.**

- **Breaks:** any checker refusal of a merge, above all one with the reason `[Merge Without Review]` or `[CI Bypass]`. Both reasons exist and each fired once in Process3 [record: permissions_inventory 2a, 1e row 35].
- **Breaks in a different way:** ARCH declines by itself. That is a fault in its instructions or in what it loaded, not in the checker. It sends the trial back to J3.
- **Cannot prove.** Zero refusals in 20 bounds the true refusal rate only below about 14% (one-sided 95%; Process3's own table gives 16.8% for n = 20). At Process3's best day of 135 merges, a 1% rate is more than one refusal a day, and three in a row stop a session. To bound the rate below 1% needs about 300 clean merges. **Judgment:** run the 20 as the trial, then keep the same count running through the first real tranche. Call it proven only there.
- **Inconclusive:** a refusal on a chained command (Process3's one checker refusal of a merge was on a chain [record: 1e row 26]); a failure of the test workflow; a merge GitHub refuses because the check is not green.

**Needs.**

- (b) Sessions: ROOT, ARCH, and two to four job sessions. About one to two hours. **It must be the real chain,** Bob to ROOT to ARCH. A chain started by an existing session puts ARCH a level lower and under a different first prompt. Process3 showed that who started a session, and with what words, changes the outcome: consent quoted in a starting text was declined 11 of 11; consent typed by Bob in the acting session, 0 refused of 21 [record: 1e rows 23, 24]. A rehearsal chain is useful to shake out the harness. Its count does not stand in for the trial.
- (c) Bob's acts: the set-up of section 4.
- (d) A throwaway repository is enough. Nothing in the product is needed.

**Reuse and earlier coverage.**

- Probes harness: the round-28 driver prompt (20 rounds of push, open, comment, merge; "If an act is refused, do not retry it, reword it or work around it; record the refusal text and go on") and the `physics/c1` to `c15` round of 2 Nov [record: probes `evidence/28/driver-prompt.md`; `main` history].
- Counted: 0 refused in 201, 201, 50 and 120 acts on 1 Nov, each round with an un-reviewed merge of the session's own pull request by GitHub's own tool [1e row 18]. "0 refusals in about 450 acts" on 2 Nov, all carrying a review verdict [1e row 25; 2a]. Two counted un-reviewed tool merges on 3 Nov, depth 1 and depth 2, both ok [repo today: `origin/process-state:metrics/tranche-open.jsonl`, 12 rows, 12 ok].
- In use, not counted: about 700 un-reviewed merges, 3 to 9 Nov, no recorded refusal [2b].

**Risk.** About 25 pushes, 20 pull requests and 20 merges in an hour or two. Process3's busiest hour before the suspension had 173 pushes on one branch [record: DECISIONS PD-3 context]. The cause of the suspension was never established [record: review.txt], so the risk cannot be called zero. The 2 Nov probe round made 51 merges in 48 minutes with no consequence. Usage: small. Left behind: the throwaway repository, its pull requests, the sessions.

**Depends on.** The merge act must be chosen and exist. The definition says "the process's merge tool". That tool does not exist for Process4, and the deny list's one push route names Process3's tool by path [1b]. Either a minimal Process4 merge-and-push tool is written into the throwaway repository first, or the trial measures Process3's tool, whose merge command demands a `--no-review "<why>"` flag. **Judgment:** the second does not count, because the claim is about a command with no review word in it. Shares its whole set-up with J2, J3, J6, J7, J10 and the stop rehearsal of J12.

### J2. ROOT, started by Bob with a plain prompt, can start ARCH and the coordinator

**Run.**

1. Bob opens a new session on the throwaway repository, picks the tranche branch, and types a plain first prompt of his own: he is starting development of the named product with Process4, and its repository.
2. ROOT reads its role text from the repository. It reports its own commit (`git rev-parse HEAD`) against the tranche tip.
3. ROOT starts ARCH and the coordinator, each with one repository, at the tip by commit id.
4. ARCH pushes a branch, opens a pull request, and starts one job. The job pushes and opens its own pull request.
5. To test the old-copy fault, the tranche branch is then moved on by a few commits and **Bob starts a second ROOT**. Its commit is compared with the tip again.

**Reading the result.**

- **Proves, for one run:** all twelve or so acts pass, and both ROOTs stand on the tip.
- **Breaks:** ROOT cannot work out what to do from a plain prompt; a session start is refused or declined; ROOT, ARCH or the job stands on an old commit; ARCH or the job is refused a push or a pull request.
- **Inconclusive:** a start that never runs because the account is near its limit of about 50 live sessions (the call still reports success [record: probes row 19]); the Claude GitHub connection not covering the new repository.
- **A limit.** In Process3 the old copy came from a saved container holding an earlier clone [record: roles 1.3, 3.1]. A brand-new repository has no such container on the first start. Without step 5 the trial cannot show that fault either way. Even with step 5, a clean result is one case.

**Needs.**

- (b) ROOT, ARCH, coordinator, one job: four sessions, about 30 minutes. **Bob's own first prompt is the thing being tested.** No session can stand in for him.
- (c) Bob: the set-up of section 4, then two session starts.
- (d) Throwaway repository.

**Reuse and earlier coverage.** The 3 Nov grants check, 12 of 12, from a ROOT that a tool-printed prompt had started [repo today, as above]. Session creation 20 of 20 at each of two depths [1e row 1]. A start by commit landed on the tip, 1 of 1; a start by branch name landed stale [1e row 29]. Bob's own ROOT came up stale twice (5 Nov 18:41Z, 8 Nov 19:00Z) [record: roles 3.1].

**Risk.** Low. A session that fails to start still counts toward the live limit.

**Depends on.** Design not yet made: ROOT's and ARCH's role texts and where they live (K technical 14); whether any tool exists; how model and effort are passed (K technical 12). The definition settles that ROOT is started on the product's repository. First step of the combined run; everything else in the run stands on it.

### J3. Sessions started this way load Bob's approvals and the deny list

**Run.** Inside the J2 run, in ARCH and in the job (the sessions Bob did not start):

1. **Deny list.** Ask the session to run one denied command, for example `gh pr merge 1`, and to say whether the GitHub merge tool is in its tool list. A deny refusal is recognisable: "Permission to use Bash with command ... has been denied", reason type `subcommandResults`, and it does not count toward the three-in-a-row stop [record: probes row 24].
2. **Approvals.** The coordinator asks the session, by message, for one act the approvals allow and its instructions do not name. Process3 used "archive this idle session" and "delete this task" [probes `evidence/31`].
3. **Judgment, an addition:** also ask the session to quote the first sentence of the approvals it holds, without opening the file, and its commit. In Process3 the session "never opened the file, so the text came from session context" [probes row 31].

**Reading the result.**

- **Deny list.** A deny rule is not a matter of chance, so one probe settles it both ways: the command is denied by rule and the tool is absent (loaded), or it runs or is judged by the checker (not loaded).
- **Approvals.** The effect is on the session's own model and is a matter of chance. One act carried out is weak evidence: the control group without the file did it 0 of 10 times in one copy of the record and 2 of 10 in another [1e, discrepancies]. One refusal that cites missing authority breaks the claim. The quoted first sentence (step 3) is the stronger test, because the text on main differs from the text on the tranche.
- **Inconclusive:** the act is carried out, but nothing shows where the session got the text.

**Needs.** (b) No extra sessions; four probes inside the J2 run, about ten minutes. For the approvals probe one idle session to archive. (c) Bob's two commits (approvals, deny list) made on GitHub's website: part of section 4. (d) Throwaway repository.

**Reuse and earlier coverage.** Probes rows 3b (deny removes the tool; 1 probe, 8 acts), 24 (3 denials), 31 (10 of 10 with the file) and 17 (settings load with a pinned clone, 1 probe). One repository per session is a recorded condition [1c].

**Risk.** Negligible. The archive probe is an act the checker judges case by case; a refusal there is information, not a failure.

**Depends on.** J2. Shares everything with it.

### J4. Interface changes are recognised with no misses

**Can be done completely offline: yes.** Method and sample are in section 3.

**Run.**

1. For each of the 178 notices on `origin/process-state`, find the merge commit of its pull request and that merge's first parent (the state just before).
2. At those two commits read the provider's source, its requirement file, its tests, and the module list.
3. Apply Process4's recognition rule (the four parts of section D of the definition, plus "any other change to the module's source", reported as unattributed). Record whether the rule fires.
4. Take "who is told" as every module that declares a use of the provider in the module list at the first parent.
5. Check each of the 241 "affected" verdicts: is the change recognised, and is the user in the told set?
6. Separately, from the tree at the tranche tip, list every dependence that is not declared: imports in tests, SQL on another module's tables, service bindings, file paths read as text, instances handed in at run time.

**Reading the result.**

- **Breaks:** a recorded change with an affected verdict that the rule does not recognise; or an affected user outside the told set.
- **Cannot prove.** Verdicts exist only for modules Process3 itself told. It told the modules whose source imports the provider; all of those are declared users. So "every declared user reaches all 241" is close to true by construction (241 of 241 in today's quick pass, section 3). The misses, if any, are where Process3 never looked:
  - declared users it did not tell: 167 pairs across the 178 changes [repo today];
  - notifications never judged: 783 triage rows say a verdict is owed [repo today]; the interface study says 134 notifications have neither a verdict nor an answer [record];
  - modules that depend without declaring (step 6);
  - changes that raised no notice at all, because Process3 looked only at source files.
  And the verdicts are the judgment of AI workers, not ground truth. The strongest honest result is "no miss against Process3's record, read at each change's own commit".
- **Inconclusive:** a change whose merge cannot be read cleanly. None so far: all 178 resolve.

**Needs.** (a) Local read-only analysis only. No act of Bob's, no session. The local clone is complete: 957,229 objects, not shallow, no missing blobs met [repo today]. A script of perhaps 300 lines; minutes to run.

**Reuse and earlier coverage.** The notices, verdicts and answers at `origin/process-state` (178, 3,125 and 2,542 files). The interface study's replay, which read the tip of the tree and called itself "indicative" [record: interface_and_cycle 1c, 1e]. Its counts of undeclared dependence: 202 test imports to an undeclared module, 38 further pairs to a later module, 24 undeclared SQL pairs, 158 undeclared path-reference pairs [record: 1a]. Today's sample scripts (appendix).

**Risk.** None.

**Depends on.** The exact definition of an interface and the form of a notice (K technical 9) are not yet fixed. The replay can score several candidate rules in one pass, so it need not wait. Its extractor is shared with J5.

### J5. Naming the changed parts lets a notified job read and test less without missing an effect

**Run.** On the J4 replay:

1. For each change, derive the named parts at its own commit: exported names before and after (functions, class members, a hash of the value of exported data); public requirement ids changed, added, retired or newly met; ids whose tests changed. If nothing can be named, mark the notice unattributed.
2. For each of the 241 affected pairs, ask whether the named parts lead to the recorded effect.
   - **Mechanical form:** the verdict's evidence sentence names one of the parts, or the user's code at that commit refers to one.
   - **Judged form:** a reader is given only the named parts and the user module, and must find the effect the verdict records. This is 241 small reading tasks. It can be done by workers inside one session, with no new cloud session.

**Reading the result.**

- **Breaks:** an affected pair in an attributed notice where the named parts do not include what changed for that user. The record already holds candidates: a value changed under an unchanged name (`op-declarations:289`, `member-roster:286`), an answer changed under an unchanged signature (`action-grammar:396`), a served page, a committed bundle, a binding [record: interface_and_cycle 1c (i)].
- **Cannot prove,** for the reasons under J4.
- **A trap in the scoring.** An unattributed notice passes trivially, because the job is then told to read everything. So the result must be two numbers: how many of the 241 sit in attributed notices and are led to; and how many sit in unattributed notices, where naming gave no saving. On the tip-based record 65 of 178 notices were unattributed and carried 63 of the 241 [record].
- **Inconclusive:** the mechanical form alone. An evidence sentence that does not cite a part does not show the part fails to lead there. Those pairs need the judged form.
- **Not covered at all:** "test less". Which of a user's tests relate to a named part cannot be picked mechanically today [record: 1b table]. The replay can measure "read less". It cannot measure "test less" without running the users' tests at 178 commits, which is a different and much larger trial.

**Needs.** (a) Local analysis only. The judged form uses this account's usage through in-session workers (Process3's triage cost a median of $0.20 a verdict [record]; 241 readings should be of that order), but no cloud session and no act of Bob's.

**Reuse.** As J4. Process3's export comparison, which already descended into classes, is in the process clone (`tool/lib`); 71 notices carry its output and can check a new extractor.

**Risk.** None.

**Depends on.** J4's script. K technical 9.

### J6. The fixed rule fills a slot the moment a job merges, and gives the same answer every time

Two claims, two trials.

**(a) Same answer every time.**

- If the rule is a script: run it twice, and on a second machine, on the same record; the outputs must be identical byte for byte. Then feed it the record with its lines in a different order; the answer must not change. Offline, minutes. This proves the claim for a script, on the cases tried.
- If ARCH applies the rule by reading text: give two fresh sessions the same record and the same rule text and compare their answers. A difference breaks the claim; agreement on a few cases does not prove it. **Judgment:** this is the argument for making the rule a script that ARCH runs and obeys.

**(b) The slot is filled the moment a job merges.**

1. In the combined run: the slot count is two, and three modules have work.
2. Jobs for modules 1 and 2 start. Note the time module 1's tests go green, the time ARCH merges it, and the time ARCH starts the job for module 3.
3. Read all three times from GitHub and from ARCH's event list.

**Reading the result.**

- **Breaks:** the third job starts only at the next hourly alarm, or ARCH picks a module other than the earliest ready one.
- **Proves, for one case:** both gaps are a few minutes. "The moment" needs a number before the trial. **Judgment:** under five minutes each. Process3's good days ran 6 to 13 minutes from ready to merged [record: redteam_feasibility 12].
- **Inconclusive:** ARCH happened to be awake for another reason when the tests went green.
- **A point the draft leaves open.** If ARCH itself merges, it is awake at the merge, so refilling the slot follows in the same turn. The wake that matters is the one before: tests green, or the job reporting done. A pull request's events go to one session at a time [tool today: `subscribe_pr_activity`]. Either ARCH holds each job's subscription, and then the job does not hear its own red test; or the job's last act is a message to ARCH. That choice is not made, and the trial times whichever is chosen.

**Needs.** (a) for the script form of part (a). (b) Part (b): ARCH and three job sessions, about 30 to 45 minutes, inside the combined run; the real chain, because what is timed is an event reaching ARCH. (c) Section 4. (d) Throwaway repository with three toy modules and an ordered module list.

**Reuse and earlier coverage.** The 194 minutes with no event, measured 2 Nov [record: audits B, C, D citing GAP-5]. The scheduling study on the real module list (65 modules with work, 21 waves) [record: no_layers_width]; its scripts are lost. A message from the coordinator was acted on only with a standing instruction naming it [probes rows 26, 27].

**Risk.** Low.

**Depends on.** Design not yet made: where working state lives (K technical 1); where the slot number is kept (K technical 6); who subscribes to a job's pull request. Shares J2's set-up.

### J7. The hourly alarm wakes ROOT itself

**Run.**

1. In its first turn ROOT creates one hourly task with no target session named, so it is bound to ROOT.
2. Wait for one firing, up to an hour plus about a minute (Process3's firings arrived 59 to 81 seconds late [1e row 9]).
3. Read the task's last run: its session id must be ROOT's. ROOT's event list must show a new turn.
4. In that turn ROOT starts one session, to show the woken ROOT can still do what a wake is for.
5. Delete the task.

**Reading the result.**

- **Breaks:** the firing creates a new session; or it resumes ROOT but ROOT cannot start a session in that turn.
- **Proves, for one firing.** Adds to Process3's eight of eight (5 of 5 on 1 Nov, 3 of 3 on 2 Nov [1e rows 9, 27]).
- **Inconclusive:** the firing fails for the container limit, or the hour passes inside another long turn (a message due during a running turn waits for the turn to end [tool today: `send_later`]).

**Needs.**

- (b) One session and one hour of waiting; almost no usage. **Judgment:** to count for ROOT it should be the ROOT Bob starts from his app, at depth 0. The five counted firings of 1 Nov were on probe sessions that another session had started; who started the sessions of the three on 2 Nov is not recorded. In use, the task of the ROOT Bob started on 8 Nov went on firing for days, but what I read does not show whether each firing resumed that ROOT or made a new session.
- (c) None of its own, if it rides in the combined run. Alone, it needs one session start by Bob and no repository and no setting. It is the only item in group B.
- (d) No repository is needed for the alarm itself.

**Reuse and earlier coverage.** Probes rows 6, 7, 9, 20 with evidence files (`evidence/7/`, `evidence/20/`). Today's tool definition says a task by default "fires into THIS SESSION, resuming the same conversation each time", and that firing a task by hand is a separate act [tool today: `create_trigger`, `fire_trigger`]. That agrees with the claim. A fresh session made by a task could start no session, 0 of 3 [1e row 28].

**Risk.** A task left behind. Process3's ROOT task kept firing after the stop of 9 Nov and had sent Bob 94 push notifications by 13 Nov [record: review.txt]. Deleting a task is an act the checker judges case by case [1d]. If it is refused, Bob must delete the task himself in the Claude app. The trial's prompt must tell ROOT to send no push notification.

**Depends on.** Nothing in the design. Best run inside the combined run: the hour of waiting overlaps J1.

### J8. A process fix cannot add a test, gate, review or stop

**Run.**

1. Choose ten Process3 faults whose recorded fix was additive. Candidates with pull request numbers are in the change sample: the zero cost figure (PR 105), the cross-module break (PR 112), and the 72 sampled additions [record: change_sample].
2. For each, prepare a packet: the process repository's tree at the commit just before the fix, and the fault as it was reported, in the words of the time. Leave out the fix.
3. Give each packet to a fixing session under the Process4 rule.
4. Read each result. Does it add a refusal, a test file, a required flag, a hold, a review step, a recorded duty? Count lines added and removed in code and in tests.

**Reading the result.**

- **Breaks:** any of the ten fixes adds one. The definition already says this trial "can break the claim. It cannot prove it."
- **Cannot prove.** Ten clean fixes show that text held ten times, on old faults presented cold.
- **Inconclusive:** a "fix" that changes nothing; a session that says it cannot fix without adding. The second is worth recording as a finding in its own right.
- **Two weaknesses in the trial's design.** Reading "is this an addition?" is a judgment with no agreed scale, so the scale must be written down before the ten are read. And Process3's additions came under pressure: reviewers briefed to find a bypass, Bob's questions, a long context [record: change_sample 5; causal_forensics]. A cold packet has none of that. **Judgment:** a clean result here is weak, and the claim stays unproven until a tranche has run.

**Needs.**

- (a) Steps 1 and 2 are offline, from the process clone.
- (b) Step 3: ten short sessions, or one session with ten workers; about 10 to 20 minutes each. They read the public process repository and return a diff in their reply. They push nothing, so no repository is written.
- **Whether they must be started the real way depends on a choice not yet made:** where the rule lives. If it lives only in the fixing session's starting text, any session can run the trial; but that is the channel Process3 showed does not hold. If it lives in Bob's own committed text in the process's repository, the fixing session must start from a repository that carries that text, which needs a new throwaway process repository and one commit by Bob. In Process3 the rule was never in his committed text [record: enforcement_levers, lever 8].
- (d) No existing repository is written.

**Reuse and earlier coverage.** The change sample's classification of all 296 merges (its table file is lost; the classes can be re-derived from commit messages). No earlier measurement covers the claim. The nearest: the rate of additions was 41% of merges before and after Bob's instruction of 5 Nov [record].

**Risk.** None to accounts. Usage: ten short sessions.

**Depends on.** K technical 2 (which session makes a process fix, and who starts it) and the choice among the enforcement options in `enforcement_levers.md` section 5. Under options A or B there the claim itself changes (a wall replaces the rule), and this trial tests something else. **Judgment:** settle that choice before spending sessions here.

### J9. The process is the same at round N as at round 1

**Run.** This cannot run before a real tranche exists.

1. At round 1, record the commit of every process file the tranche uses, and a hash of each.
2. At each round's end, compare. List every difference beside the recorded corrective fixes.

**Reading the result.**

- **Breaks:** any difference that is not a recorded corrective fix.
- **Proves, for that tranche only,** and only for files. Starting texts that one session types for another, messages, and scheduled tasks leave nothing in git [record: enforcement_levers, residue 1 to 3]. The comparison cannot see them.
- **Inconclusive:** if the set of "the process's files" is not defined before round 1.

**Needs.** (a) to write the comparison now. The trial itself needs the first real tranche: Bob starting development on the real product. No session or setting of its own.

**Reuse and earlier coverage.** Process3's baseline can be re-counted offline: the version entry moved 116 times in nine days [record: product_side 4]; 120 session commits touch it [record: enforcement_levers].

**Risk.** None.

**Depends on.** K technical 14 (which process files a product receives), K technical 3 (how a fix reaches a tranche in progress), and whether Process4 has a version entry in the product at all.

### J10. An edit to Bob's approvals is taken up with no further act of his

**Run.** Late in the combined run, while ROOT, ARCH and one job are alive:

1. The first approvals text leaves out one harmless act, for example archiving an idle session.
2. A probe before the edit: a session asked to do that act declines it.
3. Bob edits the approvals on GitHub's website to add it. This is his one extra act.
4. Then watch, without Bob: does a job started after the edit hold the new text? Are ARCH, the coordinator and ROOT, which loaded the old text, replaced or refreshed? How long does it take? Does work go on meanwhile?
5. The same probe again in each session.

**Reading the result.**

- **Breaks:** any long-lived session still holds the old text after an agreed time with no act of Bob's; or everything stops and waits for him, as five times in Process3 [record: permissions_inventory 1a].
- **Proves, for one edit:** every live session holds the new text within the agreed time and jobs kept running.
- **Inconclusive:** the probe before the edit is carried out anyway. The approvals act on the model, not as a rule, so this can happen. Then nothing afterwards shows a difference. The quoted-first-sentence probe of J3 avoids this.
- **A known hard part.** ROOT loads the approvals only at its start. Taking up an edit means replacing ROOT, and a ROOT that another session starts sits one level lower than one Bob starts [record: roles 1.6, PD-2]. The draft's answer is a standby session (K technical 4). Whether that is "no further act of yours" for ever, or only until the levels run out, is not settled.

**Needs.** (b) No sessions beyond the combined run, plus replacements; 30 to 60 minutes. The real chain is required, because the claim is about sessions Bob did not restart. (c) **One edit by Bob on GitHub's website during the run.** With the pull-request rule on the tranche, his edit is a small pull request that he merges, as in Process3 (`neobobkrause-patch-1` to `-7` in the probes repository). (d) Throwaway repository.

**Reuse and earlier coverage.** None passes. Every one of five edits stopped every role; after the last the product never restarted [record]. Row 31 gives the probe.

**Risk.** Low. Replaced sessions add to the live count.

**Depends on.** The most design of any item: item I 11 (whether the start-up comparison of approvals stays), K technical 4 (how ROOT, ARCH and the coordinator are replaced), K technical 1. It cannot be run until those are chosen. It must come after J2 and J3.

### J11. The internal walk finds what a full regression would

**Run.** The one known break is identified [repo today]: product pull request 95 (module op-declarations), merged at `ee13f80efd` on 4 Nov 06:15Z, first parent `398015cc5c`. It "merged green on its own suite and broke plane's worker.test R6, unseen until the first development deploy served 500s" (process commit `dec8e08`).

1. Copy the product tree at each of the two commits into a scratch folder with `git archive`. The clone itself is not touched.
2. In each copy run the plane's `worker.test` to confirm that R6 passes before and fails after.
3. In each copy run the internal walk: `node journey.mjs` in `bio-plane/src/journey-check`, after `npm ci` there. It is a Playwright walk on the local machine with a stand-in for the AI model; it needs no deployment and no secret [repo today: `process/config.json` `internal_walk`; `journey.mjs`]. Its time limit in Process3 was 45 minutes.
4. Compare the two reports step by step.

**Reading the result.**

- **Breaks:** the walk's failures are the same at both commits. The break was real and the walk did not see it.
- **Supports, weakly:** a step fails only at the later commit, for a reason that traces to the break.
- **Cannot prove.** It is one break, the only one known among about 200 job pull requests [record: change_sample case 1]. The claim is about everything a full regression would find. And the walk at that commit is Process3's walker of 4 Nov, not the walk Process4 will run.
- **Inconclusive:** the walk is already red at the first parent in the area the break touches. That is likely: the first recorded internal walk, on 5 Nov, failed 63 of 236 steps; the last failed 96 of 357 [repo today: `origin/process-state` `walks/internal/`, `deploys/p3dev-l12/.../internal/report.txt`]. No walk in Process3 ever passed.
- **A second, cheaper reading that needs nothing run.** Compare the recorded walk failures with the recorded test failures of the same days. On the one comparable day a clean internal walk was followed by an external walk with 1,691 failures [record: k_evidence]. That is evidence against a neighbouring claim (internal against external), not this one.

**Needs.** (a) Local, in a scratch copy, **if this machine can be made to run it.** Not verified: the product needs Node 26.10.0 (this machine has 22.23.4), fetched from nodejs.org; `npm ci` in up to seven packages; and a browser for Playwright (`/usr/bin/google-chrome` is present; whether `playwright-core` 1.56.1 accepts it was not tried). I ran none of this. If it cannot run here, the fallback is one cloud session on the product repository that only reads, runs the walk in its own container and pushes nothing. That is a session on Bob's account but writes nothing.

**Reuse.** The walk and its reports, as above. The product's `.claude/hooks/session-start.sh`, which installs Node 26 and the packages.

**Risk.** None to accounts if run locally. The read-only session fallback must be told to deploy nothing: the cloud environment named BIO holds the real Cloudflare token [record: k_evidence].

**Depends on.** Nothing in Bob's hands. K technical 13 (how the walk is shared out) does not affect this replay.

### J12. A change across many modules, an account switch, and a stop on Bob's word

Three rehearsals. They differ greatly in size.

**(a) A stop on Bob's word.** Smallest.

1. At the end of the combined run, with ROOT, ARCH, the coordinator, two jobs and the alarm alive, Bob tells the coordinator to stop.
2. Record the time of his words, the time of the last act by any session, and the time of the last alarm firing that did anything.
- **Breaks:** any session starts new work after an agreed time, or the alarm restarts work. After the stop of 9 Nov Process3 ran on for over two hours [record: definition J 12], and its alarm fired for days.
- **Proves, for one case.** **Inconclusive:** sessions were idle anyway.
- **Needs:** no extra session; one sentence from Bob; ten minutes plus one alarm period.
- **Depends on:** K technical 6 (how a stop reaches every session). A message from another session arrives marked as data from a peer, not as a person's word [tool today: `send_message`]. So "the coordinator passes it on" needs a route that sessions will act on. Process3's sessions acted on a coordinator's message only when their starting text named it [probes row 26].

**(b) A change across many modules.**

1. In the throwaway repository with ten or more toy modules, make one trivial change that touches all of them (a renamed word in each).
2. Run it as one pass, by whatever procedure is written. Record who did it, which tests ran, and how it merged while jobs were open on some of the modules.
- **Breaks:** no single pull request can pass a check that runs "only its own module's tests"; or it collides with open jobs; or the rule that a job writes only its own module's files stops it.
- **Cannot prove** realism on toy modules. A real rehearsal needs a copy of the product, which means a second new repository.
- **Needs:** ARCH and perhaps one worker, about 30 minutes, in the combined run.
- **Depends on design not yet made:** it "never had a procedure". K technical 7 (who judges it trivial), and K for Bob 1 (whether the own-files check ends). **Judgment:** this is a design task before it is a trial.

**(c) An account switch.** Largest by far.

1. Bob tells the coordinator a switch is coming. The old account's sessions stop and leave their state in git.
2. On the second Claude account Bob connects GitHub as the sessions' account, makes the cloud environment, and starts ROOT with a plain prompt that mentions the switch.
3. The new ROOT picks up from git alone.
- **Breaks:** work is lost, or the new side needs anything from the old side that it cannot read. Recorded facts: "Old sessions cannot be messaged or archived from the new account"; tasks cannot be read across accounts; 13 job sessions were stranded and 94 minutes passed with no job on 5 Nov; the switch of 7 Nov was cancelled after about 9.5 hours [record: roles 3.4].
- **Needs:** a second Claude account of Bob's, with usage of its own. Bob's acts there: connect GitHub as the sessions' account, check the Claude GitHub App covers the repository, create the cloud environment, start ROOT. These are the Claude-side acts that K for Bob 2 asks him to accept. About six sessions across the two accounts, one to two hours.
- **Risk:** connecting GitHub on the new account as the wrong user. On 5 Nov every push then went out as Bob himself, the repository's admin [record]. Sessions left alive on the old account.
- **Judgment:** rehearse this only when a real switch is near, and on the throwaway repository.

---

## 2. What the probes repository holds

`neobobkrause/process3-probes`, public, cloned today. 312 branches; `main` has 97 commits to 2 Nov.

- **`origin/phase0/platform-table`: `platform/TABLE.md`**, 31 rows measured on 1 Nov, each with saved tool results under `platform/evidence/`. Reusable as written, with names changed:
  - `evidence/28/driver-prompt.md`: 20 rounds of push, open, comment, merge, session start, interrupt, archive, task create, switch off, delete. The model for J1.
  - `evidence/31/claudemd-vs-control.md`: the unforeseen-ask probe with and without Bob's committed text, and how the checker's decision is read from the event list. The model for J3 and J10.
  - `evidence/3/3b-project-settings.md`, `evidence/24/deny-x3.md`: deny-list probes. J3.
  - `evidence/7/`, `evidence/9/`, `evidence/20/`: task firings into a bound session, and firing by hand. J7.
  - `evidence/26/`, `evidence/27/`: whose message a session acts on. J6, J12 stop.
  - `evidence/19/container-limit.md`: the limit of about 50 live sessions.
- **`main`:** the 2 Nov rounds, `physics/r3`, `r4` and `c1` to `c15`: 38 merges into the tranche and 13 of the tranche into main, every one with a `Reviewed:` line [record: permissions_inventory 2a]. Also Bob's approvals of 2 Nov, an 11-rule deny list, and a five-second test workflow (`.github/workflows/probe.yml`) that can be copied as the trial's required check.
- **What it does not hold:** any trial of a merge with no review at ARCH's level started from Bob's own ROOT; any trial of the alarm on a ROOT Bob started; any approvals-edit trial; any evidence file for the 2 Nov counts ("11 of 11", "0 of 21", "about 450"), which rest on the Foundations alone [record: permissions_inventory, limits].
- The repository itself must not be used for the new trials: it is one of the existing public repositories, and its approvals name Process3.

---

## 3. J4 and J5: the offline replay, checked today

### Feasibility: yes, complete, from the local clones

- **Records.** `origin/process-state` in `/home/user/repos/civicsmith-copy`, tip `c4c2529`: `notices/<provider>-<pr>.json` (178), `notices/triage/<user>-<provider>-<pr>.json` (3,125), `notices/answered/` (2,542), `notices/withdrawn/` (6).
- **Commits.** Each notice names a pull request. Its merge commit has the subject `Merge job PR <n>` (144 notices) or `Merge layer PR <n>` (34). 175 are reachable from `origin/tranche`; the other three (pull requests 1097, 1098, 1099) are on the unmerged `layer/14` and are found with `git log --all`. **All 178 resolve to exactly one merge commit, and both parents are present** [repo today].
- **The change at its own commit** is `git diff <first parent> <merge>`. The module list at the first parent (`build/modules.json`) gives the provider's `paths`, `tests` and every declared user at that moment. The provider's requirement file is `build/requirements/<module>.md`.
- **Script.** About 300 lines of Python driving `git show` and `git diff`; no checkout, no fetch. Parts: (1) resolve notices to merges; (2) classify changed files into provider source, provider tests, requirement file, other; (3) extract named parts before and after: exported names and signatures, class members, a hash of exported data, public ids from the `## Public` part, ids in changed test titles; (4) join to the verdicts; (5) score each candidate rule. A second script of about 200 lines lists undeclared dependence from the tip's tree.
- **Speed.** A pass that touches all 178 changes ran in 1.7 seconds.

### Quick full-width pass [repo today; a structural check, not the replay]

| | Count |
| --- | --- |
| Notices resolved to a merge with both parents | 178 of 178 |
| Notifications in the notices | 2,707 (matches the record) |
| Verdicts: affected / not affected / owed | 241 / 2,101 / 783 (the first two match the record) |
| Affected users that are declared users of the provider at the change's first parent | 241 of 241 |
| Affected users named in the notice | 241 of 241 |
| Declared users at the first parent that Process3 did not notify | 167 pairs |
| Notices whose merge changes no file under the provider's source paths | 14 of 178 |

Two things in it need a warning.

- **"241 of 241" is nearly true by construction.** Process3 judged only the modules it told. See J4.
- **The 14 notices with no source change.** Four of them are among the six withdrawn notices. Ten are not. Their merges change only tests, fixtures, scripts or the requirement file. Two of the 14 carry an "affected" verdict: `calculations:70`, whose merge changes only `build/requirements/calculations.md`, and `credentials:74` (withdrawn), a test and the requirement file. So a rule that recognises a change only by "a source file changed" would have missed at least one recorded effect. The four-part rule of the definition, which also reads public requirements and tests, may catch it. That is exactly what the full replay must settle. I did not look further into the ten.

### Sample of seven changes [sample]

Chosen by hand to cover the hard kinds the interface study names; not random. My extractor here is crude: top-level `export function / class / const` only, no class members, no value hashes, and only `R` ids.

| Change | Files changed (source / tests / requirement file) | Parts re-derived at the commit | Affected users | In told set | Evidence cites a re-derived part |
| --- | --- | --- | --- | --- | --- |
| `actions:715` | 1 / 2 / yes | 6 names (matches the notice's own export record), public ids R112 to R116, 7 test ids | 0 (only 2 of 12 notified were ever judged) | | |
| `op-declarations:289` | 1 / 2 / no | no names; 8 test ids | 1 | 1 | 0 |
| `action-grammar:396` | 1 / 2 / yes | 1 name; public ids R5, R31 (matches the notice); test id R31 | 2 | 2 | 2 |
| `interface-shell:310` | 1 / 6 / yes | no names; 6 test ids | 1 | 1 | 1 |
| `agent-worker:569` | 15 / 11 / yes | nothing | 2 | 2 | 0 (unattributed) |
| `interface-assets:443` | 2 / 1 / yes | no names; test id R6 | 3 | 3 | 0 |
| `member-roster:286` | 1 / 1 / no | nothing | 1 | 1 | 0 (unattributed) |

What the sample showed.

- **J4:** all 10 affected pairs were declared users at the change's own commit and were told. In `actions:715`, 7 declared users were not notified by Process3 and so were never judged.
- **J5:** of the 10 affected pairs, 3 have evidence that names a re-derived part; 3 sit in changes where nothing could be named (the notice would say "unattributed"); 4 sit in changes with named parts that the evidence does not cite, and need a reader's judgment.
- **Two things the four parts as drafted may not see.** In `op-declarations:289` and `member-roster:286` the effect is a changed value under an unchanged name; only a hash of the exported value would name it. In `interface-assets:443` and `agent-worker:569` the requirement file changed only in "found" marks (`F1` struck as met; `F5` added), which are not `R` ids. Whether found marks count as public requirements is part of K technical 9.
- In `agent-worker:569` my extractor found no changed name in 15 changed source files. That may be the extractor, not the code. Unchecked.

---

## 4. The combined trial run: one set-up for seven items

J1, J2, J3, J6(b), J7, J10 and the stop and many-module rehearsals of J12 can share one throwaway repository and one sitting of Bob's. Asking him once is the reason to combine them.

**What Bob does, once (judgment: 30 to 45 minutes; Process3's own guide for the same has 11 steps [repo today: `setup/DEVELOPER.md`]).**

1. Create one new repository under his account, for example `process4-trial`. Public or private; private keeps the trial out of sight but may change which GitHub features apply (rulesets are documented for public repositories on the free plan [record: enforcement_levers]). His plan is not known.
2. Give the sessions' GitHub account write access to it, and accept the invitation signed in as that account. Check the Claude GitHub App covers the new repository. If the app is installed for "All repositories", there is nothing to do; I could not determine which.
3. Let a preparatory session fill the repository: a tranche branch, three to ten toy modules with a module list, a five-second test workflow, the role texts, and the minimal merge-and-push tool. This must happen before step 5, or go through pull requests he merges.
4. Commit his approvals to `CLAUDE.md` and the deny list to `.claude/settings.json` on the tranche branch, on GitHub's website, in his own words. **Judgment:** leave out the Cloudflare, Docker Hub and release paragraphs, so that a trial session has no approval to touch them; and leave out one harmless act, for J10.
5. Set the rules: no branch deleted or force-pushed; main and tranche take changes only by pull request with the check passing; no required approvals; merge commits allowed.
6. Start ROOT: a new session on that repository, tranche branch, a plain prompt. Later a second ROOT (J2 step 5).
7. During the run: one edit to the approvals (J10); one sentence to the coordinator, "stop" (J12a).
8. Afterwards: delete the repository; look once at his list of scheduled tasks and of sessions for anything the trial left.

**Choice for Bob on the Claude side.** The existing cloud environment, BIO, holds the product's real deploy tokens and signing seeds [record: k_evidence]. A trial session started in it holds them too. **Judgment:** a separate empty environment for the trial is safer. A session can propose one and Bob approves a prompt [tool today: `create_environment`]; this is one more act, of the kind K for Bob 2 raises.

**Order inside the run, smallest first.** J2 (start-up), J3 (four probes), J7 (create the alarm; it fires within the hour), J1 (twenty merges while the alarm is awaited), J6(b), J12(b), J10, J12(a), clean-up. If J2 or J3 fails, the run stops there and little has been spent.

**Size (judgment).** ROOT twice, ARCH, the coordinator, five to eight job sessions, a few probe targets: about 12 to 15 sessions, three to four hours of wall time, most of it waiting. Peak live sessions under ten.

**What must exist first, written by sessions and not by Bob:** role texts for ROOT, ARCH, the coordinator and a job; the minimal tool; the fixed start rule as a script; the stop route; the replacement route for J10. Each is a design choice in section K that is still open. The run cannot be honest before they are made, because it would otherwise test something made up for the trial.

**Risks of the run as a whole.**

- **Suspension of the sessions' GitHub account.** The run's volume is perhaps 60 pushes, 30 pull requests and 30 merges over three hours, far under Process3's 173 pushes in one hour. But why GitHub suspended the account on 6 Nov was never learned, so I cannot say what volume is safe. Mitigations: space the merges; no state branch; nothing that polls GitHub.
- **Usage.** Not determined. Bob's plan and limits are not in the record. For scale only: one Process3 coordinator session is recorded at $37.24 at its hand-over; coordinators lived four to eight hours [record: roles 1.2].
- **Left behind:** the repository; sessions (archiving is judged case by case; Process3 measured 2 of 5 and 60 of 60 in different sessions [1e row 5]); the hourly task; a cloud environment if one is made; push notifications to Bob's phone.
- **Old Process3 leftovers.** Whether Process3's ROOT, its hourly task and other sessions are still alive on the account was not determined. If they are, they count toward the live limit and the old task still notifies Bob. **Judgment:** ask him to look before the run.

---

## 5. Order, smallest first, in three groups

### Group A. Can run now: no act of Bob's, no session on his account

| Order | Item | What | Size |
| --- | --- | --- | --- |
| A1 | J4 | The replay of 178 changes at their own commits, and the list of undeclared dependence | A script; under an hour including reading the results |
| A2 | J5, mechanical form | Named parts against the 241 | Same script |
| A3 | J6(a) | The start rule as a script, run twice and on reordered input | Minutes, once the rule is written |
| A4 | J5, judged form | 241 short readings by in-session workers | Uses this account's usage; no new session |
| A5 | J11 | The walk at the two commits around the 4 Nov break, in a scratch copy | One to two hours **if** Node 26 and a browser can be set up here; not verified |
| A6 | J8, steps 1 and 2 | Choose the ten faults; build the packets | An hour |
| A7 | J9, preparation | The round-by-round comparison | Minutes |

**Ask of Bob for group A: nothing.** A4 spends some usage inside the present session. A1 to A3 are the trials that can break a claim today.

### Group B. Sessions on his account, no setting changed

| Order | Item | What | Sessions |
| --- | --- | --- | --- |
| B1 | J7, alone | One session creates an hourly task bound to itself, is woken once, starts one session, deletes the task | 1 (plus 1 it starts), one hour |
| B2 | J8, weak form | Ten fixing sessions with the rule in their starting text only; they read the public process repository and reply with a diff | 10 short ones |
| B3 | J11, fallback | One read-only session on the product repository runs the walk twice and pushes nothing | 1, about two hours |

**Ask of Bob for group B:** his permission to use sessions on his account; and for B1 to count for ROOT, that he start that one session himself from his app with three lines of prompt. B1 is better folded into group C. B2 tests the weakest form of the rule, and **judgment:** is not worth running before the choice of where the rule lives is made. B3 is needed only if A5 cannot run here. So group B may be empty in practice.

### Group C. Needs an act only Bob can take

| Order | Item | Bob's act |
| --- | --- | --- |
| C1 | J2 | Section 4 set-up; start ROOT with a plain prompt, twice |
| C2 | J3 | His two commits on GitHub's website (part of the set-up) |
| C3 | J7 | None beyond C1 |
| C4 | J1 | None beyond C1 |
| C5 | J6(b) | None beyond C1 |
| C6 | J12(b), many modules | None beyond C1 |
| C7 | J10 | One edit of the approvals on GitHub's website, mid-run |
| C8 | J12(a), stop | One sentence to the coordinator |
| C9 | J8, strong form | One commit of the "corrects or removes, never adds" rule, in his words, in a new throwaway process repository: only if that is where the rule is to live |
| C10 | J12(c), account switch | A second Claude account: connect GitHub there as the sessions' account, make its cloud environment, start ROOT there |
| C11 | J9 | Start the first real tranche |

**Ask of Bob for group C, in plain words.** One sitting of about half an hour: make one new empty repository, let the sessions' account write to it, write his approvals and deny list into it on GitHub's website, set its two rules. Then start one session with a plain sentence, and later a second. During a run of three to four hours that he need not watch: change one line of his approvals once, and say "stop" once. Afterwards delete the repository and glance at his task and session lists. Optionally approve a prompt for an empty cloud environment. C1 to C8 are all inside that one ask. C9 and C10 are separate asks and can wait. C11 is not a trial he is asked for; it is the first real use.

### Dependencies in one view

- J3, J1, J6(b), J7, J10, J12(a), J12(b) all stand on J2's run. J10 must follow J3. J1 must follow J3, because a decline by ARCH is otherwise unreadable.
- J5 stands on J4's script.
- **Blocked by design choices not yet made:** J1 (the merge act and its tool), J2 (role texts; whether any tool exists), J6 (where state and the slot number live; who hears a job's test result), J8 (where the rule lives; who makes a fix), J9 (which files are "the process"), J10 (whether the approvals comparison stays; how ROOT is replaced), J12(a) (the stop route), J12(b) (the procedure itself).
- **Not blocked by anything:** J4, J5, J7, J11.

---

## 6. What I could not determine

- The Claude Code version and model in use today, against 2.1.316 and claude-opus-5-5 when Process3 measured.
- Bob's GitHub plan and Claude plan; what the trial run would cost in usage.
- Whether the Claude GitHub App is installed for all of his repositories or only the three.
- Whether Process3's sessions and its hourly task are still alive on his account.
- Why GitHub suspended the sessions' account on 6 Nov, and so what volume is safe. Whether the first sessions' account was restored.
- Whether this machine can run the internal walk (Node 26.10.0, the packages, Playwright with the installed Chrome). Not tried.
- Whether a fresh repository can reproduce the "old copy of the branch" fault at all.
- The ten notices (not withdrawn) whose merges change no provider source file: listed, not examined.
- How the 783 "owed" triage rows relate to the interface study's "134 notifications with neither a verdict nor an answer". Not reconciled.
- Whether `playwright` failures at the 4 Nov commits would hide the break. Only running it will tell.

---

## Appendix. The quick pass, as run today

Run from `/home/user/repos/civicsmith-copy`; reads only. It needs `git log --all --merges --since=2026-11-01 --format='%H %P|%s'` saved as `merges_all.txt`.

```python
import re, sys, subprocess, json, collections, io, tarfile
S = sys.argv[1]
def show(rev, path):
    r = subprocess.run(['git','show',f'{rev}:{path}'], capture_output=True, text=True, errors='replace')
    return r.stdout if r.returncode == 0 else None
def git(*a): return subprocess.run(['git',*a], capture_output=True, text=True, errors='replace').stdout
merges = {}
for line in open(S + '/merges_all.txt'):
    h, rest = line.split(' ', 1); parents, subj = rest.rstrip('\n').split('|', 1)
    m = re.match(r'Merge (job PR|layer PR)\s*(\d+)\b', subj)
    if m: merges.setdefault(int(m.group(2)), []).append((h, parents.split()))
tf = tarfile.open(fileobj=io.BytesIO(subprocess.run(
    ['git','archive','origin/process-state','notices'], capture_output=True).stdout))
notices = {}; tri = collections.defaultdict(list)
for m in tf.getmembers():
    if not m.isfile(): continue
    if re.match(r'notices/[^/]+\.json$', m.name):
        d = json.loads(tf.extractfile(m).read()); notices[d['key']] = d
    elif m.name.startswith('notices/triage/'):
        d = json.loads(tf.extractfile(m).read()); tri[d.get('key')].append(d)
c = collections.Counter()
for key, n in notices.items():
    M, (P1, P2) = merges[n['pr']][0]
    mods = json.loads(show(P1, 'build/modules.json'))['modules']
    me = [m for m in mods if m['id'] == n['provider']][0]
    declared = {m['id'] for m in mods if n['provider'] in m.get('uses', [])}
    files = git('diff','--name-only','--no-renames', P1, M).splitlines()
    c['source_changed' if any(f.startswith(x) for f in files for x in me['paths']) else 'no_source_change'] += 1
    c['declared_not_notified'] += len(declared - set(n['users']))
    for r in tri.get(key, []):
        if r.get('verdict') == 'affected':
            c['affected'] += 1; c['affected_declared_at_base'] += r['user'] in declared
for k, v in c.items(): print(v, k)
```

The seven-change sample used the same resolution, then compared, between first parent and merge: `export` statements of changed source files; `**R<n>**` lines under `## Public` of changed requirement files; and `R<n>` in added or removed test-title lines of changed test files.
