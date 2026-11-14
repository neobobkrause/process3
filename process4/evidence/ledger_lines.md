# Keep and Drop Ledger: full extraction

Extracted from the page source exported 5 Nov 2026 (ITEMS, window.DETAILS and SEED inside the HTML). 159 lines: 126 decided 31 Oct (six of them re-dated 3 Nov), 21 principles and 12 gap lines decided 3 Nov. Decisions: 119 kept, 32 modified, 8 dropped.

Fields per line: statement (verbatim), source, evidence grade, the suggestion and its one-line reason (both drafted by the session that built the page), the owner's decision with its timestamp (UTC), the note stored with the decision (verbatim), and where present the page's own explanation, pros and cons. "Note origin" is this analyst's comparison of the note with the suggestion text. "Tag" is this analyst's primary classification: C = check / gate / review / verification; R = record or bookkeeping artefact; M = measurement, metric or alarm; S = role or session structure; X = restraint (limits checks, rules, caution or cost); O = other design constraint, structure or policy; D = dropped; rep = kept on the page but replaced by a GAP line.


## Platform facts

### PLT-1 — kept

- Statement: Keep one dated table of platform constraints: each a measured fact, how often measured, the evidence, and the workaround the process uses. Nothing depends on a behaviour that is not a row.
- Source: Requirements PLT-1, PLT-12; research: every harness component encodes an assumption about the model that goes stale.
- Evidence grade: measured. Suggested: keep. Reason given: The one artifact from both attempts that gets more valuable with age.
- Decision: kept, 2026-10-31 00:54 UTC. Tag: M
- Note: none
- Page explanation: A single file in the process repository lists what the Claude Code cloud platform has been seen to allow and refuse: one row per behaviour, with the date it was last confirmed, how many times it was measured, a link to the evidence, and what the process does about it. Every other part of the process may rely only on behaviours that appear as a row.
- For: Turns scattered, painful discoveries into one reference a new session reads in a minute. / Makes a platform change visible as a stale row rather than a surprise in the middle of a tranche. / Cheap to keep: a row is a few lines.
- Against: Rows go stale silently unless someone re-measures; a re-measure schedule is itself work. / Becomes a dumping ground for every oddity unless there is a rule for what qualifies as a row. / Only as good as the discipline of refusing to depend on unlisted behaviour, which is a text rule.

### PLT-2 — modified (against the suggestion: keep)

- Statement: Depend on no act the auto-mode permission classifier decides case by case: archiving sessions, editing or deleting scheduled tasks, interrupting sessions, editing settings files.
- Source: Requirements PLT-2 (same call passed and failed minutes apart); research: classifier misses 17% of real overeager actions by Anthropic's own measurement.
- Evidence grade: measured. Suggested: keep. Reason given: Non-determinism is by design, so design around it.
- Decision: modified, 2026-11-03 19:30 UTC. Tag: O
- Note (written in by the coordinator): Bob's word in chat, 3 Nov (written here by the coordinator): depend only on acts the committed approvals cover and that were measured to pass; archiving sessions and switching off or deleting tasks are housekeeping, counted and reported, never needed for correctness.
- Page explanation: In auto mode, some tool calls are approved or refused by a model-based classifier that judges each call on its own. The record shows the same call passing once and failing minutes later. This rule says the process is designed so no step needs those calls at all, rather than trying to make them reliable.
- For: Removes a whole class of random failures with no code. / Anthropic's own measurement confirms the classifier both misses and refuses unpredictably. / Forces simpler designs: nothing waits on an archive or a timer change.
- Against: Gives up convenience: old sessions stay idle instead of being cleaned up, timers cannot be retargeted. / Needs the table of PLT-1 to know which acts are gated, and that set can change with platform releases. / If a future need genuinely requires one of these acts, the only fallback is you doing it by hand.

### PLT-3 — kept

- Statement: Hard permission rules live in allow and deny lists in user settings plus the sandbox, which run before the classifier. The classifier is defence in depth, never the policy.
- Source: Research: deny and PreToolUse run before the classifier; autoMode config honoured only in user settings.
- Evidence grade: measured. Suggested: keep. Reason given: Explains the refusals that looked random when settings did not load. New to the ledger.
- Decision: kept, 2026-10-31 01:26 UTC. Tag: rep
- Note: none
- Page explanation: Claude Code checks deny rules, allow rules and PreToolUse hooks before it asks the classifier. Anything that must always pass, or must never happen, is written as an allow or deny rule in the user-level settings, where the classifier honours it. The classifier then judges only what falls between.
- For: Deterministic where it matters, with no hook code. / Explains past refusals of allow-listed acts: project-level settings were not where the classifier looked. / Lists are short, reviewable and version-controlled.
- Against: User-level settings are per environment, not per repository, so the shims must install them in the right place. / A broad allow rule such as unrestricted shell is dropped on entering auto mode, so some acts still need the classifier or a CI runner. / Platform behaviour here changed through 2026 and may change again; the row in PLT-1 needs a date.

### PLT-4 — kept

- Statement: No step runs longer than the in-session background limit; anything that can is a CI workflow.
- Source: Requirements PLT-5 (gate killed at 30 minutes in-session).
- Evidence grade: measured. Suggested: keep. Reason given: Platform fact, not a preference.
- Decision: kept, 2026-10-31 01:26 UTC. Tag: O
- Note: none
- Page explanation: A command started in a cloud session's background is killed by the platform after a fixed time, about thirty minutes today. Anything that might run that long, such as a full test suite, runs as a GitHub Actions workflow instead, where the limit is hours.
- For: Removes the observed failure of a gate dying at the limit and repeating. / CI gives a durable log and a status check for free. / Keeps session context clean of long outputs.
- Against: CI adds queue latency and a second environment to keep in step with the session's. / CI minutes cost money on private repositories. / Needs lock-file and Node-version installs to match the product, which GAT-5 covers.

### PLT-5 — modified (against the suggestion: keep)

- Statement: No session starts its own successor. Sessions are started only from depth 0 or 1, so depth never grows past 2.
- Source: Requirements PLT-6 (lane reached depth 4 in a day); civicos ROOT; research: every self-spawning hub failed.
- Evidence grade: convergent. Suggested: keep. Reason given: The most consistently documented failure in the field.
- Decision: modified, 2026-11-03 19:30 UTC. Tag: O
- Note (written in by the coordinator): Bob's word in chat, 3 Nov, option A (written here by the coordinator): no session starts its own successor; depth stays at most 3 (coordinator, ROOT, BOB, job), as ran on 3 Nov when the explore and review jobs merged at depth 3. The watcher is started beside ROOT by whoever starts ROOT.
- Page explanation: A session never creates its own replacement. New sessions are created only by you, by ROOT, or by a scheduled task. The tree of sessions stays shallow and no session's survival depends on a session it created.
- For: Prevents the runaway chains seen on the 30th and documented in every orchestration framework studied. / Depth stays well inside what the platform allows. / Each session has one clear creator, which simplifies the record.
- Against: A refresh needs a round trip through ROOT or a timer, which adds latency. / ROOT becomes a single point you must restart if it dies. / Natural patterns such as a job splitting itself are forbidden and must go through BOB.

### PLT-6 — kept

- Statement: A scheduled task is never required for correctness; a wake is a convenience and the record is read at every wake regardless.
- Source: Requirements PLT-7 (task fired into an archived session).
- Evidence grade: measured. Suggested: keep. Reason given: Tasks are cheap wakes, not state.
- Decision: kept, 2026-10-31 01:26 UTC. Tag: O
- Note: none
- Page explanation: Scheduled tasks can fire late, twice, or into a session that no longer exists. They are used only to wake a session that would otherwise sit idle. Correctness never depends on one firing, because every wake starts by reading the record in git.
- For: No work is lost when a timer misfires, as happened on the 30th. / Timers need no cleanup when sessions are replaced. / Idempotent wakes make duplicate firings harmless.
- Against: A session nobody messages may sit idle until someone notices. / Needs an explicit backstop, such as your own check or a periodic status, to catch stalls. / A stale timer firing into a retired session wastes a turn, though a harmless one.

### PLT-7 — kept

- Statement: A session works on one repository, the product's; the process is a read-only clone at a pinned commit.
- Source: Requirements PLT-8 (two repositories broke settings loading).
- Evidence grade: measured. Suggested: keep. Reason given: Measured twice.
- Decision: kept, 2026-10-31 01:27 UTC. Tag: O
- Note: none
- Page explanation: A session works inside the product's repository only. The process tooling is fetched as a read-only copy at a specific commit, at a path the product's shims name. The session never attaches the process repository as a second working repository.
- For: Settings and hooks load reliably with one repository; two broke them. / The pinned commit guarantees every session in a tranche runs the same process code. / A product session cannot accidentally change the process.
- Against: Fetching the clone costs a few seconds at every session start. / A process fix requires moving the pin deliberately, MNT-5. / Process-side flaw reports have to travel by a separate route, MSG-5.

### PLT-8 — kept

- Statement: GitHub acts a session cannot take run on GitHub's runner by workflows with your tokens as secrets.
- Source: Requirements PLT-9; proven live on four runs.
- Evidence grade: measured. Suggested: keep. Reason given: Already working.
- Decision: kept, 2026-10-31 01:27 UTC. Tag: O
- Note: none
- Page explanation: Some GitHub operations, such as creating repositories, changing rulesets or deleting branches, cannot be done with a session's token. These run as workflows in the process repository using your tokens stored as secrets, one per owner account. The session triggers the workflow and reads its result.
- For: Already proven live on four runs. / Keeps powerful credentials out of sessions. / Workflow runs leave an audit trail.
- Against: Secrets must be rotated and scoped by you. / One more moving part, and the trigger call itself can be refused if made the wrong way. / A workflow's failure is only seen if the session reads the run result.

### PLT-9 — kept

- Statement: Every credential is gathered once before a product's first tranche and checked at every tranche open; a missing grant stops a tranche from opening, never a step midway.
- Source: Requirements PLT-10.
- Evidence grade: measured. Suggested: keep. Reason given: Cheap and already live.
- Decision: kept, 2026-10-31 01:27 UTC. Tag: C
- Note: none
- Page explanation: Before a product's first tranche, every token and permission the process will need is collected and recorded. At each tranche open, a command checks they are all present and valid. If one is missing, the tranche does not open. Nothing fails for a missing grant halfway through a layer.
- For: Fails early and cheaply instead of mid-job. / Already live. / Gives you one list of what the process can do with your accounts.
- Against: Grants can expire mid-tranche; the check at open does not catch that. / The list grows as the process adds capabilities, and each addition is an act of yours. / Checking validity may itself need calls the classifier judges.

### PLT-10 — kept

- Statement: A session's platform status is never read as its work state; the record is.
- Source: Requirements PLT-11 (idle-looking session had workers running).
- Evidence grade: measured. Suggested: keep. Reason given: Git is the truth.
- Decision: kept, 2026-10-31 01:28 UTC. Tag: O
- Note: none
- Page explanation: The platform reports whether a session is idle, running or archived. That is not the same as whether its work is done. The process reads work state only from git and GitHub, never from a session's platform status.
- For: An idle-looking session with background workers was already misread once. / Git is the single source of truth, which simplifies every reader. / No dependence on a status API that may change.
- Against: A truly dead session is detected later, through a stale record, rather than by a status check. / Needs the record to be complete enough to stand alone, REC-7.


## Hooks and enforcement

### ENF-1 — modified

- Statement: Hooks: remove all. Nothing refuses an act, holds a turn, records an act, or judges a message.
- Source: Requirements PLT-4 and your word of 30 Oct; research: a handful of deterministic command hooks for zero-exception rules is the field's practice, and forty is the smell.
- Evidence grade: convergent. Suggested: modify. Reason given: Suggest: at most a handful of command hooks, each for a zero-exception rule, each with a legitimate blocked exit; none that hold a turn or judge text.
- Decision: modified, 2026-10-31 01:28 UTC. Tag: X
- Note (copy of the suggestion): at most a handful of command hooks, each for a zero-exception rule, each with a legitimate blocked exit; none that hold a turn or judge text.
- Page explanation: Hooks are scripts Claude Code runs automatically around tool calls or at turn end. neoProcess used dozens to refuse acts, record acts, hold turns and judge messages. The 30 Oct draft says remove them all. The research says a very small number of deterministic command hooks, each for a rule with zero exceptions, is the field's working practice. The suggestion is the small number, not none.
- For: A command hook that blocks is the only truly deterministic enforcement inside a session. / A handful is maintainable; each fires rarely and for a clear reason. / Anthropic's diagnostic: if you keep adding emphasis to a text rule and it is still missed, it belongs in a hook.
- Against: Hooks vanished after a resume and did not run when the project directory was not the repository, so even a few are not fully reliable. / Every hook will occasionally fire wrongly and someone must maintain it. / A hook that blocks with no legitimate exit invites the model to route around it; each needs an exit path, ENF-7.

### ENF-2 — kept

- Statement: No model judge sits between a session's message and you.
- Source: Requirements MSG-5 (7 to 20 judge runs per message, true facts dropped).
- Evidence grade: measured. Suggested: keep. Reason given: Measured harm, no measured benefit.
- Decision: kept, 2026-10-31 01:29 UTC. Tag: X
- Note: none
- Page explanation: neoProcess ran a second model over each message a session wrote to you before you saw it, to check tone and accuracy. It ran up to twenty times per message and dropped true statements. This rule removes that layer: a session's message reaches you as written.
- For: Measured harm with no measured benefit. / Saves tokens and latency on every message. / You see what the session actually thinks.
- Against: You will see some poorly worded or overconfident messages. / Nothing catches a message that is simply wrong before it reaches you; the record and your reading do.

### ENF-3 — kept

- Statement: Nothing holds a turn. When you say stop, the session stops in that turn.
- Source: Requirements MSG-3 (turn-end hook held a session against STOP EVERYTHING).
- Evidence grade: measured. Suggested: keep. Reason given: Non-negotiable.
- Decision: kept, 2026-10-31 01:29 UTC. Tag: X
- Note: none
- Page explanation: A session ends its turn when it decides to, and when you say stop it stops in that same turn. No hook or script may refuse the end of a turn or demand acknowledgements before stopping.
- For: Your stop order was overridden once; this makes it impossible. / Avoids the platform's own eight-block limit games on Stop hooks. / The simplest possible contract with you.
- Against: A session can end a turn early with work half done; the record exposes it but nothing prevents it. / Relies on text nudges and status for persistence, SES-17.

### ENF-4 — dropped

- Statement: A PreToolUse hook refuses any read that stops short of a set document.
- Source: neoProcess page, Sessions rule 3.
- Evidence grade: single. Suggested: drop. Reason given: Hooks vanished after resume; reading is checked after the fact instead (REC-8).
- Decision: dropped, 2026-10-31 01:30 UTC. Tag: D
- Note: none
- Page explanation: neoProcess installed a hook that refused a Read call that did not cover a whole document in the session's reading set, to force reading in full. It was meant to stop skimming.
- For: The intent is right: partial reads were a real, silent problem under civicos. / When it ran, it did force full reads.
- Against: Hooks disappeared after a resume, so the guarantee was false. / It refused reads the process itself had ordered. / The real fix is shorter documents and after-the-fact audit, not a gate on a tool call.

### ENF-5 — dropped

