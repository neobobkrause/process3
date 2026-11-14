# Process4 draft: adversarial review (corruption, stall, loopholes)

Reviewed: `recommendations_draft.md` against `causal_forensics.md`, `change_sample.md`, `product_side.md`, `canon_analysis.md` (sections 4 to 6) and `levers_github_cloudflare_product.md`, with spot checks in both repositories (read-only). Twelve findings, ranked by likelihood times damage. "Evidenced" means the record or a platform document says it; "conjecture" means my reasoning. Platform facts I state from memory and did not re-read today are marked "from memory".

Short verdict: the wall around the process repository is sound and I could not break it. The draft then assumes that walling the place where Process3's growth happened removes the growth. The record says growth goes to whatever is uncapped (prompts flat at 4,032 to 4,044 bytes, code 16 times larger). Process4 leaves uncapped: everything on the Claude side (task prompts, session prompts, messages, subagents), the product's tests and walker, and the owner's own merge button. It also turns every defect in the frozen parts into a stop only the owner can clear, and gives him a once-a-day signal that does not see most of those stops.

---

## Findings

### 1. The first gate defect in run 1 stops all product work, and only the owner can clear it

(a) Scenario. The gate is rebuilt before run 1 (sharded, cached, containerised, called from another repository at a SHA). On day 1 it has a defect: a shard times out, a cache key is wrong, the Playwright container lacks something, the plan step maps a path to no module. Every job pull request is red or pending. Sessions cannot touch `.github/**` or the process repository, so D4's "workaround and one line" has no workaround to offer. N3 then applies: every job sets blocked and stops, BOB has nothing to start, and the owner is told by a daily workflow. The repair is an owner merge in the process repository plus an owner merge of the pin, which is a "process change during the run". The success test (zero process changes, owner under 15 minutes a day) fails on the first day by construction, or the owner starts treating gate fixes as exempt, which is Process3's "during the first build, changes are expected" (licence L9) again.

(b) Evidence. Evidenced: the Process3 gate needed repeated repair for environment reasons, not logic: timeout 45 to 90 minutes after two cancellations (PR 147), 41 of 113 tests ENOENT (PR 80), `ubuntu-latest` moving and breaking the browser install (levers 3.2), three rehearsals that each "needed a follow-up commit because CI's environment differed from a session's" (PR 283). `process-gate.yml` went 77 to 273 lines through pin moves. Spike S5 measures speed on one module, not correctness across 220. From memory: re-running a failed pull-request run reuses the original merge commit, so after the pin is fixed every open pull request needs a new push to pick the fix up.

(c) Smallest change. Three edits, no new standing mechanism. (i) Before the freeze, replay 20 to 30 pull requests already merged in Process3 through the new gate, once, with no sessions running. (ii) Change the success test from "zero process changes" to two counts: session-originated process changes (must be 0) and owner gate repairs (expected to be above 0 in run 1, reported). (iii) Say in the draft that a gate defect ends the run, and that this is the designed outcome of a short first run, so nobody builds around it.

### 2. Pull requests get stuck with no event to wake anyone, and the watchdog neither runs often enough nor looks at the right thing

(a) Scenarios, all without an owner present.
- Base red: a merge breaks module X on the integration branch. Every open pull request touching X is red through no fault of its own. The fix lands. Nothing re-runs: the required check is non-strict, so a base move triggers no run, and a manual re-run reuses the old merge commit. The jobs were woken once by the red check and have nothing further to wake them.
- Textual conflict: GitHub builds no test merge, so the gate never starts, the check stays "expected", there is no red event, and auto-merge waits for ever.
- Dead or paused job (three classifier refusals, a permission prompt, a crash): its pull request stays open, so `status` never lists the module as ready, and its dependants (median 71 transitive) never become ready.
- BOB dead: no pull request is "ready but unmerged", because ready ones auto-merge. G8's listed signals all read healthy.
- Wrong requirement: the job blocks correctly, and everything above that module waits silently.
In each case the draft's answer is the watchdog, which runs "once a day". Time to notice is up to 24 hours plus N. The emailed failure goes to whoever last edited the workflow's schedule; if run 0's clean-up pull request is authored by the commissioned session, that is the session account.

(b) Evidence. Evidenced: "so no merge waits on checks GitHub never starts (copy PR 108)" (PR 85). 48 of 165 job blocks cite "the suite already red on the tranche before the job started"; a base-red exemption had to be built (PR 101) and repaired four times. "A BOB waiting on a gate goes idle with no wake" (coordinator log, 6 Nov 11:51) and it was a coordinator, a role now deleted, who nudged it. A lane session sat waiting on a permission prompt until a later sweep change named it (C15, PR 219). 9.3 hours with no commit of any kind on 7 Nov. Levers 5.2: "Notifications for scheduled workflows are sent to the user who initially created the workflow". Platform fact from this session's own tool definitions: "A PR's events go to one session at a time", so C2 (BOB subscribes to pull-request events) and C3 (each job subscribes to its own) cannot both hold, and a dead job's pull request delivers its events to nobody.