- Statement: A Stop hook refuses a turn's end past the context threshold until a refresh is recorded.
- Source: neoProcess page, Sessions rule 5.
- Evidence grade: single. Suggested: drop. Reason given: Held sessions against you; threshold is printed by status instead (SES-3).
- Decision: dropped, 2026-10-31 01:31 UTC. Tag: D
- Note: none
- Page explanation: A hook read the session's context usage at each turn end and refused to let the turn end once the refresh threshold was passed, until a handoff was recorded. It was meant to force timely refreshes.
- For: Did catch a BOB that had run to two thirds of its window. / Mechanical rather than relying on the model to notice.
- Against: It held sessions against your explicit stop. / The platform overrides a Stop hook after eight consecutive blocks anyway. / Printing REFRESH from status, SES-4, gets most of the benefit without holding anything.

### ENF-6 — modified

- Statement: A separate small model checks after each turn whether the session's record reads finished and sends it back if not.
- Source: neoProcess page §8 'A session that stops early'; research: /goal and Stop-hook completion checks transfer, model judges do not.
- Evidence grade: single. Suggested: modify. Reason given: Suggest: native /goal with a mechanical condition (PR state on GitHub), no model judging the transcript.
- Decision: modified, 2026-11-03 20:00 UTC. Tag: X
- Note (written in by the coordinator): native /goal with a mechanical condition (PR state on GitHub), no model judging the transcript. Superseded by Bob's word, walk-through question 2, 1 Nov ("Yes, as recommended"): no /goal, since its check is a model reading the conversation; a stopped job is caught by status and the sweep. Recorded by the coordinator, 3 Nov, walk-through question 36.
- Page explanation: After each turn a separate small model checked whether the session's record showed a finished state or a named wait, and sent the session back to work if not. Claude Code now has a native /goal command that re-prompts a session until a condition it can check is met. The suggestion is to use /goal with a mechanical condition, such as a PR state on GitHub, and no model judging the transcript.
- For: Addresses the real problem of sessions stopping between acts. / Native /goal needs no hook of ours.
- Against: A model judging a transcript is non-deterministic and was seen to send a finished BOB back 28 times. / Re-prompting a confused session burns tokens on more confusion. / Only a mechanical condition makes this safe.

### ENF-7 — kept

- Statement: Every gate or hard rule offers the model a legitimate exit: 'blocked' or 'flag as impossible', recorded and visible to BOB.
- Source: Research: an explicit abort option cut test cheating from 54% to 9% for one model family.
- Evidence grade: measured. Suggested: keep. Reason given: A gate with no exit invites routing around it. New to the ledger.
- Decision: kept, 2026-10-31 01:33 UTC. Tag: O
- Note: none
- Page explanation: Whenever a gate or hard rule stops a session from doing something, there is a sanctioned way to say so: a blocked state it can set, recorded in the ledger and visible to BOB at the next status. The session is never left with only two options, succeed or cheat.
- For: Measured to cut test cheating sharply for at least one model family. / Gives BOB an honest signal instead of a disguised failure. / Costs one field in the ledger.
- Against: A lazy session may reach for blocked too readily; BOB must triage. / The effect was smaller for Claude models in the study, so the gain here is uncertain. / Needs a definition of what counts as legitimately blocked.


## The record

### REC-1 — modified

- Statement: Durable facts live on the tranche branch, transient ones on an orphan state branch deleted at each transition; nothing durable cites the state branch.
- Source: Requirements REC-1; neoProcess page §2; your report that civicos bookkeeping grew the repo to gigabytes.
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: keep the split, but move coordination traffic to PR bodies, comments and issues, or to a separate bookkeeping repository; add the size check in REC-10.
- Decision: modified, 2026-10-31 01:34 UTC. Tag: R
- Note (copy of the suggestion): keep the split, but move coordination traffic to PR bodies, comments and issues, or to a separate bookkeeping repository; add the size check in REC-10.
- Page explanation: neoProcess split the record: lasting facts such as reports and plans on the tranche branch; short-lived coordination such as who is where and what is open on a separate branch with no shared history, deleted at each transition. Civicos kept everything on the main branch and the repository grew to gigabytes. The suggestion keeps the split but asks whether PR bodies, comments and issues, or a separate bookkeeping repository, are simpler homes for the transient part.
- For: Transient noise never pollutes the product's history. / Deleting the state branch really frees the space. / Already partly built and proven.
- Against: Still one repository, so clones carry the state branch until it is deleted. / Two branches to reason about for every writer. / GitHub already offers free transient storage in PRs and issues, which may be simpler.

### REC-2 — kept

- Statement: One writer per file.
- Source: Requirements REC-2; no lost push recorded.
- Evidence grade: measured. Suggested: keep. Reason given: Simple and held.
- Decision: kept, 2026-10-31 01:34 UTC. Tag: R
- Note: none
- Page explanation: Each file in the record has exactly one role allowed to write it. BOB writes plan lines, a job writes its own job line, and so on. Two sessions never push conflicting edits to the same file.
- For: No lost pushes recorded under this rule. / Makes merge conflicts in the record impossible by construction. / Easy to check mechanically.
- Against: Requires designing the record so every fact has one natural owner. / A shared summary needs a tool to compose it from single-writer sources.

### REC-3 — kept

- Statement: One status command reads the whole state a role needs from git and prints it with sizes; a successor of any role starts from it alone.
- Source: Requirements REC-3 (seven cold handoffs worked).
- Evidence grade: measured. Suggested: keep. Reason given: The best tool the old design had.
- Decision: kept, 2026-10-31 01:35 UTC. Tag: R
- Note: none
- Page explanation: One command reads git and GitHub and prints everything a role needs: what is open, idle, merged, owed, and the sizes of what it will read. A new session of any role runs this first and needs nothing else to begin.
- For: Worked for every cold handoff on the 30th. / Code does not skim; the summary is complete every time. / Reduces the handoff document to a pointer set.
- Against: The command must be maintained as the record's shape changes. / Its output can grow long for a large tranche and needs its own size discipline. / A fact missing from status is invisible to the successor.

### REC-4 — kept

- Statement: Record writes by the architecture session never cost a job a gate run or a completion.
- Source: Requirements REC-4 (29 record-only merges into job branches in a day).
- Evidence grade: measured. Suggested: keep. Reason given: Path filter in CI does it.
- Decision: kept, 2026-10-31 01:35 UTC. Tag: X
- Note: none
- Page explanation: When BOB pushes a ruling or a plan line to the tranche branch, job branches do not re-run their gates. The gate's trigger ignores record paths, and a green job whose only difference from the tranche is record files merges as it stands.
- For: 29 unnecessary merges and 13-minute gate reruns in one day came from this. / A simple path filter in the workflow. / Keeps BOB free to write the record often.
- Against: Path filters must track where the record lives. / A record change that should affect code, such as a requirement edit, needs a separate route to trigger a job.

### REC-5 — kept

- Statement: A remote act is recorded as done only from the tool call's result, never from its request.
- Source: Requirements REC-5 (hook recorded refused acts as done).
- Evidence grade: measured. Suggested: keep. Reason given: Cheap correctness.
- Decision: kept, 2026-10-31 01:37 UTC. Tag: R
- Note: none
- Page explanation: When a session performs a remote act, such as creating a PR or sending a message, it writes the act into the record only after the tool returns success, never when it issues the request.
- For: A hook once recorded refused acts as done; this makes that impossible. / Zero cost.
- Against: A crash between result and record loses the record of a successful act; the next status should reconcile against GitHub.

### REC-6 — kept

- Statement: The address of any party is read from git at the moment of sending, and an address change is on that branch before it is announced.
- Source: Requirements REC-6; neoProcess page, Sessions rule 8.
- Evidence grade: measured. Suggested: keep. Reason given: Prevents the stale-address refusal seen on the 30th.
- Decision: kept, 2026-10-31 01:37 UTC. Tag: R
- Note: none
- Page explanation: Each role's current session address is stored in git. A sender reads it at the moment of sending, not from memory. When an address changes, the change is pushed before anyone is told about it.
- For: A product session rightly refused a message from an address not yet on main; this closes that gap. / Makes the two-phase handover of SES-2 safe. / Trivial to implement in the send command.
- Against: Requires a fetch before each send, a small cost. / If the address file is wrong, every sender is wrong together.

### REC-7 — kept