(c) Smallest change. Replace G8's stall list with one signal computed from git alone and checked hourly: "no merge into the integration branch for N hours while unmerged modules remain". Keep the daily comment daily. The owner pastes the workflow file himself. Put two acts on the job's "may do without asking" list: merge the integration branch into your own branch; close your pull request and stop. Give BOB's hourly text one clause inside its byte cap: for any job pull request with no push in N hours, close it and start the module again. Delete C2(a) (BOB's pull-request subscription), since the platform does not allow it alongside C3.

### 3. The effective process moves to the Claude side, where nothing is walled, capped or counted, and the "process changes: 0" line cannot see it

(a) Scenario. The draft says "the hourly task's prompt IS BOB's whole standing instruction" and "BOB does not add rules to a START". Both are sentences. BOB types the START into `create_session` (a free-text `prompt`, plus `append_system_prompt`); nothing compares it with the rendered template. BOB can rewrite the prompt of the task bound to it. BOB can message any job at any time. Any session can create scheduled tasks and helper sessions. Any job can brief its own subagent however it likes, as often as it likes. After a week: the hourly prompt carries six "also check" clauses; STARTs carry a paragraph of "lessons"; there are three extra scheduled tasks (a walk reminder, a "flow check", a retrospective prep); every job runs a self-briefed cold review before marking ready and fixes all of it. The daily report prints "process changes during the run: 0" throughout, because it counts commits to paths that the wall already holds at zero.

(b) Evidence. Evidenced: the coordinator's hourly task "now also tracks layer 6 close and Bob's SLB/AUD answers" (log, 5 Nov 23:58), then ran `github audit` each hour (forensics 3E); coordinators carried three to five scheduled tasks each (handoffs 4nov-c to 8nov-c); "only ROOT's own session can update its trigger's prompt", so the bound session can; "MY STANDING RULES TO BOB" and "told BOB '6 at most'; BOB followed for ~6 h" show messages working as rules; builders' ad hoc cold reviews bypassed the tool's restrained brief, and 102 of 104 findings were acted on. Growth went wherever there was no cap (forensics driver 3).

(c) Smallest change. Walls and one honest label. (i) The owner creates the one hourly task; its prompt is a single line: "Read `bob.md` at the pinned process SHA and do it." The text then lives behind the process wall and under the byte test. (ii) Protected settings deny `create_trigger`, `update_trigger`, `delete_trigger` and `send_later` for every session, and the general-purpose subagent for jobs, leaving the read-only explorer and the fixed reviewer. Add these to spike S6, which already asks whether a deny removes an MCP tool. (iii) Rename the report line to "commits to guarded paths" so nobody reads it as "the process did not change". Accept as a known limit that BOB's messages cannot be walled; finding 4 removes most of their persistence.

### 4. A long-lived BOB is the handoff chain in one body

(a) Scenario. BOB "keeps nothing durable in itself", but its compaction summary is durable: it carries "standing decisions", owner remarks, and holds. Restating the role every hour does not remove what the summary holds. Owner chat rulings that M4 says expire live exactly there. An owner edit to CLAUDE.md never reaches a session that started before it (C8), and BOB started before everything.

(b) Evidence. Evidenced: 25 coordinator takeovers, each note re-growing "Rules in force" within 24 hours of handoff 5nov-g's "this page carries no rules"; 21 items marked as the owner's across ten handoffs, 14 of them mechanisms; "about 6 job sessions" recorded as his agreement. Conjecture: a compaction summary behaves like a handoff note. That is what S4 would be testing, and S4 as written only tests that BOB resumes, not what it carries.

(c) Smallest change. A deletion: BOB is not a session. The hourly task starts a fresh session each firing (the platform offers this), which reads `status`, starts jobs, and ends. That removes compaction, S4, the "BOB dies" case, the ROOT-restoration clause and the stale-CLAUDE.md problem, and meets R13 outright. The owner talks to any session he opens. Cost: a newly ready module waits up to an hour for the next firing. Accept it. One thing to check in the spike: the tool text says deleting a scheduled task deletes the sessions it started.

### 5. The owner's merge button is the remaining route for mid-run process change, and the record says he presses it

(a) Scenario. Day 3, the walk number falls or the account is flagged again. The owner asks BOB "why did this not get caught, can we prevent it". BOB cannot push to the process repository, but any session can fork it and open a pull request (levers 1.2), and the owner receives a green pull request with a merge button. Or he ends the run, merges, and starts a new run the same hour: N2's "only between runs" is satisfied and the pin has moved mid-work. Or a session drafts a CLAUDE.md paragraph and he pastes it.

(b) Evidence. Evidenced: 151 of 159 drafted canon lines accepted; 20 audit lines answered in three minutes, none dropped; four anticipation requests in 26 hours on 6 to 7 Nov, each returned as a subsystem; 16 owner patches to the product's CLAUDE.md in nine days, with session-written drafts in `notes/` (`claude-md-approvals-draft-4nov.md`, `draft-approvals-split-8nov.md`); owner inputs "sufficient whenever [they] came as a question about a failure" (driver 9). Of the six practices: O3 (totals) and O4 (one number) are realistic because the artefacts are built that way. O1 depends on BOB volunteering a number and is not in BOB's text. O5 depends on finding 4. O2 and O6 are pure willpower and are the two the record shows failing under stress.

(c) Smallest change. Walls on the owner's side, set by him once. (i) During a run, set the process repository's interaction limit to collaborators only, so no session can open a pull request or issue there; lift it for the retrospective. (ii) Process repository ruleset: the caps test is a required check with an empty bypass list, so even the owner cannot merge over a cap without first editing the cap in a visible commit. (iii) One count on the daily comment: process versions pinned in the last seven days. Accept as a known limit that the owner can still override all of it; the aim is that it takes him three deliberate acts, not one click.

### 6. The check-adding tendency moves into the product's tests and walker, and the guard proposed for it is blind there

(a) Scenario. P5 guards with gate minutes. Sharding makes gate time insensitive to test volume, and the tests Process3 added for process reasons were cheap in minutes and expensive in friction. M3 rule 3 ("if it gets in your way, work around it") reads, to a job with a red gate, as leave to skip or loosen the failing test. The run's one daily number, walk steps passing, is computed by `journey-check`, which is ordinary session-writable product code; a job "correcting a stale step" raises the number. Helper scripts appear under `scripts/` or a new top-level directory and BOB tells jobs to run them: the tool regrows in the product. A workflow file pushed to a branch that never opens a pull request runs on every push to that branch with no owner involved.

(b) Evidence. Evidenced: 211 process-artefact test files, 11,410 lines, 26% of the week's test growth, including tests that hash requirement Markdown; test lines grew 43,882 against 23,090 of source; the internal walk went from 238 to 357 steps as "it was given more to check"; four job landings touched `journey-check` (my count over the 508 landings); `build/modules.json` carries a "status" string of dozens of dated "AMENDED by BOB" clauses, so rule text already accretes inside product data files. Levers 1.3: a write collaborator can push workflow files to any unprotected branch.

(c) Smallest change. Invert CODEOWNERS: `* @owner` first, then un-own the product's existing module directories. Evidenced as safe: all 508 landings touched only a fixed set of top-level directories and none touched `build/modules.json`, `.github/`, `.claude/` or `CLAUDE.md`. A new top-level directory or a root script then needs the owner. Put the walker's step definitions under the owner too. Put the 20-line "tests deleted or skipped" annotation into the gate (finding 9). Show the walk as passing and total, and add one ratio, test lines to source lines merged that day. Make S6 decisive: if sessions can push workflow files, turn on the Actions policy that lets the session account run only named workflow files.

### 7. Two of the caps do not cap, and the first contents are written by an unwalled session

(a) Scenario. "CLAUDE.md ≤ 30 lines" is satisfied by one 3,000-byte line. The test is in the process repository; the file is in the product. CLAUDE.md can import other files, and `.claude/rules/` loads automatically. Separately, run 0 commissions a session to write the gate, the prompts, the status tool and one large clean-up pull request before any wall exists. Byte caps bound size, not disposition: 4 × 4,096 bytes of hold-and-verify sentences fits.

(b) Evidence. Evidenced (my check): the product's CLAUDE.md at the Process3 tip is 22 lines and 8,664 bytes, with a longest line of 2,773 bytes. It grew 13.5 times and would have passed a 30-line cap on every day of the week. The Process3 BOB prompt sat at its byte cap with 11 check sentences to 9 act sentences. PR 26 ran five review rounds on 2 Nov before any rulebook existed.

(c) Smallest change. State every cap in bytes. Count everything loaded at session start (CLAUDE.md, its imports, `.claude/rules`, agent files) as one figure, printed by the daily workflow from the product's own tree. Give the Process4 build itself a budget fixed before it starts: total lines in the process repository including its tests, and a number of pull requests. The owner sees those two totals.