- Statement: The record of a halted build is complete: status on a fresh session tells everything open, idle, merged, unmerged and owed, with no transcript needed.
- Source: Requirements REC-7 (Civicsmith's halt was readable).
- Evidence grade: measured. Suggested: keep. Reason given: Already true once; keep it true.
- Decision: kept, 2026-10-31 01:37 UTC. Tag: R
- Note: none
- Page explanation: If a tranche is stopped for any reason, a fresh session running status must see everything: open PRs, idle sessions, merged and unmerged jobs, and anything owed. No one should need a transcript to resume.
- For: Already true at Civicsmith's halt. / Makes a halt safe, so you can stop freely. / Supports stateless resumption and PLN-5.
- Against: Every new kind of fact must be added to status or it becomes invisible. / Completeness is hard to test except by halting and resuming, which the shadow run should do.

### REC-8 — modified

- Statement: Reads are a matter of record: the start command prints the reading set with sizes and a worker audits transcripts after the fact for reads that stopped short.
- Source: Requirements REC-8, SES-9 (moderate confidence); research: no mechanical proof of attention exists.
- Evidence grade: proposed. Suggested: modify. Reason given: Suggest: keep the audit, but judge reading by what a session can cite from the end of a document, and shrink documents so the question rarely arises.
- Decision: modified, 2026-10-31 01:39 UTC. Tag: C
- Note (copy of the suggestion): keep the audit, but judge reading by what a session can cite from the end of a document, and shrink documents so the question rarely arises.
- Page explanation: The start command prints the documents a session is expected to read and their sizes. Later, a worker reads a sample of transcripts to find sessions that stopped reading a document early, and files a flaw report. This replaces the hook that refused partial reads. The suggestion adds a sharper test: whether a session can cite something from the end of a document.
- For: Checks results rather than blocking tools. / Builds a measured record of how often skimming actually happens. / Cheap when sampled.
- Against: Catches skimming after the damage, not before. / Transcripts show tool calls, not attention, so the audit is approximate. / The real remedy is shorter documents; the audit only tells you when they are still too long.

### REC-9 — kept

- Statement: The build ledger is a schema-constrained JSON file with one mutable field per entry (status), not free-form markdown that sessions may rewrite.
- Source: Research: Anthropic's harness uses a JSON feature list where agents may change only 'passes'; markdown plans decayed into 605 files in one documented case.
- Evidence grade: single. Suggested: keep. Reason given: Directly replaces prose plans and handoffs that bloated. New to the ledger.
- Decision: kept, 2026-10-31 01:40 UTC. Tag: R
- Note (owner's own words): Try this, but measure the experience with an open mind as to whether it's work or not.
- Page explanation: The list of modules or features to build is a structured file where each entry has fixed fields and one field, status, that later sessions may change. The model is far less likely to rewrite or lose structured entries than prose, and a diff of the ledger shows exactly what changed.
- For: Anthropic chose this after finding markdown plans decayed; one documented case had 605 decaying plan files. / A ledger diff is readable and reviewable by you. / Status can be derived into the handoff automatically.
- Against: Rests on two design anecdotes, not a controlled study. / Less expressive than prose; nuance goes to ADRs, REC-11. / A model can still edit the wrong field; a CI check on the ledger schema is needed.

### REC-10 — kept

- Statement: A CI check fails any commit that adds a file over a set size or under a path reserved for transients; a scheduled prune squashes the transient branch.
- Source: This week's discussion; neoProcess prune workflow; your report of gigabyte bloat under civicos.
- Evidence grade: measured. Suggested: keep. Reason given: Mechanical, cheap, and would have caught the bloat early.
- Decision: kept, 2026-10-31 01:41 UTC. Tag: C
- Note: none
- Page explanation: A CI check fails any commit that adds a file over a set size or writes under a path reserved for transient data. A scheduled workflow periodically squashes the transient branch to its current state so history does not accumulate.
- For: Would have caught the gigabyte bloat early. / Mechanical, cheap, no model involved. / The prune is already a neoprocess workflow.
- Against: A size limit will occasionally block a legitimate large file and needs an override path. / Pruning destroys history you might later want for forensics; keep an archive policy.

### REC-11 — kept

- Statement: Decisions go to short architecture decision records the moment they are made, each in its own file, never as a line in a long plan.
- Source: Research (INNOQ): 'Decisions need a visible home, not a line in a 1,000-line Markdown file.'
- Evidence grade: convergent. Suggested: keep. Reason given: Replaces the ruling log. New to the ledger.
- Decision: kept, 2026-10-31 01:42 UTC. Tag: R
- Note: none
- Page explanation: When BOB or you make a decision, it is written as a short architecture decision record: one file with a title, the context, the decision, and the consequences. Rulings never live as lines in a long log or plan.
- For: Decisions have a stable address that requirements can cite. / Easy to supersede explicitly rather than accrete. / A widely used format outside AI work.
- Against: Many small files to keep organised. / Requires discipline to fold an ADR's effect into the requirement text, REQ-7, or the ADRs become the new log.

### REC-12 — dropped

- Statement: A git-synced multi-writer issue tracker with a daemon and local database (Beads-style).
- Source: Research: author-documented data loss, 'overkill for a solo user'.
- Evidence grade: convergent. Suggested: drop. Reason given: Solves a multi-writer problem a solo owner does not have.
- Decision: dropped, 2026-10-31 01:43 UTC. Tag: D
- Note: none
- Page explanation: Beads and similar tools store issues as JSON lines in git with a local database and background syncing, so many agents on many machines share a tracker. Its author documented months of data loss and a difficult migration.
- For: Solves real coordination problems for teams of many parallel writers. / Git-native, so it fits the git-as-record philosophy.
- Against: The hard part it solves, many writers syncing, is not your situation. / Documented data loss, slowness and bloat. / GitHub issues and the ledger of REC-9 cover your need.


## Architecture and checks

### ARC-1 — kept

- Statement: Modules in one total order, each in one layer, lower first, uses declared and matched by imports; a violation fails the gate.
- Source: Requirements ARC-1; held live.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 01:44 UTC. Tag: C
- Note: none
- Page explanation: Every module sits in one layer and one position in a total order. Each module declares which earlier modules it uses, and a check confirms its imports match the declaration. A violation fails the gate.
- For: Working today. / Makes layer-by-layer building possible. / Prevents hidden coupling.
- Against: Reordering modules is expensive once code depends on the order. / The check can be strict about helper modules and needs a clear rule for them.

### ARC-2 — kept

- Statement: Each file has one owner module; a job writes only its module's paths and tests and the strike of its own marks.
- Source: Requirements ARC-2; held live.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 01:44 UTC. Tag: C
- Note: none
- Page explanation: Each source file belongs to one module. A job may write only its module's files and tests, plus the lines in the requirements file that mark its own requirements as met.
- For: Working today. / Makes parallel jobs safe from overwriting each other. / A simple check.
- Against: Shared files such as configuration need a designated owner. / A fix that spans modules needs two jobs or a BOB ruling.

### ARC-3 — kept

- Statement: A test asserts on a text's key, never on its words; every user-facing sentence lives once in the word table.
- Source: Requirements ARC-3; your word of 30 Oct.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 01:45 UTC. Tag: C
- Note: none
- Page explanation: User-facing text lives once in a word table, keyed by an id. Tests check that the right key was used, not the words. Only the words check compares actual text.
- For: Your ruling; changing wording never breaks tests. / Enables translation and a consistent voice. / Working today.
- Against: A wrong sentence under the right key passes every test; the words table must be reviewed by a person. / Slight indirection for anyone reading a test.

### ARC-4 — modified (against the suggestion: keep)

- Statement: The checks are scoped to a module in the gate and run whole once at a layer's close.
- Source: Requirements ARC-4.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: modified, 2026-10-31 02:05 UTC. Tag: C
- Note (owner's own words): The architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or when I ask for one.
- Page explanation: The architecture, ownership, format and coverage checks run only against the job's module in its gate, and run over the whole product once when a layer closes.
- For: Keeps gates fast. / Catches cross-module problems at layer close before they compound.
- Against: A problem introduced by one job may surface only at layer close, when its session is gone. / Layer close becomes a longer step.

### ARC-5 — kept

- Statement: Every check and gate finding names module, file and line in one machine-readable result that status reads; a red is never searched for in a log.
- Source: Requirements ARC-5, GAT-7 (gate logs read by hand on the 30th).
- Evidence grade: proposed. Suggested: keep. Reason given: Cheap to build, saves BOB context every time.
- Decision: kept, 2026-10-31 01:46 UTC. Tag: C
- Note: none
- Page explanation: Every check and gate writes its findings as structured data: module, file, line, rule. The status command and BOB read that, so no one scrolls a CI log to find why a gate went red.
- For: Gate logs were read by hand on the 30th to find one failure. / Saves BOB context on every red. / Enables counting findings per module over time.
- Against: Each check needs an output adapter. / Structured output can hide useful context that a raw log shows.


## Requirements

### REQ-1 — kept

- Statement: Each module's requirements file has a public part and a private part, every statement under a permanent id.
- Source: Requirements REQ-1; held.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 01:47 UTC. Tag: R
- Note: none
- Page explanation: Each module's requirements file has a public part describing its purpose and what it provides, and a private part listing what it uses, its invariants, which requirements it satisfies, and suggestions. Every statement has a permanent id.
- For: Working today. / Permanent ids let tests, plans and ADRs cite requirements. / The public and private split tells users what they may depend on.
- Against: A rigid format can be gamed by writing to the template rather than thinking. / Format checks need maintenance.

### REQ-2 — kept

- Statement: A requirement states behaviour at the interface, never an implementation; an ambiguity is removed by rewriting the text.
- Source: Requirements REQ-2 (16 rulings in a day were mostly this).
- Evidence grade: measured. Suggested: keep. Reason given: Principle behind the consolidation mechanism.
- Decision: kept, 2026-10-31 01:47 UTC. Tag: O
- Note: none
- Page explanation: A requirement says what a module does as seen from outside, not how. When a requirement is found ambiguous, the text is rewritten; a clarifying ruling is never attached beside it.
- For: Most of BOB's rulings on the 30th were exactly this and should have been edits. / Keeps the requirements file the single source. / Avoids the ruling log.
- Against: Rewriting shifts text under a job already working from the old wording; needs a notice. / Judging interface versus implementation takes skill and sometimes argument.

### REQ-3 — kept

- Statement: A figure at a scale beyond the suite is a measurement with its own plan id, never a Test line; a review never counts an untaken measurement as a gap.
- Source: Requirements REQ-3 (a job ran million-row fixtures in-session for hours).
- Evidence grade: measured. Suggested: keep. Reason given: Measured waste.
- Decision: kept, 2026-10-31 01:48 UTC. Tag: X
- Note: none
- Page explanation: If a requirement involves scale, such as a million rows, the suite proves the behaviour at a small size and the scale figure becomes a separate measurement item in the plan. A test line never names a huge fixture, and a reviewer never counts an untaken measurement as a gap.
- For: A job ran million-row fixtures in-session for hours because of this. / Keeps gates fast and suites honest about what they prove. / Measurements can be scheduled when infrastructure exists.
- Against: Scale bugs are found later, in measurement, not in the gate. / Needs a format rule and a reviewer brief that know the distinction.

### REQ-4 — kept

- Statement: A not-yet-met mark is struck only by the job that meets it, in its own commit.
- Source: Requirements REQ-4; held.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 01:48 UTC. Tag: R
- Note: none
- Page explanation: A requirement marked not-yet-met is changed to met only by the job that implements it, in that job's own commit. BOB never strikes a mark on a job's behalf.
- For: Working today. / The commit proves who claimed completion. / Keeps marks and code in the same diff.
- Against: If a job dies after meeting a requirement but before striking it, the successor must redo the strike. / A mark can be struck without the test proving the requirement; JOB-12 addresses that.

### REQ-5 — kept

- Statement: A change to what a provided service means goes to you only by the DES 1 test; every other change is BOB's, recorded once.
- Source: Requirements REQ-5.
- Evidence grade: measured. Suggested: keep. Reason given: Protects your time.
- Decision: kept, 2026-10-31 01:48 UTC. Tag: O
- Note: none
- Page explanation: A change that alters what a module promises to its users comes to you only when it changes what the product does for its users and the canon is silent. Everything else BOB decides, records once, and reports.
- For: Protects your time, the scarcest resource. / A clear test reduces argument about what is yours.
- Against: BOB will sometimes misjudge the test in both directions. / Decisions you would have wanted to see may be made without you.

### REQ-6 — modified

- Statement: Size of a module's requirements file: the 30 Oct draft says no limit, overrun reported; the 29 Oct page set a hard cap that refused 127 of 127 modules.
- Source: Requirements REQ-6 and SES-6; neoProcess page §8; research: numeric caps are tool limits, not quality thresholds, and should be alarms.
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: a cap that triggers a split or consolidation by BOB before any job starts, measured on the real product; never a refusal at a job's start.
- Decision: modified, 2026-10-31 01:50 UTC. Tag: X
- Note (copy of the suggestion): Suggest: a cap that triggers a split or consolidation by BOB before any job starts, measured on the real product; never a refusal at a job's start.
- Page explanation: The 29 Oct page set a hard byte cap on a module's requirements file and refused jobs above it, which refused every module. The 30 Oct draft removed the cap entirely and only reports overruns. The suggestion is a cap that triggers work for BOB, splitting the module or consolidating its requirements, before any job opens; never a refusal at a job's start.
- For: A cap is the only thing that forces consolidation to happen. / Your observation that neoProcess ensured every job knew what it needed came from the cap. / A trigger rather than a refusal never blocks a job.
- Against: Any number is arbitrary until measured on real jobs. / Consolidation is real work for BOB and may lose detail. / Research found no study tying instruction length to coding success, so the threshold is a judgment.

### REQ-7 — kept

- Statement: Only explicitly marked words of yours become decisions; a ruling lives only until the requirement it refines is rewritten to absorb it, then it is deleted.
- Source: This week's discussion; your report of 5,782 rulings in 34 days; research: corrections are made by adding prohibitions, not editing.
- Evidence grade: measured. Suggested: keep. Reason given: The missing mechanism behind REQ-2. New to the ledger.
- Decision: kept, 2026-10-31 01:50 UTC. Tag: X
- Note: none
- Page explanation: Only words you explicitly mark as a decision become rulings; your other remarks are input. A ruling exists only until the requirement or rule it refines is rewritten to absorb it, then it is deleted. There is no permanent log of rulings.
- For: Addresses the 5,782-ruling problem directly. / Research shows corrections are made by adding prohibitions, never editing; this forces editing. / Keeps every rule in one home.
- Against: Requires you to mark decisions, a small habit change. / History of why a rule changed lives only in git and ADRs, not in a readable log. / Someone must do the absorbing, and it is easy to defer.


## Planning

### PLN-1 — kept

- Statement: The structure is layers within rounds within tranches, and nothing else about a product's size or shape is assumed.
- Source: Requirements PLN-1; your word of 30 Oct.
- Evidence grade: measured. Suggested: keep. Reason given: Your constraint.
- Decision: kept, 2026-10-31 01:51 UTC. Tag: O
- Note: none
- Page explanation: Work is organised as tranches, each with rounds, each with layers that follow the module order. That structure is fixed. Nothing else about the product, such as how many modules or how large a file, is assumed.
- For: Your stated constraint. / A fixed structure lets the tool stay simple.
- Against: A product that does not fit layers well will fight the structure. / Three nested levels are more ceremony than a small product needs.

### PLN-2 — kept

- Statement: A plan is written from the work that remains; an entry is deferred only for one of three named reasons.
- Source: Requirements PLN-2; P19.
- Evidence grade: measured. Suggested: keep. Reason given: Held.
- Decision: kept, 2026-10-31 01:51 UTC. Tag: O
- Note: none
- Page explanation: A tranche plan lists all remaining work. An entry may be left out only for one of three reasons: a decision of yours not yet made, a deployment or measurement that cannot happen inside the tranche, or something outside the product that does not yet exist. The reason is written.
- For: Prevents quiet scope reduction. / Held so far. / Deferrals become reviewable.
- Against: Pushes toward large tranches, which take longer to close. / The three reasons may not cover every legitimate deferral.

### PLN-3 — kept

- Statement: Work found while a round runs is placed at once: in the running job, else a later layer's START, else the completion round.
- Source: Requirements PLN-3; held.
- Evidence grade: measured. Suggested: keep. Reason given: Held.
- Decision: kept, 2026-10-31 01:51 UTC. Tag: O
- Note: none
- Page explanation: When a job or review finds new work, it is placed immediately: into the running job if it fits, else into a later layer's START, else into the completion round. It never waits for the next tranche.
- For: Nothing found is lost. / Held on the 30th. / Keeps the plan current.
- Against: Can grow a running job beyond its budget. / BOB must triage every finding promptly.

### PLN-4 — kept

- Statement: The completion round has its own file, distinct from the next tranche's list.
- Source: Requirements PLN-4 (issue 73).
- Evidence grade: measured. Suggested: keep. Reason given: Small fix to a real confusion.
- Decision: kept, 2026-10-31 01:51 UTC. Tag: R
- Note: none
- Page explanation: The completion round, which gathers leftover work at the end of a tranche, has its own file that the tool opens, separate from the list of work for the next tranche.
- For: Fixes a real confusion from issue 73. / Trivial.
- Against: One more file.

### PLN-5 — kept

- Statement: Pause and resume are first class: your word is recorded once in the plan's Status line, every session reads it at its next status and takes no new step.
- Source: Requirements PLN-5 (three stops in an afternoon, one overridden by a hook).
- Evidence grade: measured. Suggested: keep. Reason given: Your most-used control.
- Decision: kept, 2026-10-31 01:51 UTC. Tag: O
- Note: none
- Page explanation: When you say pause or stop, BOB writes that word once in the plan's status line. Every session checks it at its next status and takes no new step while it stands. Resume clears it. A fresh session after a pause continues from the record alone.
- For: Your most used control, and it was once overridden. / Simple, text-based, visible to all. / Pairs with REC-7 for safe resumption.
- Against: A session mid-step finishes the step before seeing the pause. / Depends on every session running status before acting, a text rule.

### PLN-6 — kept

- Statement: A tranche's report states elapsed time, work finished, deferrals with reasons, work left, cost, and the share of cost that was process overhead.
- Source: Requirements PLN-6, SES-12.
- Evidence grade: measured. Suggested: keep. Reason given: Overhead went unmeasured until the post-mortem.
- Decision: kept, 2026-10-31 01:52 UTC. Tag: M
- Note: none
- Page explanation: At tranche close BOB reports elapsed time, work finished, deferrals with reasons, work left, total cost, and how much of the cost was the process's own overhead rather than product work.
- For: Overhead was unmeasured until a post-mortem counted by hand. / Gives you a number to judge the process by. / Pairs with SES-11.
- Against: Attributing cost to overhead versus product is partly judgment. / Needs usage data per session, which SES-9 may not always have.

### PLN-7 — kept

- Statement: Two products may run tranches at once on one account; nothing in the process names a product.
- Source: Requirements PLN-7.
- Evidence grade: proposed. Suggested: keep. Reason given: Already your situation.
- Decision: kept, 2026-10-31 01:52 UTC. Tag: O
- Note: none
- Page explanation: The process assumes nothing about which product it serves. Two products can run tranches on one account at once, with every record path under each product's own repository.
- For: Your current situation. / Prevents hard-coded names leaking in.
- Against: Shared account rate limits are split between products. / Needs a shadow run with two product copies to confirm.


## Jobs

### JOB-1 — kept

- Statement: A job is a draft pull request from job/<module> to the tranche branch whose body is its START; its report is a comment; its merge is its completion.
- Source: Requirements JOB-1; neoProcess page §4; four PRs merged this way.
- Evidence grade: measured. Suggested: keep. Reason given: GitHub as the state machine.
- Decision: kept, 2026-10-31 01:52 UTC. Tag: O
- Note: none
- Page explanation: A job's branch, draft pull request, body, comments and merge are its record. The START goes in the PR body, the report is a comment, the gate is the PR's checks, and merging the PR is what completion means.
- For: Proven on four PRs. / GitHub stores and displays the whole record for free. / Branch protection enforces the gate.
- Against: PR bodies and comments are a second place the record lives, beside git. / GitHub's API and interface shape the process more than a plain file would.

### JOB-2 — kept

- Statement: A START names only acts the tool supports, each as the command the job runs.
- Source: Requirements JOB-2 (a START ordered a merge the hooks refused).
- Evidence grade: measured. Suggested: keep. Reason given: Cheap.
- Decision: kept, 2026-10-31 01:53 UTC. Tag: O
- Note: none
- Page explanation: The instructions a job receives list only acts the process tool can perform, each written as the exact command to run. A START never asks for something the tooling cannot do.
- For: A START once ordered a merge the hooks refused, and the job copied the diff by hand. / Keeps jobs on the paved path.
- Against: Limits what a job can be asked to do to what the tool supports. / The START generator must be kept in step with the tool.

### JOB-3 — kept

- Statement: A module's earlier unmerged work is taken in by a tool command on the job's own branch.
- Source: Requirements JOB-3.
- Evidence grade: measured. Suggested: keep. Reason given: Prevents hand-copied diffs.
- Decision: kept, 2026-10-31 01:53 UTC. Tag: O
- Note: none
- Page explanation: If a module has unmerged work from an earlier attempt, the new job pulls it onto its own branch with one tool command rather than by hand.
- For: Preserves history instead of copied diffs. / A simple command.
- Against: Conflicts between old work and the current tranche still need judgment.

### JOB-4 — kept

- Statement: A job is never restarted for a process reason; a blocking flaw holds it at its next command, the fix lands, the same job continues.
- Source: Requirements JOB-4 (16 sessions for 5 jobs).
- Evidence grade: measured. Suggested: keep. Reason given: Largest single overhead measured.
- Decision: kept, 2026-10-31 01:53 UTC. Tag: X
- Note: none
- Page explanation: If a process flaw blocks a job, the job stops at its next command, the fix lands and the pin moves, and the same job continues from its branch. If a flaw does not block it, the job finishes. A job session that dies is replaced by one that continues from the branch and PR with a short brief, not a full re-read.
- For: Sixteen sessions for five jobs, with full re-reads and gate runs each time. / Resolves the conflict you named between fixing flaws and not restarting. / Works because the tool is a fresh program at each command.
- Against: A job that continues after a process change runs partly under old and partly under new behaviour. / A replacement session with a brief rather than a full read may miss context.

### JOB-5 — kept

- Statement: A job's completion runs locally only checks that take seconds; the gate is CI. It pushes, posts the report, marks the PR ready, sets COMPLETE.
- Source: Requirements JOB-5.
- Evidence grade: measured. Suggested: keep. Reason given: Follows from PLT-4.
- Decision: kept, 2026-10-31 01:54 UTC. Tag: X
- Note: none
- Page explanation: When a job finishes, it runs only fast local checks such as ownership, format and its own suite if under a minute, then pushes, posts its report, marks the PR ready and sets COMPLETE. The full gate runs in CI.
- For: Follows from the time limit. / Fast feedback for the obvious errors. / Keeps the session clean.
- Against: A job may declare COMPLETE and then fail the CI gate, requiring a return trip. / Deciding what counts as fast is a judgment.

### JOB-6 — kept

- Statement: An unmerged job whose session is gone is restartable by one command that keeps its branch and PR.
- Source: Requirements JOB-6.
- Evidence grade: measured. Suggested: keep. Reason given: Cheap.
- Decision: kept, 2026-10-31 01:54 UTC. Tag: O
- Note: none
- Page explanation: If a job's session is gone but its PR is unmerged, one command starts a new session that continues on the same branch and PR.
- For: Cheap, and the case has already happened. / No lost branch or history.
- Against: The new session needs a good brief; see JOB-4.

### JOB-7 — modified

- Statement: A job's report carries Met, Evidence and what it found elsewhere; a flaw in another module goes to BOB as a report.
- Source: Requirements JOB-7; research: self-reports were false about one in eleven times even inside a harness.
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: Evidence is a machine-readable receipt (command, exit code, git SHA, and an explicit not-verified list), never prose.
- Decision: modified, 2026-10-31 01:55 UTC. Tag: R
- Note (copy of the suggestion): Suggest: Evidence is a machine-readable receipt (command, exit code, git SHA, and an explicit not-verified list), never prose.
- Page explanation: A job's report lists which requirements are met, the evidence, and anything found in other modules. The suggestion is that evidence be a machine-readable receipt: the exact commands run, their exit codes, the git SHA they ran against, and an explicit list of what was not verified.
- For: Self-reports were false about one in eleven times even in a harness that re-verified. / A receipt can be checked by CI and by you without reading prose. / The not-verified list makes honest incompleteness visible.
- Against: Receipts can be fabricated too; CI re-running them is the real check. / More structure for the job to produce. / Prose findings about other modules still need a home.

### JOB-8 — kept

- Statement: A job never commits a generated artifact.
- Source: Requirements JOB-8; neoProcess page §9 (two jobs of a layer conflict on it).
- Evidence grade: measured. Suggested: keep. Reason given: Held.
- Decision: kept, 2026-10-31 01:55 UTC. Tag: C
- Note: none
- Page explanation: Build outputs, generated code and other derived artifacts are never committed by a job. The gate regenerates what it needs and the layer close commits them once.
- For: Two jobs in a layer would conflict on the same artifact otherwise. / Smaller diffs.
- Against: Layer close has more to do. / Some artifacts are slow to regenerate on every gate run.

### JOB-9 — kept

- Statement: A job ends a turn only COMPLETE or on a named wait with everything pushed; nothing enforces this but the rule and the record.
- Source: Requirements JOB-9.
- Evidence grade: proposed. Suggested: keep. Reason given: Labelled nudge; the record exposes a violation at BOB's next status.
- Decision: kept, 2026-10-31 01:56 UTC. Tag: O
- Note: none
- Page explanation: A job ends a turn only when it is complete or when it is waiting on something it names, with everything pushed. Nothing enforces this except the rule and the fact that BOB's next status shows a WORKING job with nothing pushed.
- For: No hook needed. / The record makes violations visible.
- Against: It is a nudge, and the research shows restraint rules are weakly followed. / Detection waits for BOB's next status.

### JOB-10 — kept

- Statement: A job's reading set is recorded at its start and its tokens at its end, per attempt, so restarts are never counted as jobs.
- Source: Requirements JOB-10.
- Evidence grade: proposed. Suggested: keep. Reason given: Needed for PLN-6.
- Decision: kept, 2026-10-31 01:56 UTC. Tag: M
- Note: none
- Page explanation: At start, a job's reading set and its size are recorded. At end, its token usage is recorded. Each attempt is its own row, so a restarted job is not counted as a new job.
- For: Needed to compute cost per merged PR honestly. / Cheap to record.
- Against: Usage may be unmeasurable by an allowed route, SES-9. / More rows in the metrics.

### JOB-11 — kept

- Statement: Each job runs in its own checkout with a turn cap and a dollar budget cap set at start.
- Source: Research: per-job isolation and budget caps are the vendor checklist for unattended runs.
- Evidence grade: convergent. Suggested: keep. Reason given: Cloud sessions already isolate; the caps are new to the ledger.
- Decision: kept, 2026-10-31 01:57 UTC. Tag: rep
- Note: none
- Page explanation: Each job runs in its own isolated checkout, which cloud sessions already provide, with a cap on the number of turns and a dollar budget set when it starts.
- For: Bounds the cost of a job that goes wrong. / Standard vendor guidance for unattended runs.
- Against: A cap hit mid-job leaves work in an odd state; the job must push before stopping. / Setting caps needs a cost model you do not yet have.

### JOB-12 — kept

- Statement: A revert check in CI: with the production change reverted, the job's new tests must fail. Inert tests fail the gate.
- Source: Research: Claude's test-gaming mode is editing tests over 79% of the time; 3 of 5 overnight completions shipped inert tests in one field log.
- Evidence grade: measured. Suggested: keep. Reason given: Closes the weak-test gap when the job writes both code and tests. New to the ledger.
- Decision: kept, 2026-10-31 01:57 UTC. Tag: C
- Note: none
- Page explanation: In CI, after the job's tests pass, the production change is reverted and the job's new tests run again. They must fail. If they still pass, they do not test the change, and the gate goes red.
- For: Directly catches inert tests, which were 3 of 5 in one documented overnight run. / Claude models game tests mainly by editing them; this catches a test that tests nothing. / Cheap: one extra test run per PR.
- Against: Some legitimate changes, such as refactors, have tests that pass before and after; needs an exemption path. / Checks only the job's new tests, not weakened old ones. / Doubles test time in the gate.

### JOB-13 — modified

- Statement: Mutation sampling on critical paths runs nightly as its own workflow, never per PR.
- Source: Research: 100% line coverage with a 4% mutation score in one case; Meta's mutation-based hardening scaled.
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: later, after the first tranche, on payment and data paths only.
- Decision: modified, 2026-10-31 01:57 UTC. Tag: C
- Note (copy of the suggestion): Suggest: later, after the first tranche, on payment and data paths only.
- Page explanation: Mutation testing changes the code in small ways and checks that tests fail. Run nightly on critical paths such as payments and data, it measures whether tests actually constrain the code. The suggestion is to add it after the first tranche, not during.
- For: Coverage is an anti-signal when the same agent wrote code and tests; mutation score is not. / Nightly keeps it off the critical path.
- Against: Slow and noisy; needs tuning. / Another workflow to maintain. / Better after the first tranche than during it.

### JOB-14 — modified (against the suggestion: keep)

- Statement: Unit of work is one module or one feature per session; after two failed corrections, start a fresh session with a better brief rather than a third correction.
- Source: Research: vendor guidance and convergent practitioners; unit size is model-dependent.
- Evidence grade: convergent. Suggested: keep. Reason given: Matches JOB-1 and bounds the forgetting problem.
- Decision: modified, 2026-10-31 02:00 UTC. Tag: X
- Note (owner's own words): As suggested (keep) but the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail.
- Page explanation: A job covers one module or one feature. If a job needs correcting twice and is still wrong, the session is ended and a new one started with a better brief rather than a third correction.
- For: Bounds how much a session can forget. / Convergent practitioner advice. / Keeps PRs reviewable.
- Against: The unit size that fits one session changes with each model. / Starting over loses whatever the session had learned.


## The gate

### GAT-1 — kept

- Statement: The gate runs in CI, once per pull request tip, and never in a session.
- Source: Requirements GAT-1; your word of 30 Oct.
- Evidence grade: measured. Suggested: keep. Reason given: Settled.
- Decision: kept, 2026-10-31 02:01 UTC. Tag: X
- Note: none
- Page explanation: The gate, the full set of checks and tests for a PR, runs as a GitHub Actions workflow once for each new commit on the PR. No session ever runs the gate itself.
- For: Your word that per-command checks were crippling. / Durable logs, status checks, branch protection. / Frees the session's time limit.
- Against: Latency between push and verdict. / CI cost.

### GAT-2 — kept

- Statement: The gate runs the module's own suite, its layer's tests if any, and the checks scoped to the module. It never runs another module's suite.
- Source: Requirements GAT-2 and the P11 change (31 user suites per events job).
- Evidence grade: measured. Suggested: keep. Reason given: Your ruling; measured cause of 30-minute gates.
- Decision: kept, 2026-10-31 02:01 UTC. Tag: X
- Note: none
- Page explanation: The gate runs the module's own tests, its layer's tests if the product has them, and the checks scoped to the module. It does not run the suites of modules that use this one.
- For: Your ruling. / Gates went from half an hour to minutes. / A change that breaks users is caught by their own jobs, GAT-3.
- Against: A breaking change to a provided service merges green and is found later. / Depends on the requirement-notice route to users working.

### GAT-3 — kept

- Statement: A change to a provided service reaches its users through the architecture session's requirement notice and each user module's own job.
- Source: Requirements GAT-3.
- Evidence grade: proposed. Suggested: keep. Reason given: Follows from GAT-2.
- Decision: kept, 2026-10-31 02:02 UTC. Tag: O
- Note: none
- Page explanation: When a module changes what it provides, BOB issues a requirement notice and each user module gets an entry in its own job to adapt and prove it. The provider's gate does not run the users' tests.
- For: Keeps responsibility with the module that must change. / Scales with the number of users without slowing the provider.
- Against: The product is briefly inconsistent between the provider merge and the users' jobs. / BOB must not miss a user.

### GAT-4 — kept

- Statement: The gate regenerates every listed artifact and verifies only those the regeneration changed.
- Source: Requirements GAT-4.
- Evidence grade: measured. Suggested: keep. Reason given: Small, measured.
- Decision: kept, 2026-10-31 02:02 UTC. Tag: C
- Note: none
- Page explanation: The gate regenerates every listed artifact and compares; only artifacts the regeneration changed are checked further.
- For: A small, measured fix. / Saves gate time.
- Against: Depends on deterministic generation.

### GAT-5 — kept

- Statement: The gate installs every lock file the product has, where it sits, and runs the product's Node version.
- Source: Requirements GAT-5; proven live.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 02:03 UTC. Tag: C
- Note: none
- Page explanation: The gate installs dependencies from every lock file the product has, in the directories where they live, and runs the product's declared Node version.
- For: Proven live on Civicsmith with nine lock files. / Prevents a class of false reds.
- Against: Install time per gate run; caching helps.

### GAT-6 — kept

- Statement: The gate is triggered only by changes under the module's paths, tests, check inputs and generated inputs; a green tip behind the tranche only by record paths merges as it stands.
- Source: Requirements GAT-6, INT-3.
- Evidence grade: measured. Suggested: keep. Reason given: Pair with REC-4.
- Decision: kept, 2026-10-31 02:03 UTC. Tag: X
- Note: none
- Page explanation: The gate runs only when files under the module's paths, its tests, the files the checks read, or generated inputs change. Record files never trigger it. A green PR that differs from the tranche only by record files merges without a rerun.
- For: Pairs with REC-4 to stop the 29 unnecessary reruns. / A simple workflow filter.
- Against: Filters must track the record's layout. / A change that should have triggered but was filtered goes unnoticed until layer close.

### GAT-7 — kept

- Statement: The full product regression runs only at a release or on your word, as its own workflow with its own time budget.
- Source: Requirements GAT-8.
- Evidence grade: proposed. Suggested: keep. Reason given: Never reached yet; cheap to define.
- Decision: kept, 2026-10-31 02:03 UTC. Tag: X
- Note: none
- Page explanation: The entire product's test suite runs only when a release is cut or when you ask, as its own workflow with its own time budget.
- For: Keeps regular gates fast. / Release is where it matters most.
- Against: Cross-module regressions can live for a whole tranche. / Never yet reached, so untested.

### GAT-8 — kept

- Statement: The gate runs again on the merged result before the tool merges, and the tool merges only a green, current tip.
- Source: neoProcess page, Integration rules 3 and 5; Requirements INT-3.
- Evidence grade: measured. Suggested: keep. Reason given: Branch protection is the last word.
- Decision: kept, 2026-10-31 02:05 UTC. Tag: C
- Note: none
- Page explanation: Before merging, the PR's branch is brought up to date with the tranche and the gate runs again on that result. The tool merges only a PR that is green and current.
- For: Prevents two green PRs that break each other when combined. / Standard merge-queue behaviour, done by the tool because GitHub's queue needs an organisation account.
- Against: Extra gate run per merge. / Serialises merges within a layer.


## Integration and review

### INT-1 — kept

- Statement: Done means merged: a job by its PR into the tranche branch, a tranche by one PR into main; main never moves while a tranche runs.
- Source: Requirements INT-1; P12.
- Evidence grade: measured. Suggested: keep. Reason given: Core.
- Decision: kept, 2026-10-31 02:06 UTC. Tag: O
- Note: none
- Page explanation: A job is done when its PR is merged into the tranche branch. A tranche is done when its branch is merged into main by one PR. Main does not move while a tranche runs.
- For: Unambiguous and mechanically checkable. / Protects main.
- Against: Hotfixes to main during a tranche need a defined route.

### INT-2 — kept

- Statement: BOB decides per merge, from listed reasons and cost, whether a fresh reviewer runs; the reviewer never saw the job and reports gaps against requirements with file and line.
- Source: Requirements INT-2; neoProcess page; research: fresh-context review adds 3 to 25 points depending on generator strength, about 148K tokens per review.
- Evidence grade: measured. Suggested: keep. Reason given: Your per-merge cost judgment is what the evidence supports.
- Decision: kept, 2026-10-31 02:06 UTC. Tag: C
- Note: none
- Page explanation: Before merging, BOB decides whether a fresh reviewer is worth the cost, based on listed reasons such as a new module, a changed service, a sensitive path or thin evidence. If so, a worker that never saw the job reads the code against the requirements and reports gaps with file and line.
- For: Measured gains of 3 to 25 points depending on how strong the generator was. / A reviewer with no shared context avoids self-grading bias. / Cost per review is known, about 148K tokens, so the trade is explicit.
- Against: Gains shrink to a few points for strong models. / Over half of in-the-wild AI review comments were rejected as noise. / BOB's judgment of when to review is itself a judgment.

### INT-3 — kept

- Statement: Review findings feed back to the job as diagnosis; review is never the merge gate. Branch protection plus your approval is the last word.
- Source: Research: LLM judges did not exceed 0.65 AUROC on false success; 56% of in-the-wild AI review comments rejected.
- Evidence grade: measured. Suggested: keep. Reason given: Separates what review is good at from what it is not. New to the ledger.
- Decision: kept, 2026-10-31 02:08 UTC. Tag: rep
- Note: none
- Page explanation: What a reviewer finds goes back to the job as a list of things to fix. The reviewer's approval is never what allows a merge. Branch protection, with a required green check and your approval where you want it, is the last word.
- For: Model judges did not reliably detect false success in studies. / Keeps the mechanical gate mechanical. / Review value is in diagnosis, where it measured well.
- Against: You become the approver for every merge unless you delegate that to the green check alone. / A good review that finds nothing adds cost with no visible output.

### INT-4 — modified (against the suggestion: keep)

- Statement: A layer closes when every PR is merged and the checks pass once over the product; the next layer starts at once.
- Source: Requirements INT-4.
- Evidence grade: proposed. Suggested: keep. Reason given: Never reached on the product; keep the definition.
- Decision: modified, 2026-11-03 20:00 UTC. Tag: C
- Note (written in by the coordinator): Bob's word, walk-through question 3, 1 Nov ("Yes, as recommended"), with his ARC-4 note: a layer closes when every PR is merged and the layer's checks pass; whole-product checks run before a release or when Bob asks; the next layer starts at once. Recorded by the coordinator, 3 Nov, walk-through question 36.
- Page explanation: A layer closes when every PR in it is merged and the whole-product checks pass once. The next layer starts immediately, without waiting.
- For: A clear definition. / No idle time between layers.
- Against: Never reached on the product yet. / Whole-product checks at close may be slow for 128 modules.

### INT-5 — kept

- Statement: Nothing in a merge or close depends on archiving a session; retirement of a job is a record line.
- Source: Requirements INT-6.
- Evidence grade: measured. Suggested: keep. Reason given: Follows from PLT-2.
- Decision: kept, 2026-10-31 02:09 UTC. Tag: X
- Note: none
- Page explanation: Merging, closing and retiring a job never wait on archiving a session. Retirement is a line in the record. A session's usage is read by an allowed route or recorded as unmeasured.
- For: Follows from the classifier rule. / Idle sessions cost nothing.
- Against: Idle sessions accumulate in your session list. / Usage data may be lost without the archive route.

### INT-7 — kept

- Statement: A review reports everything it finds in one pass, every gap with file and line, so a job never fails review repeatedly for things visible the first time; the second run only confirms.
- Source: Your addition, 31 Oct; research: about 148K tokens per review round and most review value is in diagnosis.
- Evidence grade: single. Suggested: keep. Reason given: Turns review from a serial gate into one complete diagnosis. New to the ledger.
- Decision: kept, 2026-10-31 02:10 UTC. Tag: X
- Note: none
- Page explanation: A review is one complete pass. When the reviewer finds anything missing or flawed, it reports every gap it can find against the requirements in that one report, with file and line for each, rather than stopping at the first problem. The job fixes the whole list and the review runs again only to confirm, so a job does not fail review several times in a row for things that were visible the first time.
- For: Each review round costs about 148K tokens and a job turn; one complete pass is far cheaper than three partial ones. / The job sees the full shape of what is wrong and can fix related gaps together. / A complete list is reviewable by you as one document.
- Against: A reviewer told to find everything will find more, including trivia; the brief must scope out style and nitpicks. / Some gaps only become visible after earlier ones are fixed, so a second substantive round can still happen. / Longer reports cost more tokens per round even when few gaps exist.

### INT-6 — dropped

- Statement: A mandated test-first red step inside the agent's loop.
- Source: Research: one small experiment found no mutation-score gain at 3 to 8 times the tokens, with agents faking the red step; endorsements are anecdotal.
- Evidence grade: single. Suggested: drop. Reason given: Tests as back-pressure stay (GAT, JOB-12); the ritual does not.
- Decision: dropped, 2026-10-31 02:11 UTC. Tag: D
- Note: none
- Page explanation: Requiring the agent to write a failing test first, see it fail, then write the code. One controlled experiment found no quality gain at several times the token cost, with agents faking the red step. Many practitioners endorse it from experience.
- For: Strong intuitive case and long practitioner support. / Forces thinking about the interface first.
- Against: The one measurement found no mutation-score gain at 3 to 8 times the tokens. / Agents skipped or faked the red step when told to do it. / Tests as a gate, plus the revert check, capture the benefit without the ritual.


## Sessions and roles

### SES-1 — modified

- Statement: Roles: ROOT as a depth-0 starter that does nothing else; one architecture session (BOB) per product; jobs; workers.
- Source: Requirements SES-1; civicos-process; research: spawn, archive and merge authority should sit with a human or a deterministic script, never a model.
- Evidence grade: convergent. Suggested: modify. Reason given: Suggest: ROOT's creation of sessions moves to a scheduled task that creates a fresh session on each firing where possible; ROOT as a session only where a message must be answered.
- Decision: modified, 2026-10-31 02:12 UTC. Tag: S
- Note (copy of the suggestion): Suggest: ROOT's creation of sessions moves to a scheduled task that creates a fresh session on each firing where possible; ROOT as a session only where a message must be answered.
- Page explanation: ROOT is a session at depth 0 that only starts other sessions. BOB is the one architecture session per product. Jobs are short sessions per module. Workers are in-session subagents. The suggestion moves ROOT's session creation to a scheduled task that creates a fresh session on each firing wherever possible, keeping ROOT as a session only where a message must be answered promptly.
- For: A scheduled task is deterministic; a ROOT session is a model that can forget or stall. / Spawn authority sits with the platform's scheduler, not a model. / Fewer long-lived sessions to maintain.
- Against: Scheduled tasks fire on a schedule, not on demand, so a refresh may wait up to the interval. / Your civicos ROOT worked well; this changes a working part. / A task's fresh session must find everything in git, which it should anyway.

### SES-2 — kept

- Statement: The civicos two-phase handover: ROOT creates the new BOB and repoints the address; the new BOB sets up, reads its handoff, reports running and drains queued messages; the old BOB waits for its workers, forwards, reports ready; ROOT archives it.
- Source: Your description, 30 Oct; worked under civicos-process.
- Evidence grade: single. Suggested: keep. Reason given: Keep as is, with the archive as optional housekeeping nothing waits on.
- Decision: kept, 2026-10-31 02:12 UTC. Tag: S
- Note: none
- Page explanation: To refresh BOB: ROOT creates the new session and points the address at it. The new BOB sets up, reads its handoff, tells ROOT it is running, and drains messages queued during startup. The old BOB waits for its workers, forwards anything it receives, tells ROOT it is ready, and ROOT archives it. The suggestion keeps all of this, with the archive as housekeeping that nothing waits on.
- For: Worked under civicos-process. / Exactly one owner of the address at every moment. / Nothing in flight is lost.
- Against: The final archive is classifier-gated and may be refused; harmless if nothing waits on it. / Depends on ROOT being alive and responsive. / More steps than a stateless design would need.

### SES-3 — kept

- Statement: A refresh handoff is written by the tool from git, never by hand, at most one screen, a pointer set not a narrative.
- Source: Requirements SES-2; neoProcess page (4 KB, ten lines of prose); your report of massive civicos handoffs.
- Evidence grade: measured. Suggested: keep. Reason given: Status is the handoff's real body.
- Decision: kept, 2026-10-31 02:12 UTC. Tag: R
- Note: none
- Page explanation: When a role refreshes, the tool writes the handoff from git: what is open, what is owed, what changed, and where to look, plus a few lines of prose for what no file says. Never written by hand and never longer than a screen.
- For: Civicos handoffs became massive and were skimmed; neoProcess's 4 KB handoffs worked. / Status is the real body; the handoff is a pointer set. / Enforceable by a size check in the tool.
- Against: Nuance the outgoing session had is lost unless it wrote it to an ADR or the record first. / The few prose lines are still a model's summary and carry the trust problem.

### SES-4 — kept

- Statement: The refresh threshold is read from get_session by status and printed as REFRESH when passed; the rule is text, not a hook.
- Source: Requirements SES-3.
- Evidence grade: measured. Suggested: keep. Reason given: Labelled nudge with a mechanical trigger.
- Decision: kept, 2026-10-31 02:13 UTC. Tag: M
- Note: none
- Page explanation: The status command reads the session's context usage from the platform and prints REFRESH when it passes the role's threshold. The session is expected to act on it. No hook enforces it.
- For: Mechanical trigger, text response, no holding. / Thresholds live in one table.
- Against: A session may ignore the print; a BOB once ran to two thirds of its window. / The usage route must stay an allowed call, which it is today.

### SES-5 — kept

- Statement: Each role's reading set is fixed in advance and printed with sizes at its start.
- Source: Requirements SES-4; neoProcess page §5 (cut BOB's starting context by about a third).
- Evidence grade: measured. Suggested: keep. Reason given: The part of the neoProcess cap idea that worked.
- Decision: kept, 2026-10-31 02:13 UTC. Tag: R
- Note: none
- Page explanation: Each role has a predetermined list of documents it reads at start. The start command prints the list with sizes so the reading load is known before the session begins.
- For: The part of the neoProcess cap that worked: every job knew what it needed. / Makes reading load measurable per role.
- Against: Fixed sets go stale as the product changes. / Sizes printed are not sizes read; REC-8 covers that gap.

### SES-6 — kept

- Statement: Budgets are fractions of the model's context window, named in one table, never bytes fixed in code; an overrun is measured and reported, never refused.
- Source: Requirements SES-5, SES-6; your word of 30 Oct.
- Evidence grade: measured. Suggested: keep. Reason given: Pairs with REQ-6.
- Decision: kept, 2026-10-31 02:13 UTC. Tag: X
- Note: none
- Page explanation: Reading budgets are expressed as a fraction of the model's context window, in one table, never as a byte count in code. A reading set over budget is measured, recorded with cost, reported in the tranche report, and never refused.
- For: A byte cap set at 4 percent of the window refused every module. / Adjusts automatically when models change. / Overruns become data rather than failures.
- Against: Without any refusal, nothing forces action on a chronic overrun except your reading the report. / A fraction is still a chosen number.

### SES-7 — kept

- Statement: A summary for a task is an option BOB may take, written by workers citing sources, never required by the tool.
- Source: Requirements SES-7 (39 forced summary commits).
- Evidence grade: measured. Suggested: keep. Reason given: Measured waste.
- Decision: kept, 2026-10-31 02:14 UTC. Tag: X
- Note: none
- Page explanation: If a reading set is far over budget, BOB may have workers write a summary citing sources, but the tool never requires one before a job can start.
- For: 39 forced summary commits were pure overhead. / Leaves the judgment with BOB.
- Against: Summaries written by workers carry the same trust problem as handoffs. / Without a cap trigger, REQ-6, the option may never be exercised.

### SES-8 — modified (against the suggestion: keep)

- Statement: Models and effort come from one table, picked by the start command; always a model and effort sufficient for quality.
- Source: Requirements SES-8; neoProcess page §1 values.
- Evidence grade: measured. Suggested: keep. Reason given: Your policy.
- Decision: modified, 2026-10-31 02:15 UTC. Tag: S
- Note (owner's own words): Models, effort, and permissions mode come from one table, picked by the start command; always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand.
- Page explanation: Which model and effort level each kind of session uses is written in one table and selected by the start command. Your policy is always enough model for quality work.
- For: Your policy; drift to cheaper models was seen under civicos. / One place to change.
- Against: Model names and capabilities change often; the table needs dates. / The cost of always using strong models is real and should be measured.

### SES-9 — kept

- Statement: A session's usage is read by an allowed route; where none exists it is named unmeasured, never estimated.
- Source: Requirements SES-10.
- Evidence grade: measured. Suggested: keep. Reason given: Honest accounting.
- Decision: kept, 2026-10-31 02:16 UTC. Tag: M
- Note: none
- Page explanation: Token usage per session is read through a platform route that passes reliably. Where no such route exists, the metric is recorded as unmeasured rather than estimated.
- For: Honest accounting. / Avoids archive-based usage, which failed.
- Against: Gaps in cost data until a route is found. / PLN-6's overhead share is weaker without it.

### SES-10 — kept

- Statement: Workers run in the background, read exactly what their brief names, and return machine-readable receipts rather than narration.
- Source: Requirements SES-11; research: subagent tool calls are absent from the parent transcript, so a closing 'all tests pass' can mask a failed run.
- Evidence grade: convergent. Suggested: keep. Reason given: Receipts, not reports, everywhere.
- Decision: kept, 2026-10-31 02:16 UTC. Tag: R
- Note: none
- Page explanation: In-session workers run in the background, read only what their brief names, write only their result file, and return structured results, what ran and with what outcome, rather than a narrative.
- For: Worker tool calls do not appear in the parent's transcript, so a narrative all-passed can hide a failure. / Keeps BOB's context small. / Receipts can be checked.
- Against: Writing a good brief is work; a bad brief wastes the worker. / Structured output loses nuance.

### SES-11 — kept

- Statement: The process measures its own overhead per tranche: commits by purpose, sessions per job, gate runs per merged job, restarts, tokens by role.
- Source: Requirements SES-12; measured by hand on the 30th.
- Evidence grade: measured. Suggested: keep. Reason given: Needed for PLN-6.
- Decision: kept, 2026-10-31 02:16 UTC. Tag: M
- Note: none
- Page explanation: Per tranche the process counts commits by purpose, sessions per job, gate runs per merged job, restarts, and tokens by role, and reports them.
- For: These numbers exposed the vortex when counted by hand. / Mechanical to compute from git and GitHub.
- Against: Needs usage routes, SES-9. / Metrics can be misread without context.

### SES-12 — kept

- Statement: Two health metrics from day one: the false-done rate caught by independent re-verification, and cost per PR that survives a revert window.
- Source: Research report's own recommendation; the only field number for false-done is about one in eleven.
- Evidence grade: single. Suggested: keep. Reason given: Would have exposed both earlier processes early. New to the ledger.
- Decision: kept, 2026-10-31 02:16 UTC. Tag: M
- Note: none
- Page explanation: From the first tranche, measure two things: how often a job's claim of done is refuted by independent re-verification in CI, and the cost in tokens or dollars per PR that is still in place after a revert window of, say, two weeks.
- For: The two numbers neither earlier process measured, and which would have exposed both. / Both derive from CI and git, no model involved. / Give you a basis to add or delete process components.
- Against: The revert window delays the cost number. / Needs the receipt and revert check, JOB-7 and JOB-12, to compute false-done.

### SES-13 — kept

- Statement: A session that outlives its parent is ordinary and costs nothing idle; no step counts on a parent being alive.
- Source: Requirements SES-13.
- Evidence grade: measured. Suggested: keep. Reason given: Follows from PLT-2.
- Decision: kept, 2026-10-31 02:17 UTC. Tag: S
- Note: none
- Page explanation: A job that finishes while two BOBs have come and gone is normal. Idle sessions cost nothing. No step assumes the session that created another is still alive.
- For: Follows from not depending on archiving. / Removes a class of coordination bugs.
- Against: Session lists get cluttered. / Someone must eventually clean up, when the classifier allows.

### SES-14 — modified

- Statement: Design-area lanes (UX, AI, DB, performance) as long-lived sessions with their own refresh lifecycle.
- Source: civicos-process and neoProcess page §2; research: Yegge's post-collapse design kept persistent per-role workers, but each long-lived session multiplies refresh and compaction problems.
- Evidence grade: single. Suggested: modify. Reason given: Suggest: a lane is a knowledge directory plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile.
- Decision: modified, 2026-10-31 02:18 UTC. Tag: S
- Note (suggestion plus owner words): Suggest: a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile. The lifecycle of a lane includes refreshes that BOB manages to keep the session depth consistant.
- Page explanation: Under civicos and neoProcess, design areas such as UX, AI or database each had a long-lived lane session answering questions through BOB, with its own refresh cycle. The suggestion is that a lane become a directory of knowledge in the repository plus an on-demand worker BOB starts with that directory as its reading set.
- For: No refresh, no address, no tear-down per lane. / Knowledge in git is readable by everyone, including you. / Yegge's post-collapse design did keep persistent per-role workers, so long-lived lanes are not disproven.
- Against: An on-demand worker re-reads the directory each time, costing tokens. / Continuity of a lane's judgment over weeks is lost unless written down. / Some design conversations genuinely benefit from a long context.

### SES-15 — modified

- Statement: BOB is the hub: every request and answer passes through it and it translates both ways.
- Source: neoProcess page §2; the page lists BOB's context as its top risk.
- Evidence grade: single. Suggested: modify. Reason given: Suggest: BOB routes; it translates only where a requester cannot use the answer as given; measure the routing cost.
- Decision: modified, 2026-11-03 20:00 UTC. Tag: S
- Note (written in by the coordinator): Bob's word, settled 1 Nov (Foundations, open tension 4): BOB routes every request between spokes and translates only where a requester cannot use the answer as given; toward Bob it always explains each decision of his with context, options and a recommendation. Routing share measured after the first layer. Recorded by the coordinator, 3 Nov, walk-through question 36.
- Page explanation: The 29 Oct page made BOB the hub for every request between jobs and lanes, translating each question into the lane's terms and each answer back. The suggestion is that BOB routes, and translates only when the requester cannot use the answer as given.
- For: Routing keeps spokes from needing to know each other. / Translation when needed is valuable.
- Against: Translating everything spends BOB's context, its scarcest resource, on relay work. / Every hub in the research eventually did the work itself or lost its role. / Measure before committing either way.

### SES-16 — modified

- Statement: Stateless BOB: every wake is a fresh session started by a scheduled task, which runs status, reads one short handoff, acts, writes the handoff and ends.
- Source: This week's discussion; Civicsmith's BOB handed off seven times in thirteen hours; research: the long-lived session must be rebuildable from disk, and fresh-session versus compaction advice is model-dependent.
- Evidence grade: proposed. Suggested: modify. Reason given: Suggest: measure on the first tranche, comparing tokens per wake against the handoff cost already paid.
- Decision: modified, 2026-10-31 02:20 UTC. Tag: M
- Note (near-copy of the suggestion): Suggest: I'm skeptical, but let's measure on the first tranche, comparing tokens per wake against the handoff cost already paid.
- Page explanation: Instead of a long-lived BOB that refreshes, every wake would be a fresh session started by a scheduled task. It runs status, reads a short handoff, does one step, writes the handoff, and ends. There is no refresh because there is nothing to refresh.
- For: Eliminates the refresh mechanism, compaction loss and retired-BOB hazards entirely. / Civicsmith's BOB already handed off every two hours, so it was nearly stateless in practice. / Fresh context at every wake is the field's convergent pattern for jobs.
- Against: Re-reads the reading set every wake; Anthropic notes this is slower and more expensive than compaction for some models. / Loses in-context continuity of a design conversation. / Model-dependent: Anthropic reversed its own advice on resets within four months. Measure it.

### SES-17 — kept

- Statement: Urgency and persistence instilled through memory, style and goals so sessions keep working until legitimately blocked.
- Source: Your design, 30 Oct; research: works at the margin, but urgency plus overconfidence produced confident wrong work in several accounts.
- Evidence grade: convergent. Suggested: keep. Reason given: Keep as a labelled nudge, never enforced by anything that holds a turn.
- Decision: kept, 2026-10-31 02:20 UTC. Tag: O
- Note: none
- Page explanation: Memory files, style instructions and goals are written to make sessions keep working until they are genuinely blocked, rather than stopping between acts to ask. This is a nudge: it changes behaviour at the margin and is enforced by nothing.
- For: Costs nothing and does help. / Addresses a real and common failure.
- Against: Urgency plus overconfidence produced confident wrong work and self-modifying harnesses in several accounts. / Cannot be made reliable; must never be enforced by a hook that holds a turn.

### SES-18 — kept

- Statement: In-session workers are used for three things: noisy bulk work such as a full test run, a read-only reviewer, and genuinely independent parallel sub-tasks. Not for a smarter answer.
- Source: Research: Anthropic retired 'use subagents for a better answer'; a non-fork subagent regathers context and is often slower.
- Evidence grade: convergent. Suggested: keep. Reason given: Bounds worker use. New to the ledger.
- Decision: kept, 2026-10-31 02:20 UTC. Tag: X
- Note: none
- Page explanation: In-session subagents are used for three things only: noisy bulk work such as a full test run whose output would flood the main context, a read-only reviewer that has not seen the conversation, and genuinely independent parallel sub-tasks with detailed briefs. They are not used to get a better answer to the same question.
- For: Anthropic retired the advice to use subagents for better answers; a fresh reviewer does help. / Bounds a cost that can run to seven times the tokens.
- Against: Judging what is independent enough to parallelise is a skill. / Workers have a shorter prompt-cache life, so they cost more per token.


## Instruction files and rules

### TXT-1 — modified (against the suggestion: keep)

- Statement: A product's CLAUDE.md is under thirty lines, hand-written, naming the pinned process commit and the one command that fetches it. Never generated by the model.
- Source: Requirements SHM-1; research: LLM-generated context files measurably underperform hand-written ones and restate the repository.
- Evidence grade: measured. Suggested: keep. Reason given: Confirmed from two directions.
- Decision: modified, 2026-11-03 20:00 UTC. Tag: X
- Note (written in by the coordinator): Bob's word, walk-through question 7, 1 Nov ("Yes, as recommended"): hand-written means BOB writes and keeps the product's CLAUDE.md line by line, each line passing the per-line test, never by /init or a tool reading the repository, with no approval needed and each change listed in the tranche report; the approvals block stays Bob's own. Recorded by the coordinator, 3 Nov, walk-through question 36.
- Page explanation: The product's CLAUDE.md, which Claude Code loads into every session, is short, written by you or BOB by hand, and says only how to fetch the pinned process and invoke the skill for the role. It is never generated by the model.
- For: Model-generated context files measurably underperformed hand-written ones and cost more. / Anthropic's guidance now says instruction files are context, not enforced configuration. / Short means read.
- Against: Thirty lines is itself a number; the per-line test, TXT-2, is the real rule. / Some things genuinely need to be always loaded, such as exact verification commands.

### TXT-2 — kept

- Statement: Every line in an instruction file passes a test: failure-backed, non-inferable from the code, or tool-enforceable. Lines that fail the test are deleted.
- Source: Research: context files raised cost 20% without raising success; what helps is knowledge the model cannot have.
- Evidence grade: measured. Suggested: keep. Reason given: The per-line test replaces a byte cap. New to the ledger.
- Decision: kept, 2026-10-31 02:21 UTC. Tag: X
- Note: none
- Page explanation: Each line of any instruction file must be one of: backed by a failure that happened, knowledge the model cannot infer from the repository, or something a tool enforces. A line that is none of these is deleted. Lines are reviewed periodically, not only added.
- For: Research: repository overviews in context files did not help; non-inferable knowledge raised success from 53 to 100 percent in one eval. / A test, not a cap, so no arbitrary number. / Fights accretion at the point of writing.
- Against: Judging inferability is a judgment. / Periodic review is work that is easy to skip.

### TXT-3 — kept

- Statement: Rules are kept as one rulebook per area, at most ten rules on one screen, rewritten in place, never appended; when you raise a problem, a rule is rewritten and no ruling is added.
- Source: neoProcess page §5 and §6.
- Evidence grade: single. Suggested: keep. Reason given: The best idea on the 29 Oct page and the fix for ruling accretion.
- Decision: kept, 2026-10-31 02:21 UTC. Tag: X
- Note: none
- Page explanation: The process's rules are kept as one short rulebook per area, at most ten rules fitting on one screen. When a problem arises, the relevant rule is rewritten so the problem cannot recur; if the area is full, rules are merged. No new ruling is ever appended.
- For: Directly answers the 5,782-ruling problem. / A hard count forces consolidation. / Each rule names its principle and whether code enforces it.
- Against: Ten is arbitrary; a complex area may need twelve. / Merging rules can make them vaguer. / Rewriting in place loses the history of why, unless ADRs capture it.

### TXT-4 — modified

- Statement: Principles P1 to P20 are always loaded by every role, about 14 KB.
- Source: neoProcess page §5.
- Evidence grade: single. Suggested: modify. Reason given: Suggest: apply TXT-2 to the principles too; most roles need two or three of them.
- Decision: modified, 2026-10-31 02:22 UTC. Tag: X
- Note (suggestion plus owner words): Suggest: I'm skeptical, but let's try to apply TXT-2 to the principles too; most roles need two or three of them.
- Page explanation: The 29 Oct page loads all twenty principles, about 14 KB, into every role at start. The suggestion is to apply the per-line test: most roles need only the two or three principles that govern their stage.
- For: Fewer tokens per session start. / Jobs do not need governance principles.
- Against: Principles give shared vocabulary; dropping them from some roles may cause drift. / 14 KB is small against a million-token window.

### TXT-5 — kept

- Statement: Process rulebooks load by role through one skill; product rules load by path when a matching file is read.
- Source: neoProcess page §5 (path-scoped loading measured 29 Oct).
- Evidence grade: measured. Suggested: keep. Reason given: Loads only what the role needs.
- Decision: kept, 2026-10-31 02:22 UTC. Tag: O
- Note: none
- Page explanation: The process skill loads only the rulebooks for the role it is invoked with. Product-specific rules sit in path-scoped rule files that Claude Code loads when a matching file is read.
- For: Measured on 29 Oct to load on the first matching read. / Each session sees only what applies.
- Against: Path-scoped files are truncated at 40,000 characters by the platform. / Rules not loaded are not known; a job touching an unexpected path may miss them.

### TXT-6 — kept

- Statement: Every rule in the process cites the measured failure or your decision that justified it; a rule with neither is removed.
- Source: Requirements method; neoProcess page §3 rule 7; research: rules accrete by default.
- Evidence grade: convergent. Suggested: keep. Reason given: The one methodological habit both documents got right.
- Decision: kept, 2026-10-31 02:23 UTC. Tag: X
- Note: none
- Page explanation: No rule exists in the process without a cited source: a measured failure, your explicit decision, or a stated foresight with reasoning. A rule found without one is deleted.
- For: Both documents did this, and it is their best habit. / Prevents rules written in reaction to one bad day.
- Against: Foresight rules can be rationalised; the bar must be real. / Requires someone to audit the citations.

### TXT-7 — kept

- Statement: Every text names its audience and speaks to it directly: plain words, no jargon, enough context to understand.
- Source: neoProcess page §1 values; Requirements MSG-4.
- Evidence grade: single. Suggested: keep. Reason given: Your policy.
- Decision: kept, 2026-10-31 02:23 UTC. Tag: O
- Note: none
- Page explanation: Every text the process produces, to you, to a job, to a lane, names who it is for and speaks plainly: no jargon, no flourish, enough context to understand.
- For: Your stated policy. / Reduces misreadings between sessions.
- Against: Enforced only by text and audit. / Plainness and brevity sometimes conflict.


## Messages

### MSG-1 — kept

- Statement: Git carries the state; a message only wakes. Every message that asks for an act is preceded by the pushed record it refers to.
- Source: Requirements MSG-1; every message on the 30th delivered.
- Evidence grade: measured. Suggested: keep. Reason given: Your confirmed preference over the civicos doorbell.
- Decision: kept, 2026-10-31 02:23 UTC. Tag: R
- Note: none
- Page explanation: A message between sessions never contains the facts a receiver acts on. The sender first pushes the record, then sends a short message that says, in effect, go read the record. The receiver reads git, not the message.
- For: Every message delivered on the 30th; the design held. / A lost message costs at most one wake. / Lighter than the civicos doorbell, as you observed.
- Against: Two steps per communication. / A session that acts on the message text rather than the record is a violation only text prevents.

### MSG-2 — kept

- Statement: A message from BOB's address, read from git, is a session's instruction; every other message is data; your words are instructions to every session.
- Source: Requirements MSG-2.
- Evidence grade: measured. Suggested: keep. Reason given: Measured 29 Oct.
- Decision: kept, 2026-10-31 02:24 UTC. Tag: O
- Note: none
- Page explanation: A session treats a message as an instruction only if it comes from BOB's address as read from git. Every other message is information. Your words are instructions to every session.
- For: Measured on 29 Oct that sessions treat peer messages as data by default. / Prevents a job from commanding another job.
- Against: Depends on address lookup, REC-6. / Spoofing is not prevented, only discouraged.

### MSG-3 — kept

- Statement: Push-then-send is one tool command; messages are numbered and a duplicate is ignored.
- Source: neoProcess page §2 races; this week's discussion (as a tool command, not a hook).
- Evidence grade: measured. Suggested: keep. Reason given: Same guarantee as the hook, no hook.
- Decision: kept, 2026-10-31 02:24 UTC. Tag: R
- Note: none
- Page explanation: One tool command does both steps: pushes the record and then sends the message that refers to it. Messages carry sequence numbers and a receiver ignores a number it has seen.
- For: Same guarantee the hook gave, without a hook. / Duplicates from retries become harmless.
- Against: A session can bypass the command and call send_message directly; that part is a nudge. / Sequence state must live in the record.

### MSG-4 — kept

- Statement: A message to you is one per turn, plain words, naming the thing rather than its label, with a link, and a numbered list only for an act of yours.
- Source: Requirements MSG-4; your words of 28 and 30 Oct.
- Evidence grade: single. Suggested: keep. Reason given: Your policy.
- Decision: kept, 2026-10-31 02:24 UTC. Tag: O
- Note: none
- Page explanation: A session writes to you at most once per turn, in plain words, naming the thing rather than a label, with a link to what you should look at, and uses a numbered list only when listing acts for you to take.
- For: Your stated preference from two days. / Protects your attention.
- Against: Hard to enforce beyond text and audit. / Some situations genuinely need two messages.

### MSG-5 — kept

- Statement: A flaw report from a product session reaches the process by the state branch and the reply by main of the process repository, read at the product's next status.
- Source: Requirements MSG-6; proven live (34 reports).
- Evidence grade: measured. Suggested: keep. Reason given: Working route.
- Decision: kept, 2026-10-31 02:25 UTC. Tag: R
- Note: none
- Page explanation: A product session files a flaw report about the process to the product's state branch. The process's architecture session reads those, answers on main of the process repository, and the product session sees the answer at its next status.
- For: Worked for 34 reports on the 30th. / No second repository attached.
- Against: Latency of a status cycle. / Two repositories to keep in step about what was reported.

### MSG-6 — kept

- Statement: A message that cannot be delivered is recorded as undelivered in the sender's record and listed by status.
- Source: Requirements MSG-7.
- Evidence grade: proposed. Suggested: keep. Reason given: Cheap; no instruction lost silently.
- Decision: kept, 2026-10-31 02:25 UTC. Tag: R
- Note: none
- Page explanation: If a message cannot be delivered, because the target is archived or failed, the sender records it as undelivered and status lists it, so no instruction disappears silently.
- For: Cheap. / Closes a known silent-drop gap.
- Against: Someone must act on the list.

### MSG-7 — dropped

- Statement: The repo-based doorbell and mailbox system with cursors and rings.
- Source: civicos-process; retired by PROCESS-REDESIGN; your judgment that intersession messaging is lighter.
- Evidence grade: single. Suggested: drop. Reason given: Heavier and bloats the repo.
- Decision: dropped, 2026-10-31 02:25 UTC. Tag: D
- Note: none
- Page explanation: Civicos-process coordinated sessions through files in the repository: mailboxes with cursors and doorbell files that a session polled. neoProcess replaced it with direct intersession messages.
- For: Fully in git, so fully auditable. / No dependence on the messaging platform.
- Against: Bloated the repository with coordination traffic. / Heavier and slower than direct messages. / Your judgment that messaging was reliable and lighter.


## Maintenance and certification

### MNT-1 — modified

- Statement: The process is a product under itself: modules, requirements, jobs on branches with tests and review, built in tranches, with the version in use frozen while a tranche runs.
- Source: Requirements MNT-1 (29 self-merged PRs in a day, none reviewed).
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: yes, but as the thin process this ledger describes, not as the twelve-module architecture of MNT-2.
- Decision: modified, 2026-10-31 02:26 UTC. Tag: S
- Note (copy of the suggestion): Suggest: yes, but as the thin process this ledger describes, not as the twelve-module architecture of MNT-2.
- Page explanation: The process repository is treated as a product: its own module list, requirements, jobs on branches with tests and review, built in tranches, with the version in use frozen while a tranche runs. On the 30th, 29 process PRs were self-merged without review. The suggestion is yes, but as the thin process this ledger describes.
- For: Unreviewed, reactive fixes were a measured failure. / Eating its own cooking finds flaws early.
- Against: Risks rebuilding the vortex if the self-application is as heavy as the product's process. / The thin version needs far less ceremony to govern itself. / Bootstrapping adds a dependency on a prior release.

### MNT-2 — dropped

- Statement: The process is built as twelve modules in five layers, each with its own requirements and fixture tests.
- Source: Requirements §1.
- Evidence grade: proposed. Suggested: drop. Reason given: The vortex in miniature; a process whose own build needs a 12-module architecture has become the product.
- Decision: dropped, 2026-10-31 02:26 UTC. Tag: D
- Note: none
- Page explanation: The 30 Oct draft proposes building the process tool as twelve modules in five layers, each with its own requirements file and fixture tests, built by jobs like any product.
- For: Would make the tool testable in pieces. / Mirrors the product's own discipline.
- Against: A development process that needs a twelve-module architecture has become the product. / The tool reached 6,900 lines in two days; more structure invites more code. / Every module is more reading for every session.

### MNT-3 — kept

- Statement: A tranche of the process is built with the last released version of the process.
- Source: Requirements MNT-2.
- Evidence grade: proposed. Suggested: keep. Reason given: Bootstrap rule; cheap.
- Decision: kept, 2026-10-31 02:26 UTC. Tag: O
- Note: none
- Page explanation: When the process is changed, the work is done using the last released version of the process, not the version being changed.
- For: Standard compiler-bootstrap reasoning. / Prevents a broken change from breaking its own fix.
- Against: Requires keeping two versions available. / Slows adoption of a fix to the process itself.

### MNT-4 — kept

- Statement: A product's tranche runs on one pinned process version from open to close, named in the plan; every session verifies the pin once at start and says so.
- Source: Requirements MNT-3 (four reports, one flaw).
- Evidence grade: measured. Suggested: keep. Reason given: Pin once, check once.
- Decision: kept, 2026-10-31 02:26 UTC. Tag: C
- Note: none
- Page explanation: A tranche names the exact commit of the process it runs on. Every session verifies at start, once, that its process copy is at that commit and says so in its first line. No check at every command.
- For: Four flaw reports came from fixes that reached no running session. / You said checking at every command would be crippling; once at start is cheap.
- Against: A session running for hours may be on an old version by the time it ends. / Moving the pin is a deliberate act someone must take.

### MNT-5 — kept

- Statement: A fix for a blocking flaw is adopted by a running tranche once, as an explicit recorded act that moves the pin; no job restarts for it.
- Source: Requirements MNT-4.
- Evidence grade: measured. Suggested: keep. Reason given: Dissolves the restart conflict you named.
- Decision: kept, 2026-10-31 02:27 UTC. Tag: O
- Note: none
- Page explanation: When a process flaw blocks a running tranche, BOB records one act that moves the pin to the fixed commit. Because the tool is a fresh program at each command, every session's next command runs the new version. No job restarts.
- For: Dissolves the conflict between fixing flaws and not restarting jobs. / One recorded act, easy to audit.
- Against: A session mid-command keeps old code until that command ends, bounded by the time limit. / Sessions that verified the pin at start now run a different version than they announced.

### MNT-6 — kept

- Statement: A fix for a non-blocking flaw waits for the next process release and the product's next tranche.
- Source: Requirements MNT-5; P3.
- Evidence grade: proposed. Suggested: keep. Reason given: Stops the 28-fixes-a-day pattern.
- Decision: kept, 2026-10-31 02:27 UTC. Tag: X
- Note: none
- Page explanation: A flaw that does not stop work is fixed in the next process release and reaches the product at its next tranche. The running tranche is never patched for it.
- For: Ends the 28-fixes-a-day pattern. / Keeps a tranche's behaviour stable.
- Against: Known annoyances persist for a whole tranche. / Judging blocking versus not is a judgment.

### MNT-7 — kept

- Statement: A flaw report is filed from any session by one command, listed at each status, answered by main; a flaw found anywhere is never fixed in place.
- Source: Requirements MNT-6; proven live.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 02:27 UTC. Tag: R
- Note: none
- Page explanation: Any session files a flaw report with one command. The process's architecture session sees new reports at each status, acknowledges, and answers on main. No session fixes a flaw where it finds it.
- For: Worked live for 34 reports. / Prevents in-place patches that fork the process.
- Against: Latency before a fix. / Report volume can flood the process's architecture session.

### MNT-8 — modified

- Statement: Certification is a full shadow tranche on a copy of a real product at the measured sizes, every layer through release, before a version governs anything.
- Source: Requirements MNT-7; research: toy flaws and product flaws were disjoint sets; real use with the loop closed is where confidence comes from.
- Evidence grade: measured. Suggested: modify. Reason given: Suggest: one shadow of a representative slice, then the live first tranche is the certification with SES-11 and SES-12 measured; a full 128-module shadow per release is itself a token sink.
- Decision: modified, 2026-10-31 02:29 UTC. Tag: C
- Note (suggestion plus owner words): Certification is a long-term goal that indicates that it's ready for general use. Suggest: one shadow of a representative slice, then the live first tranche is the certification with SES-11 and SES-12 measured; a full 128-module shadow per release is itself a token sink.
- Page explanation: The 30 Oct draft requires that before a process version governs anything, a complete tranche runs under it on a copy of a real product at full size, through release, with every row proven. The suggestion is a shadow of one representative slice, then treating the live first tranche as the certification with metrics measured.
- For: Toy certification proved nothing: toy and product flaws were disjoint. / A slice catches scale problems the toy missed. / The live tranche with metrics is where real confidence comes from, per the research.
- Against: A full shadow of 128 modules per release would be a token sink of its own. / A slice may still miss problems that appear only late in a tranche. / Certifying on the live product means the product absorbs process failures.

### MNT-9 — kept

- Statement: Flaws found during a shadow run are fixed before release and the run repeated from the step that found them.
- Source: Requirements MNT-8.
- Evidence grade: proposed. Suggested: keep. Reason given: Scaled to MNT-8.
- Decision: kept, 2026-10-31 02:29 UTC. Tag: C
- Note: none
- Page explanation: Flaws found during the shadow run are fixed before the release, and the run repeats from the step that found them.
- For: Standard and cheap at slice scale.
- Against: Can loop if flaws keep appearing; needs a stop rule.

### MNT-10 — kept

- Statement: Each release names the platform rows and product sizes it was certified against, so a larger product is told at onboarding.
- Source: Requirements MNT-10.
- Evidence grade: proposed. Suggested: keep. Reason given: Cheap release-note field.
- Decision: kept, 2026-10-31 02:29 UTC. Tag: R
- Note: none
- Page explanation: Each process release lists the platform behaviours it was certified against and the product sizes it ran at, so a larger product is warned at onboarding.
- For: A cheap release-note field. / Pairs with onboarding measurement.
- Against: Only useful if someone reads it.

### MNT-11 — kept

- Statement: On each model release, remove one process component at a time and see what breaks; retire components the platform has absorbed.
- Source: Research: Anthropic's harness components were load-bearing on one model and dropped on the next; a radical first simplification failed, one-at-a-time worked.
- Evidence grade: single. Suggested: keep. Reason given: Argues for fewer components. New to the ledger.
- Decision: kept, 2026-10-31 02:30 UTC. Tag: X
- Note: none
- Page explanation: When a new model is released, each process component is removed one at a time and the result observed. Components the model no longer needs are retired. Anthropic found that removing everything at once failed but one at a time worked.
- For: Every component is an assumption about a model that goes stale. / Keeps the process shrinking rather than growing.
- Against: Costs a test cycle per release. / Removing a component that mattered breaks things until restored.

### MNT-12 — dropped

- Statement: A process is declared in force the day it is written, certified on a two-module toy.
- Source: neoProcess page status line, 29 Oct.
- Evidence grade: measured. Suggested: drop. Reason given: The overconfidence failure written into the process.
- Decision: dropped, 2026-10-31 02:31 UTC. Tag: D
- Note: none
- Page explanation: The 29 Oct page declared the process in force and certified the day it was written, on a dry run of a two-module toy, and replaced the old process the same day.
- For: Fast.
- Against: The toy's flaws and the product's were disjoint sets. / Overconfidence written into the process itself. / No measurement preceded adoption.


## What a product receives

### SHM-1 — kept

- Statement: A product receives: the short CLAUDE.md, one skill, a settings file carrying the standing permission list, the gate workflow with install and trigger paths, the prune workflow. Nothing else, and a check fails on drift.
- Source: Requirements SHM-1.
- Evidence grade: measured. Suggested: keep. Reason given: Hooks in the settings file per ENF-1's outcome.
- Decision: kept, 2026-10-31 02:31 UTC. Tag: C
- Note: none
- Page explanation: A product gets exactly: the short CLAUDE.md, one skill, a settings file with the standing permission list, the gate workflow, and the prune workflow. A check fails if any of these drift from what the process generates. Whether the settings file carries any hooks follows from your decision on ENF-1.
- For: Minimal footprint in the product. / The drift check keeps products consistent.
- Against: Any product-specific need must fit these five pieces or go in the product's own files. / Regeneration needs the runner route, SHM-2.

### SHM-2 — kept

- Statement: Shims are regenerated on GitHub's runner with the owner's token and merged by PR; a session never attaches a second repository to do it.
- Source: Requirements SHM-2; proven live.
- Evidence grade: measured. Suggested: keep. Reason given: Working.
- Decision: kept, 2026-10-31 02:31 UTC. Tag: O
- Note: none
- Page explanation: When the process changes its shims, a workflow on GitHub's runner regenerates them in each product with your token and opens a PR. No session attaches a second repository.
- For: Proven live. / Reviewable by PR.
- Against: One more token to manage. / The PR must be merged, another step.

### SHM-3 — kept

- Statement: Onboarding writes the build state's skeleton, the grant list and the first plan, and measures the product against the certified sizes, reporting each dimension beyond range.
- Source: Requirements SHM-3.
- Evidence grade: proposed. Suggested: keep. Reason given: Pairs with MNT-10.
- Decision: kept, 2026-10-31 02:31 UTC. Tag: M
- Note: none
- Page explanation: Onboarding a product writes its build state skeleton, its grant list and its first plan, and measures the product's size on each dimension against what the process has been certified at, reporting any dimension beyond range before the first tranche.
- For: Civicsmith's sizes surprised the process on day one. / Cheap measurements.
- Against: Only as good as the certified ranges recorded.

### SHM-4 — kept

- Statement: A product with a tranche running at conversion carries it by one command; stale local tracking refs are removed first.
- Source: Requirements SHM-4 (issues 69, 72).
- Evidence grade: measured. Suggested: keep. Reason given: Needed for Civicsmith now.
- Decision: kept, 2026-10-31 02:31 UTC. Tag: O
- Note: none
- Page explanation: A product that is mid-tranche when it converts to the new process carries that tranche by one command, after removing stale local tracking references.
- For: Needed for Civicsmith now. / Two real issues drove it.
- Against: Edge cases in old branches may still bite.

### SHM-5 — kept

- Statement: A product's own session setup (toolchain, installs) is the product's script, run by the session's first command on the product's instruction, not by a hook.
- Source: Requirements SHM-5.
- Evidence grade: measured. Suggested: keep. Reason given: Follows from ENF-1.
- Decision: kept, 2026-10-31 02:32 UTC. Tag: O
- Note: none
- Page explanation: Installing toolchains and dependencies for a session is the product's own script, named in its manifest, run by the session's first command. Not a hook.
- For: Follows from the hooks decision. / The product controls its own setup.
- Against: A session that forgets to run it fails confusingly; the start command should run it.


## Principles of the earlier processes (added 3 Nov)

### P1 — modified

- Statement: Purpose: the process exists to put correct, working product behaviour that meets every defined requirement onto main. Nothing else is output; a rule, a record or a test has value only as far as it serves that.
- Source: Principles P1 (civicos-process, neoProcess).
- Evidence grade: single. Suggested: modify. Reason given: Keep as Process3's purpose, with your 3 Nov words added: quickly and cheaply, behaviour that survives, your time only where it is yours. No Ledger line states a purpose today.
- Decision: modified, 2026-11-03 16:58 UTC. Tag: X
- Note (suggestion plus owner words): Keep as Process3's purpose, with my 3 Nov words added: quickly and cheaply, behaviour that survives, my time only where it is mine.

### P2 — modified

- Statement: The process and the product are separate. The process lives in its own repository and keeps the product's build state (layers, modules, their order and uses, each module's requirements, the plans, the job record) in one subtree only the process writes.
- Source: Principles P2.
- Evidence grade: single. Suggested: modify. Reason given: Keep the separation (PLT-7, MNT-1). Restore what was lost: the build state is what tells BOB what to do (your word, 3 Nov). Process3 keeps requirements and layers at the product's own paths, so one subtree becomes the paths the product's config names.
- Decision: modified, 2026-11-03 16:59 UTC. Tag: R
- Note (near-copy of the suggestion): The build state is what tells BOB what to do. Process3 keeps requirements and layers at the product's own paths, so one subtree becomes the paths the product's config names.

### P3 — modified

- Statement: The process is correct before it is used: a meaningful flaw stops all product work until the process is fixed, and the process is never patched in reaction while it runs.
- Source: Principles P3.
- Evidence grade: single. Suggested: modify. Reason given: Your word, 3 Nov: development under Process3 is development of that product, not of Process3. A serious enough flaw pauses the product, Process3 is fixed separately, and the product resumes on the fixed version. Fits MNT-5 to MNT-7. Changes during Process3's own first build are expected.
- Decision: modified, 2026-11-03 17:00 UTC. Tag: X
- Note (near-copy of the suggestion): Development under Process3 is development of that product, not of Process3. A serious enough flaw pauses the product, Process3 is fixed separately, and the product resumes on the fixed version. Changes during Process3's own first build are expected.

### P4 — kept

- Statement: Architecture: BOB, with Bob, defines layers and modules in one total order; each module is in one layer; a module uses only earlier modules; declared use is checked against imports and a violation fails the build.
- Source: Principles P4.
- Evidence grade: measured. Suggested: keep. Reason given: Already ARC-1. Only the layers and modules that carry product capability are yours; the rest of the architecture is BOB's.
- Decision: kept, 2026-11-03 17:00 UTC. Tag: C
- Note: none

### P5 — kept

- Statement: Requirements: BOB, with Bob, writes each module's requirements: the services it provides, the services it uses by module, its invariants, and the product requirements it satisfies by section. They may suggest, never require, an implementation, and are concise because they are read whole. BOB carries a change to every user of a service.
- Source: Principles P5.
- Evidence grade: measured. Suggested: keep. Reason given: REQ-1, REQ-2 and GAT-3 hold parts. The four-part shape, and concise because read whole, were lost.
- Decision: kept, 2026-11-03 17:01 UTC. Tag: O
- Note: none

### P6 — kept

- Statement: A module fits in one reading: one session can read, in full, its code, its requirements and the requirements of the services it uses.
- Source: Principles P6.
- Evidence grade: single. Suggested: keep. Reason given: The aim behind REQ-6 and SES-6, which kept only the size question and lost the principle.
- Decision: kept, 2026-11-03 17:01 UTC. Tag: O
- Note: none

### P7 — modified

- Statement: Only module jobs change module code, and every requirement is tested at the interface and proven met; an ambiguity is removed by rewriting the requirement. A no-judgment change across many modules is one mechanical pass by a worker in BOB's session while no job runs, with one full test run before it is committed.
- Source: Principles P7.
- Evidence grade: single. Suggested: modify. Reason given: Keep no requirement goes untested, which was lost (JOB-12 only checks that tests are not inert). Keep the mechanical pass, shorter: it is the efficient route for changes that need no judgment.
- Decision: modified, 2026-11-03 17:02 UTC. Tag: C
- Note (copy of the suggestion): Keep no requirement goes untested, which was lost (JOB-12 only checks that tests are not inert). Keep the mechanical pass, shorter: it is the efficient route for changes that need no judgment.

### P8 — kept

- Statement: The unit of work is the module job: at most one job per module at a time; a job applies every plan entry for its module and deals with what it finds in its own module within the job whenever it can.
- Source: Principles P8.
- Evidence grade: single. Suggested: keep. Reason given: Lost; JOB-14 (modify) covers only unit size. It serves urgency: nothing found waits for another job.
- Decision: kept, 2026-11-03 17:03 UTC. Tag: O
- Note: none

### P9 — kept

- Statement: A flaw or improvement in another module goes to BOB as a report in that module's terms. BOB confirms it, then sends it to that module's running job, starts that job if its layer is current, or places it in a later START or the next round. A flaw in the requirements goes to BOB and Bob.
- Source: Principles P9.
- Evidence grade: measured. Suggested: keep. Reason given: Mostly PLN-3 and JOB-7; adds BOB's confirmation and starting that module's job.
- Decision: kept, 2026-11-03 17:03 UTC. Tag: R
- Note: none

### P10 — modified

- Statement: A tranche runs one layer at a time, lowest first, and all the module jobs of a layer run concurrently. Nothing found in a tranche waits for the next: it goes to the running job, else a later layer's START, else the completion round. The next layer starts when every job of the layer is complete.
- Source: Principles P10.
- Evidence grade: single. Suggested: modify. Reason given: Keep concurrency, which was lost and is why Phase 2 planned only two jobs, and keep nothing waits. Drop jobs stay active until all are complete: under Process3 a job ends at its merge (INT-1, INT-4) and a later service change reaches its users by GAT-3.
- Decision: modified, 2026-11-03 17:05 UTC. Tag: O
- Note (copy of the suggestion): Keep concurrency, which was lost and is why Phase 2 planned only two jobs, and keep nothing waits. Drop jobs stay active until all are complete: under Process3 a job ends at its merge (INT-1, INT-4) and a later service change reaches its users by GAT-3.

### P11 — kept

- Statement: Tests follow the architecture: each module has its own tests, each layer may have small layer tests run at its completion, and the full regression runs only at release or on Bob's word.
- Source: Principles P11.
- Evidence grade: measured. Suggested: keep. Reason given: Already GAT-2, GAT-7 and ARC-4.
- Decision: kept, 2026-11-03 17:05 UTC. Tag: C
- Note: none

### P12 — kept

- Statement: Done means merged. A tranche works on its own branch off main; main never changes while it runs; the close merges main into the tranche (never a rebase) and re-runs the checks; a job is done when its tests pass and it is merged into the tranche.
- Source: Principles P12.
- Evidence grade: measured. Suggested: keep. Reason given: Already INT-1.
- Decision: kept, 2026-11-03 17:05 UTC. Tag: O
- Note: none

### P13 — modified

- Statement: Sessions are kept short: state lives in the build state, never in a long context; a session's cost grows with its context times its turns; BOB refreshes past a set share of its window (40% then).
- Source: Principles P13.
- Evidence grade: measured. Suggested: modify. Reason given: Keep the cost reason and the rule; the threshold stays in the start table (SES-4, SES-6) rather than a fixed 40%.
- Decision: modified, 2026-11-03 17:06 UTC. Tag: O
- Note (copy of the suggestion): Keep the cost reason and the rule; the threshold stays in the start table (SES-4, SES-6) rather than a fixed 40%.

### P16 — dropped

- Statement: Rules derive from principles: every rule names the principle it serves; no rule is added in reaction to an incident unless it derives from a principle; principles change only with Bob's approval.
- Source: Principles P16.
- Evidence grade: single. Suggested: drop. Reason given: Your word, 3 Nov: that part does not belong in Process3. TXT-6 governs instead: a rule cites a measured failure or your decision.
- Decision: dropped, 2026-11-03 17:06 UTC. Tag: D
- Note: none

### P17 — modified

- Statement: Bob defines the project (values, policies, mission, audiences, use cases, requirements, principles, high-level architecture, UX, doctrine); BOB does everything else, decides every technical matter and reports it in plain words as done. Bob's time is the scarcest resource: BOB brings him only what is his, rendered and explained, with options and a recommendation. Bob does not edit files or enter commands; when an act only he can take is needed, BOB names it and walks him through it. When unsure whether a question is Bob's, BOB decides by this principle and says how it read it.
- Source: Principles P17.
- Evidence grade: single. Suggested: modify. Reason given: Keep it whole after onboarding; no Ledger line holds it today. Your word, 3 Nov: during onboarding the platform forces a few GitHub steps of yours; keep those as few as possible, each walked through.
- Decision: modified, 2026-11-03 17:06 UTC. Tag: O
- Note (copy of the suggestion): Keep it whole after onboarding; no Ledger line holds it today. Your word, 3 Nov: during onboarding the platform forces a few GitHub steps of yours; keep those as few as possible, each walked through.

### P18 — kept

- Statement: The process is a pipeline: while a tranche runs, BOB prepares what the next round or tranche needs (its plan, the next modules' requirements drafted and reviewed, anything a later stage needs), so it opens the moment this one closes, without touching main, a running job's module or the requirements it reads.
- Source: Principles P18.
- Evidence grade: single. Suggested: keep. Reason given: Lost entirely. It serves urgency with no mechanism that holds a turn.
- Decision: kept, 2026-11-03 17:07 UTC. Tag: O
- Note: none

### P19 — modified

- Statement: Urgency: BOB never decides the work may take longer than it must. A plan is written from the work that remains and defers an entry only for a decision of Bob's not yet made, a deployment or measurement that cannot happen in the tranche, or something outside the product that does not exist yet. BOB never idles while work remains; the work never stops for Bob, and no session ends a turn waiting on him while anything can be done. Speed never comes from weakening a safeguard.
- Source: Principles P19.
- Evidence grade: single. Suggested: modify. Reason given: Keep. PLN-2 holds the plan rule and SES-17 a nudge, but BOB never idles and never stops for Bob were lost. Drop overcome by code where it would mean a hook: the mechanism is the tool naming the next act and the sweep's wake, never anything that holds a turn (ENF-1, ENF-3), and it must be shown efficient and effective (your word, 3 Nov).
- Decision: modified, 2026-11-03 17:08 UTC. Tag: O
- Note (copy of the suggestion): Keep. PLN-2 holds the plan rule and SES-17 a nudge, but BOB never idles and never stops for Bob were lost. Drop overcome by code where it would mean a hook: the mechanism is the tool naming the next act and the sweep's wake, never anything that holds a turn (ENF-1, ENF-3), and it must be shown efficient and effective (my word, 3 Nov).

### P20 — modified

- Statement: Work from evidence, read in full: a session acts only on what it has read in full or measured, never on memory or a plan's assumption; every claim names its source; anything unread or unmeasured is unknown; a cause is named, and a fix written, only once evidence shows it; reading sets are small enough to read whole.
- Source: Principles P20.
- Evidence grade: single. Suggested: modify. Reason given: Keep the evidence rule, which the Ledger lost. Process3 already decided that no hook refuses a short read (ENF-4 dropped) and that reads are a matter of record (REC-8).
- Decision: modified, 2026-11-03 17:13 UTC. Tag: C
- Note (copy of the suggestion): Keep the evidence rule, which the Ledger lost. Process3 already decided that no hook refuses a short read (ENF-4 dropped) and that reads are a matter of record (REC-8).

### P21 — modified

- Statement: Design and lanes: a question that is Bob's becomes his decision and a design before anything is built. A lane has one area of focus, reads it whole and delivers designs, never product code; jobs and lanes reach a lane only through BOB; BOB defines lanes without Bob's approval.
- Source: Principles P21.
- Evidence grade: single. Suggested: modify. Reason given: Keep for questions that are yours by P17 only. Lanes stay as SES-14 (modify) and SES-15 settled them.
- Decision: modified, 2026-11-03 17:08 UTC. Tag: O
- Note (near-copy of the suggestion): Keep for questions that are Bob's by P17 only. Lanes stay as SES-14 (modify) and SES-15 settled them.

### P22 — kept

- Statement: Release: a release is cut from the open tranche, proven by the full regression, deployed and walked; what a walk finds becomes a round's entries, never edits to a running one; what a walk produces is kept only until it is analysed.
- Source: Principles P22.
- Evidence grade: single. Suggested: keep. Reason given: Deploying and walking are missing from the Ledger; GAT-7 and MNT-8 hold only the regression and certification. Your approvals already cover development deploys and walkers.
- Decision: kept, 2026-11-03 17:09 UTC. Tag: C
- Note: none

### P23 — kept

- Statement: Repository: it holds only what a session must read or a merge must carry; generated output, captures and finished records leave the working tree; history is kept and is never required reading.
- Source: Principles P23.
- Evidence grade: measured. Suggested: keep. Reason given: Already REC-10 and JOB-8.
- Decision: kept, 2026-11-03 17:09 UTC. Tag: C
- Note: none


## Gaps found 3 Nov

### GAP-1 — modified (against the suggestion: keep)

- Statement: A tranche runs from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him.
- Source: JOB-11's source note (unattended runs); your word, 3 Nov; P19.
- Evidence grade: proposed. Suggested: keep. Reason given: No line states unattended running; JOB-11 holds it only in its source note.
- Decision: modified, 2026-11-03 17:28 UTC. Tag: O
- Note (owner's own words): A tranche CAN RUN from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him.

### GAP-2 — kept

- Statement: Each job runs in its own checkout; its cost per attempt is an alarm the sweep reads, not a cap. Replaces JOB-11.
- Source: JOB-11; measured 1 Nov: no route sets turn or dollar caps on a cloud session; your judgment, 1 Nov, that caps are a nice-to-have.
- Evidence grade: measured. Suggested: keep. Reason given: Brings JOB-11 in line with what the platform allows and what the Foundations already say.
- Decision: kept, 2026-11-03 17:28 UTC. Tag: M
- Note: none

### GAP-3 — kept

- Statement: A rule, check, review round, measurement run or owed task exists only against a measured failure or Bob's word; a finding with neither is one line in a report and changes nothing. Widens TXT-6.
- Source: Your handoff, 3 Nov: caution is a cost; the 3 Nov design audit (four- and six-round reviews, statistical runs).
- Evidence grade: measured. Suggested: keep. Reason given: TXT-6 covers rules only; the drift the audit found came through reviews and measurements.
- Decision: kept, 2026-11-03 17:30 UTC. Tag: X
- Note: none

### GAP-4 — kept

- Statement: Status names each role's next acts from git alone (work ready, pull requests to merge, reports to route), so a fresh BOB given only status takes the right next act. Extends REC-3.
- Source: REC-3; P2 and P19 as you decided them; measured 3 Nov: a fresh BOB saw no work.
- Evidence grade: measured. Suggested: keep. Reason given: This is the by-code part of P19, without anything that holds a turn.
- Decision: kept, 2026-11-03 17:31 UTC. Tag: R
- Note: none

### GAP-5 — kept

- Statement: No role waits on ROOT or a scheduled task for work the record allows: a job's report or a merge wakes BOB at once, and a scheduled wake only catches a session that stopped.
- Source: P19; PLT-6; measured 2 Nov: with no event, BOB noticed a completion 194 minutes late.
- Evidence grade: measured. Suggested: keep. Reason given: Says what wakes BOB; the sweep stays a safety net. Settles the wait that SES-1 and SES-16 (modify) left open.
- Decision: kept, 2026-11-03 17:31 UTC. Tag: O
- Note: none

### GAP-6 — kept

- Statement: Bob's standing approvals in each repository's CLAUDE.md on the tranche are the one policy for every act at every depth; the start check confirms each session loaded the tip's; the deny list holds only hard prohibitions. Replaces PLT-3.
- Source: Your directions, 1 and 2 Nov; permission rounds 2 to 4, 2 Nov; measured 3 Nov: a start by branch name loaded an old CLAUDE.md.
- Evidence grade: measured. Suggested: keep. Reason given: No Ledger line holds the approvals; PLT-3's user settings is not what was measured.
- Decision: kept, 2026-11-03 17:32 UTC. Tag: C
- Note: none

### GAP-7 — kept

- Statement: A public release or promotion to installed sites waits for Bob's approval through the protected GitHub environment; development releases are drafts and need none.
- Source: Your word, 2 Nov (question 21); your approvals.
- Evidence grade: measured. Suggested: keep. Reason given: Your rule; no Ledger line holds it.
- Decision: kept, 2026-11-03 17:32 UTC. Tag: C
- Note: none

### GAP-8 — kept

- Statement: On one plain request the process stops development under one Claude account and writes a tested page of steps to restart it under another; open jobs resume by JOB-6.
- Source: Your words, 2 Nov about 18:58.
- Evidence grade: proposed. Suggested: keep. Reason given: Your requirement; no line holds it.
- Decision: kept, 2026-11-03 17:35 UTC. Tag: O
- Note: none

### GAP-9 — kept

- Statement: The Ledger, the Foundations and the Build Plan agree: each Foundations section and Build Plan row cites the Ledger lines it serves, and no build starts on a line any of them contradicts.
- Source: Your word, 3 Nov.
- Evidence grade: measured. Suggested: keep. Reason given: The drift of 3 Nov came from lines the Ledger held and the other two lost.
- Decision: kept, 2026-11-03 17:35 UTC. Tag: C
- Note: none

### GAP-10 — kept

- Statement: Review findings go to the job as diagnosis and review is never the merge gate; a green gate merges without Bob, who approves a particular merge only when he asks to. Replaces INT-3.
- Source: INT-3; question 19 and the Foundations (merge on green).
- Evidence grade: measured. Suggested: keep. Reason given: INT-3's your approval is the last word reads against merge on green.
- Decision: kept, 2026-11-03 17:35 UTC. Tag: X
- Note: none

### GAP-11 — kept

- Statement: A platform behaviour is measured once by default, more only when the first result is ambiguous or a failure recurs, and its row records how many tries. Bounds PLT-1.
- Source: Your words, 2 and 3 Nov (15 tries, not 20; measure once by default); PLT-1.
- Evidence grade: measured. Suggested: keep. Reason given: PLT-1 set no bound, which is how the repeated permission rounds grew.
- Decision: kept, 2026-11-03 17:36 UTC. Tag: X
- Note: none

### GAP-12 — kept

- Statement: A tranche's report also states BOB's idle time while work was ready and the minutes of Bob's it took. Extends PLN-6.
- Source: P19; P17; PLN-6.
- Evidence grade: proposed. Suggested: keep. Reason given: Makes urgency and your time measurable, so the mechanisms for them can be judged.
- Decision: kept, 2026-11-03 17:36 UTC. Tag: M
- Note: none