### 8. Routine coordination touches owner-gated files dozens of times a week

(a) Scenario. G2 guards the layer map. P3 has BOB split oversized requirement files, and new or split modules need their paths and tests entered in `build/modules.json`. Each is a pull request waiting for the owner. Each approvals fix in CLAUDE.md is another, and counts as a process change mid-run.

(b) Evidence. Evidenced (my count): `build/modules.json` changed 40 times on the integration branch in the week, 14 on 4 Nov, all through BOB's pull requests; CLAUDE.md 15 times; `process/config.json` 66 times.

(c) Smallest change. Do every known split and every new module's map entry in run 0. During a run, nothing changes the map: an oversized file is read in parts, and a job that needs a map change blocks and is picked up at the retrospective. Count approvals edits separately from process changes.

### 9. G4 discards the cleanest checks in the record, and C7's trigger is not connected to anything

(a) Scenario. G4: the gate "runs the changed module's tests. It does nothing else". That drops the stale-generated-file check and the built-row verify. C7 says the reviewer runs "when CI flags deleted or weakened tests", but no part of the gate flags. The push run on the integration branch "reports any break", scope unstated; if it is not the full suite, a cross-module break is first seen at a daily walk.

(b) Evidence. Evidenced: PR 209 (stale generated file went green, nine failures on the integration branch) and PR 251 (a fault "surfaced at round close, a day late") are both product-defect triggered, cost seconds, and were never repaired or removed; change_sample calls them "what a good addition looks like". The deleted-or-weakened-test trigger had five acted findings on its first day. Copy PR 95 merged green and broke another module, "unseen until the first development deploy served 500s". The owner himself ruled the internal walk the cheap finder against a 60-minute live walk (8 Nov).

(c) Smallest change. Reword G4 to "builds the product, verifies its generated files, and runs the changed module's tests", which D2 already permits. Add the test-deletion annotation as a warning. State that the push run is the full suite plus the walker's local arm.

### 10. Keeping state in pull requests loses the record if the account is flagged again

(a) Scenario. The session account is suspended a second time; cause still unknown. Every pull request it opened returns 404. `status` computes ready = plan minus merged minus open, sees zero open, and BOB restarts every in-flight module. The process log's lines, written as that account's comments, vanish too.

(b) Evidence. Evidenced: "HIDDEN PRS: every PR opened by the suspended civicsmith account is hidden (404; open PR count 0 on the copy) ... branches intact" (log, 6 Nov 23:40).

(c) Smallest change. `status` derives in-flight work from unmerged `job/*` branches, not from pull requests. Do G9 before anything else. Accept the log loss as a known limit.

### 11. The draft commits several of the sins it diagnoses

(a) Specifics.
- About 75 numbered items, against a diagnosis of rule count.
- D5 requires counts collected automatically. Classifier refusals (C9), BOB deaths (C2), owner minutes (success test), cost ("if readable") and "walk failures a type check would have caught" (P4) have no collector, so those decisions will be made by argument.
- "Restore a minimal ROOT if ...", "hooks ... not before the count says so", "keep or drop on that count": pre-authorised re-additions, the same form as licence L19.
- M5 (show sessions the scoreboard) has evidence against it: the coordinator reported landings hourly and still did not notice 16 process merges to 3 product landings; "visibility alone, without a hard budget, did not hold" (driver 10). C6 (effort dial) and N6 (nightly revert sampling) have no measured failure behind them.
- D3 says nothing inside a session refuses; C5 is a deny list inside the session. Its `gh pr merge` rule cannot be written as a deny pattern (deny beats allow, and "without `--auto`" is a negation; from memory) and is unnecessary because the ruleset already holds.
- O4 says one number; G8 prints seven and the success test has five.
- N3's log is a pinned issue every session can read. A list of "what, workaround used" is the "HOW TO WORK (learned today)" section under a new name.

(b) Evidence: as cited; the last point is conjecture resting on forensics section 3.

(c) Smallest change. Deletions: C9, the ROOT clause, M5, the `gh pr merge` deny, N6 until a failure is measured. Replace "owner minutes" with a count GitHub can produce (owner approvals, merges and comments per day). Cap the process log at a number of lines per run; reaching it ends the run.

### 12. Requirements the draft weakens, stated plainly

- R7 (stop means stop): not met. Auto-merge and event-woken jobs continue after the owner says stop. Smallest change, a wall: stop is the owner turning on "lock branch" for the integration branch and disabling the hourly task.
- R3 (owner edits no files, enters no commands): weakened. He configures rulesets, environments and tokens, pastes a workflow, merges every process and guarded-path change, and restarts BOB. Accept, and say so.
- R6 and R15 (unattended; work does not wait): weakened by findings 1, 2 and 8.
- R10 (tests are real): reduced to a nightly sample that reports. R11 (every requirement tested at the interface): unenforced; a mark can be struck with no test. Accept as a known limit, with the walk as the compensating check, which is why finding 6's wall on the walker matters.
- R17 (single ownership of modules): nothing checks that a job stays inside its module. Accept; watch the post-merge red rate that G3 already counts.
- R22 (honest about cost): false-done rate, cost per surviving change and owner time are all unmeasured.
- R4 (a decided question is never asked again): rulings expire with the run by design. Accept.
- R2 against R21: requirement files are owner documents that 252 of 508 landings edited. Sessions can add requirement lines through an auto-merged pull request. One count on the daily comment: requirement lines added by sessions.
- R13: met only with findings 4 and 10. R24 (account moves): not addressed.

---

## Channel table (supports findings 3, 6, 7)

| Channel | Can a session write? | What stops growth in the draft | After a week, unchanged |
| --- | --- | --- | --- |
| Product tests | Yes | Gate-minute median (blind under sharding) | Process-style tests return; red gates answered by skips |
| Walker steps | Yes | Nothing | The daily number rises for the wrong reason |
| Pull-request bodies, comments | Yes | Nothing; dies at merge | Long "Known limits" lists; low harm |
| Labels | Yes | Nothing | `hold`, `wait-for-x`, `needs-review` used as holds by BOB |
| Layer map | Not to a protected branch | CODEOWNERS | Owner approval queue (finding 8) |
| Requirement files | Yes, auto-merged | Nothing | Process-like requirements that the reviewer then cites |
| BOB's messages and STARTs | Yes | A sentence | Standing rules by message |
| Hourly task prompt | BOB, yes | Nothing (byte test is on the template, not the live task) | "Also check" clauses |
| Other scheduled tasks, helper sessions | Yes | A sentence (C1) | Watcher and sweep return as tasks |
| Ad hoc subagent briefs | Yes | C7 covers only the named reviewer | Cold review of every pull request |
| Process log issue | Yes | A line count in the report | A workaround rulebook |
| Workflows on a branch | Yes, unless S6 says no | CODEOWNERS only at merge | Helper automation that never merges |
| Helper scripts in the product | Yes | Nothing | A second tool |
| CLAUDE.md via the owner | Drafted by sessions | A line cap that does not cap | Paragraph-long approvals lines |

## Stall table (supports findings 1, 2)

| Stall | Who can clear it | Noticed after | Does "workaround + one line; watchdog emails owner" work? |
| --- | --- | --- | --- |
| Broken gate workflow | Owner only | Up to 24 h + N | No workaround exists |
| Flaky required check | Job (re-run, or loosen the test) | Minutes | Works, but feeds finding 6 |
| CODEOWNERS catches a needed file | Owner only | Up to 24 h + N | No |
| Auto-merge not firing (conflict, still draft) | Job, if woken | No event; up to 24 h + N | Not as drafted |
| Rate limit or suspension | Owner only | Next watchdog run (it runs under Actions, so it survives) | Notice works; record does not (finding 10) |
| BOB dead or drifted | Owner | Not seen by G8's signals | No |
| Job paused on refusals | BOB, if told to | Not seen; module never ready | No |
| Integration branch red | Fix job, then each blocked job must push again | Next hourly BOB wake; blocked jobs never | Partly |
| Wrong requirement | Owner if meaning changes | Up to 24 h + N | Partly |

---

## Tried to break, could not

1. The process repository wall (G1). A non-collaborator cannot push, and nothing in the product can stand in for the reusable workflow without touching `.github/**`. The only route in is the owner's merge (finding 5).
2. CODEOWNERS catching ordinary job work. Zero of 508 landings touched `.github/`, `.claude/`, `CLAUDE.md` or `build/modules.json`. An inverted file would not have caught them either.
3. A job making its own check pass by editing the workflow on its branch. The modified run can go green, but the pull request then contains a guarded file and needs the owner. The remaining route (a workflow on another branch writing a check onto someone else's commit) takes intent, which is outside the stated threat model.
4. The byte cap enforced by a test. It held for five days under the same pressure that grew the code 16 times. The mechanism is right; the unit and location are what finding 7 corrects.
5. Deleting the state branch, ledger, receipts, pacing and census. I looked for a recorded catch from any of them and found none; landed product code survived at 98.8% without their help, and 89% of commits were their bookkeeping.
