# Point 3, "The first hour": the detail

Reading worker, 14 Nov 2026, second main session. Read-only: nothing committed, pushed, started or changed. Labels: **(V)** verified by me in this session against a primary source (command or file:line given); **(A)** an earlier auditor's report says so, not re-checked; **(J)** a judgement. Paths are under `/home/user/process3/process4/` unless they start with `/`.

## For the owner, in plain words

**What happened on 5 Nov.** A session is one running AI conversation. It runs on a cloud machine that is handed a copy of your repository when the session starts. Your approvals and the list of forbidden commands are read from that copy, once, at the start. On 5 Nov at 18:41 UTC you started ROOT, the first session, from your app, on the correct branch (the line of work the product is being built on). The machine was given a saved copy of that branch from about an hour before: seven changes behind, and without the approvals you had committed sixteen minutes earlier. ROOT's first check saw this and ROOT stopped, as told. Another session sent it one message; it fetched the newest copy and carried on. On 8 Nov the same happened, with the same saved copy, by then three days old. Proven: both starts are in Process3's log, and I checked the copy's age against the repository's history. Not proven: why the cloud hands out a saved copy, and whether it still does.

**The fifth draft's fix.** It asks you to make that branch the one GitHub opens by default. But ROOT was not on the wrong branch, and the setting does nothing about an old saved copy. What ran, twice, was ROOT fetching the newest copy, then starting the other sessions at an exact point in the history. Not proven: whether approvals read after a session has started count like those read at the start.

**How the process reaches a session.** A session should hold only the product's repository, but the process's tool and each role's instructions live in the process's repository. The fifth draft never says how they arrive. Your Keep and Drop Ledger does: the product names one fixed version of the process, and each session fetches a read-only copy of it. Process3 ran that way. You marked those lines "keep"; the draft omits them.

**Converting the repositories.** Before Process4 can run, three repositories need changes: the product's, the trial one and the process's. Some only you can make: new wording in your approvals, a changed list of forbidden commands, perhaps a GitHub rule. The draft gives no order and names nobody. Your present approvals forbid sessions to replace the required test run, so an edit of yours must come first. The trial repository refused sessions' last two attempts to save work there; why was never found.

**Five steps with nobody named.** For deploying, preparing a release and moving to a changed process, your earlier documents name the session that directs the build. The draft drops this.

**Yours to decide.** How many acts you accept at the start, in each of three repositories. Whether the default branch changes at all. Who carries out a product's move to a changed process once you approve it. Whether the directing session may write a new requirement into a module.

**Technical, for Claude to decide and report.** How ROOT gets onto the newest copy. The written order of conversion. Where the tool lives. Who archives finished sessions.

---

## 0. Wrong or stale in the handoff, the draft and the audits (found in this session)

1. **The run audit's limit on 8 Nov is stale.** `working/audit2_feasibility.md:30` says "for 8 Nov the record says only 'again' and gives no id", and `definition/process4_audit2.md:183` repeats it. The primary log gives the id: the same commit, `18935dc7`. Log line 1190: "new ROOT ... (Bob started it; first checkout was an old commit 18935dc7, fixed by fetching the tip; recorded 19:00:44Z)". (V: `git show origin/start/coordinator-4nov:notes/coordinator-findings-3-4nov.md`, line 1190, in `/home/user/process3`.) The auditor read the summary in `evidence/roles_root_coordinator.md:228`, which shortens it to "again on 8 Nov".
2. **The fifth draft's sentence is wrong three ways** (`definition/process4_definition_v5.md:293`: "a ROOT you started plainly came up on the main branch, which held old approvals, both times it was tried"). Not plain: he pasted a prompt of about 4 KB printed by the tool (log line 663; `evidence/roles_root_coordinator.md:97`, `:220`). Not the main branch: a commit that is on the tranche branch and not on main (V, section 2). Not "both times it was tried": he started ROOT from his app three times, and the first landed on the newest commit (log line 652, "Start check ok"). Drafts three and four had it right: "came up on an old copy, twice out of twice" (`definition/process4_definition_v4.md:330`). The error is new in the fifth draft.
3. **The drift audit repeats the draft's error**: `working/audit2_corruption.md:495`, "ROOT came up on the main branch both times". Already noted in `working/audit2_notes.md:137`.
4. **The audits call the missing route for the tool "new" and offer a structure for it** (`working/audit2_feasibility.md:64-65`). Bob's Ledger already holds kept lines that state the route (section 3). The fifth draft's own appendix says so: "how a product session reads the process is not said" (`definition/process4_definition_appendix_v5.md:124`). So this is not an open design matter; it is among the 53 kept lines the draft states nowhere.
5. **"Five steps have nobody named"** is true of the fifth draft's text. For three of the five, Bob's Foundations name the actor (section 5), and the appendix marks one of those lines "Kept as written" while noting "which session deploys is not said" (`definition/process4_definition_appendix_v5.md:370`).
6. **"The draft forbids the product's sessions to do it"** (`definition/process4_audit2.md:75`, on moving a product). The forbidding sentence, "No session building a product may ... adopt a changed process" (`definition/process4_definition_v5.md:264`), is Claude's, under "What follows". Bob's typed words say only who approves and who proposes the means (section 5, step 2).
7. **The run audit's claim that Bob's commit "cannot merge until that is built"** (`working/audit2_feasibility.md:38-47`) is reasoning, not a measurement. One fact against it: Process3's required test run takes its workflow file from the pull request itself (V, section 4). Whether a conversion change can pass GitHub's required check is untested either way.
8. **`working/trial_plan_facts.md:23` and `:377`** say a new throwaway repository must be created and that the probes repository "must not be used for the new trials". It was written before Bob typed "The throwaway repo that you need already exists: process3-probes." (`owner_words/bob_words_14nov_b.md:3`). Stale on that point; the handoff has it right.
9. Small: the probes repository has 310 branches today (V: `git ls-remote --heads`), not 312 (`working/trial_plan_facts.md:366`).

## 1. What the audits say

### The "four places before the first job merges"

The run audit states the count and never lists the four (V: the phrase occurs once, `working/audit2_feasibility.md:5`; the combined audit copies it at `definition/process4_audit2.md:13`). What it does give:

- Three findings rated "Stops the first hour": finding 1, ROOT stands on an old copy (`audit2_feasibility.md:24-36`, rating at `:33`); finding 2, no order or actor for the conversion (`:38-51`, `:48`); finding 3, no route for the tool and role texts, and nothing tells a plainly started ROOT what a ROOT does (`:53-66`, `:63`). `working/audit2_notes.md:16` maps "First hour" to exactly these three.
- Its walk-through, in order, of every stop before a job merges (`audit2_feasibility.md:301-307`):
  1. Before any session: Bob's commits cannot merge until the conversion is built and ordered (finding 2); the process repository's branch and approvals are not specified (finding 9); Process3's leftovers are untouched (finding 21).
  2. ROOT: it stands on an old copy (finding 1); nothing tells it what ROOT does and the tool is not in its repository (finding 3).
  3. ARCH's first hour: the mechanical edit's one allowed moment is after the jobs, yet the module list must be repaired before the first job (finding 8, `:121-133`, "stops the first round for the seven modules"); every change to the list needs a test run that answers on a change touching no module (finding 2).
- (J) Read by where the rating falls, the four are findings 1, 2, 3 and 8. Finding 4 (the notification, "Stops the first job's completion", `:73`) comes at step 8 of a job, after its merge, so it belongs to the "at least five more".

### Section 1 and the map of the combined audit

- Item 3: `definition/process4_audit2.md:21`. Item 4, the five steps: `:22`.
- Map, permissions and starting sessions: `:41`. Run audit "contradictory" (its row: `audit2_feasibility.md:385`); drift and requirements audits "stated but unproven" (`audit2_corruption.md:603`, `audit2_requirements.md:323`).
- Map, shared facts and waking: `:42` (`audit2_feasibility.md:386`, `audit2_corruption.md:604`, `audit2_requirements.md:324`).
- Map, recovery: `:43` (`audit2_feasibility.md:387`: "nobody archives"; `audit2_corruption.md:605`; `audit2_requirements.md:325`).

### Sections 3 to 6 of the combined audit, items bearing on this point

- Question 3, last sentence: who moves a product once he approves (`:75`). Question 5: how new work enters a module (`:85-91`). Question 9: the stop at each edit of his approvals (`:124-130`). Question 12: the watcher, and who notices a dead ROOT (`:154-160`). Question 14, fourth bullet: the cost to him of trial and conversion (`:175`).
- Section 4: "Claude was wrong about ROOT's start" (`:183`); two things listed as untried that the record already has (`:192`); "Named in a sentence, and not enough to build from": shared facts (`:204`), the tool and role texts (`:205`), the order of converting (`:206`), PROCESS after it starts (`:207`), who deploys and who prepares a release (`:208`), the tool's list (`:209`), who archives (`:210`), Process3's leftovers (`:218`).
- Section 5: "Before any trial can run": five decisions of Claude's, what must be built, and his acts in a written order in the trial repository (`:228-231`). Trial 3: whether a ROOT he starts acts on his typed prompt whatever copy it stands on (`:236`).
- Section 6 has no item on this point.

### The three reports, further detail

- Run audit, finding 1, best answer (`audit2_feasibility.md:35`): correct the sentence; let ROOT act on his typed prompt whatever copy it stands on; drop the approvals comparison for ROOT alone; ROOT finds the newest commit and starts the others by commit id. "Whose: Claude's to decide; needs a trial" (`:36`).
- Run audit, finding 2, best answer (`:50`): a written order with settings; "a sitting of Bob's of more than one act, in each repository". "Whose: needs the build; the count of Bob's acts is his to accept" (`:51`).
- Run audit, finding 3, best answer (`:65`): the product carries one line naming the process version; tool and texts fetched at that version as each session's first act; one short passage in the product's CLAUDE.md below his approvals. "Whose: Claude's" (`:66`).
- Run audit, finding 17 (`:225-236`): the trial repository needs the same conversion; the cost line in the draft leaves it out. Finding 21 (`:268-276`): Process3's sessions and hourly alarm may still be alive. Finding 22 row c (`:286`): the draft's table of his acts points to a passage that says nothing about the process's repository. Row i (`:292`): "how a plain start learns its role" is counted as decided though left to the build.
- Run audit, "Relied on by the draft and missing" items 1, 2, 4, 7, 8, 12 (`:340-351`); "The smallest set that must exist before any trial can run" (`:355-360`); "Probed and not found broken" (`:364-367`).
- Drift audit: the process repository's own approvals let sessions merge there, and it has no deny list (`audit2_corruption.md:93`); a product session can start a session on any repository, so "holds one repository" does not keep it off the process (`:100`); after a process change, standing sessions still carry the old role text (`:395`); the default-branch setting makes the unfinished branch what every visitor sees and hides main (`:544`).
- Requirements audit: the default-branch setting is a new act of his that rests on Claude's decision, and "restart ROOT after every edit" is Claude's consequence, not the record's (`audit2_requirements.md:227-228`); ROOT starting PROCESS crosses kept lines on one repository per session (`:260`); "Who writes the rest of the product's CLAUDE.md is not said" (`:262`).

## 2. The record of ROOT's start

**Primary record.** The Process3 coordinator's running log: `notes/coordinator-findings-3-4nov.md` on branch `origin/start/coordinator-4nov` of `/home/user/process3` (1,302 lines). It is a session's record. `origin/process-state` in `/home/user/process3` holds only GitHub-usage rows (V: `git ls-tree origin/process-state` shows one folder, `github`). The role addresses are on the product's `process-state` branch, which I read (below).

**What the log says** (V, exact):

- Line 652, 5 Nov 17:52: "NEW ROOT session_018BhcefQE6Fhbhczqxpav9v, started by Bob from his app (depth 0, no parent). Start check ok, recorded as root 17:45:45".
- Line 663, 18:35: "Bob committed the CLAUDE.md updates in all three repos (copy f575c3b1 18:25:29 UTC) ... New approvals hash 9d44cc63: every role stops at its next start check ... Restart: Bob starts ROOT from his app (notes/root-prompt.txt, regenerated at pin 89d87b9)".
- Line 667, 18:44: "ROOT 2 session_018BhceduipEp2mmEFHN9Diu (Bob's app, depth 0, approvals 9d44cc63): first start check failed (container on 18935dc7, older than the tip), it stopped correctly; on my message it stood on the tip, check passed, recorded 18:41 ... NOTE: the Bob-app ROOT clones the default ref, not the tip: the prompt's step 2 then fails; next time tell Bob to pick branch tranche (he did) - the clone was cached from earlier (18935dc7)."
- Line 1190, 8 Nov 19:15: quoted in section 0, item 1.

**Checked against the product's history** (V: a commits-only fetch of `tranche`, `main` and `process-state` into a scratch repository, then `git log`, `git merge-base --is-ancestor`, `git rev-list --count`):

- `18935dc7c400...` is "Merge job PR 458", made 5 Nov 17:32:56 UTC. It is in the history of `tranche`. It is not in the history of `main`. `main` stands at `0dea5a6`, 1 Nov, and is the repository's default branch (V: `git ls-remote --symref`).
- It was the newest commit of `tranche` from 17:32:56 to 17:46:33. Bob's first app-started ROOT was recorded at 17:45:50 (state-branch commit `066fceea4`). So that first start landed on the newest commit, and that commit is the one the two later starts came up on.
- At 18:41:16 on 5 Nov (state-branch commit `cb6359d83`, "address: root session_018BhceduipEp2mmEFHN9Diu") the newest commit was `f575c3b1f`, Bob's merge of pull request 550 at 18:25:29, his approvals edit. Between the two lie 7 merges on the branch's main line. The run audit's figures (`audit2_feasibility.md:30`) are confirmed.
- At 19:00:45 on 8 Nov (state-branch commit `2228150a8`) the newest commit was `535f05965`, Bob's merge of pull request 1067 at 18:02:46, again an approvals edit. The copy ROOT came up on was the same `18935dc7`: 73 hours old, 260 main-line merges (2,346 commits) behind.

**So, exactly.** Which branch: the tranche branch, which Bob had picked (log 667, "he did"). How old: about an hour on 5 Nov; three days on 8 Nov; the same saved copy both times. What went wrong: the copy held the approvals as they were before his edit, and was not the newest commit. Process3's first command, `start check`, compares the copy with the branch's newest commit and the approvals with those there; on a difference the session "acts on nothing" and reports (V: `origin/tranche:tool/lib/start.mjs:1-11`; ROOT's prompt step 2, `origin/tranche:tool/lib/roles.mjs:143`). ROOT stopped. Nothing else was lost. Both times ROOT then moved to the newest commit (on 5 Nov "on my message", from the coordinator), passed the check, and started the other roles (log 667, 668, 1190). At a first hour of Process4 no coordinator exists yet to send that message: ROOT starts it.

**What "came up on an old copy of the right branch" means for a cloud session.** A cloud session does not work on GitHub directly. A machine is prepared for it and a copy of the repository is placed on that machine. CLAUDE.md (the approvals) and `.claude/settings.json` (the deny list) are read from that copy when the session starts. On 5 and 8 Nov the copy placed on the machine was not taken fresh from GitHub at that moment. It was a copy kept from an earlier start: Process3's own code says "a branch name landed on a stale local copy of it in the saved container" (V: `origin/tranche:tool/lib/roles.mjs:119`; commit `d236302` of 3 Nov), and the log says "the clone was cached from earlier". The branch name was right; the contents were as that branch stood at an earlier moment. The session cannot know this unless it asks GitHub for the newest commit and compares.

- Proven (ran, recorded): the commit ROOT stood on, twice; that it was the commit of Bob's first app start; that a start by branch name landed old on 2 and 3 Nov and a start by commit id landed fresh, 1 of 1 (A: `evidence/permissions_inventory.md:266`; Bob's Foundations, `evidence/foundations.md:223`, which is his document, drafted by sessions); that a ROOT moved to the newest commit after starting went on to start the other roles, 2 of 2.
- Not proven: the platform's mechanism (I read no platform document that describes it; the two documentation pages I opened say nothing on it); whether it behaves the same today; whether Bob's app can start a session at a commit id; whether approvals a session reads after its start count as loaded (A: `audit2_feasibility.md:35`, "unmeasured"). Process3's check reads the file on disk, not what the session loaded (V: `start.mjs`, function `read`), so its "check passed" after the move does not show which text the session was acting under.
- (V) Process3 told a ROOT woken later to fetch and move to the newest commit before checking (`roles.mjs:129`, `:146`), but told a newly started ROOT only to check and stop (`roles.mjs:142-143`).

**What the fifth draft's fix would and would not have changed.** The fix (`definition/process4_definition_v5.md:293`, and his act at `:118`): make the tranche branch the default branch.

- Would change: a start where no branch is picked lands on the tranche branch, not on main. Main today carries the approvals of 1 Nov in a 3-line CLAUDE.md, an older deny list, and no process at all (V: the local clone of main). His commits on GitHub's website would open on that branch by default.
- Would not change: which copy of that branch the machine is given. On 5 and 8 Nov the branch was already right, and the copy was old.
- Also (A, J): on a public repository the unfinished branch becomes what visitors see (`audit2_corruption.md:544`). Process3's required test run has a rule keyed to the default branch (V: `process-gate.yml` at the product's tranche tip treats "the tranche into `$DEFAULT_BRANCH`" specially), which matters only if any of it is reused.

## 3. How a session gets the process today, and what the fifth draft says

**Process3, as it stands in the product's repository at the tranche tip `e7ec72e`** (V: `git show e7ec72e:<path>` in `/home/user/neobobkrause/civicsmith-copy` after a depth-1 fetch):

- `.gitmodules` names a submodule `.process` at `https://github.com/neobobkrause/process3`; the tree pins it at commit `38b0f3f`. That is the "fixed version": a pointer inside the product's tree, movable by any pull request.
- The pinned copy arrives empty. Every role's first command is `git submodule update --init .process` (V: `roles.mjs:142`; product `CLAUDE.md:19-20`).
- The tool is then run as `node .process/tool/p3.mjs <command>`. The one allowed push route in `.claude/settings.json` names that path: `"Bash(node .process/tool/p3.mjs github push *)"`; `git push` and every `gh` command are denied. Two retired hooks are still in the file.
- Role texts: the starting prompt is printed by the pinned tool (`start root`, `start bob`, `start watcher`, `job start`) and pasted or passed as the first message; it names "Acts you may take" and points to a rulebook in the pinned copy, `rulebooks/<role>.md` (V: `roles.mjs:140-148`; `origin/tranche:rulebooks/root.md`, 3.3 KB).
- The product's `CLAUDE.md` has his approvals (lines 1-15) and then four lines under "## Process3" (lines 17-22), copied from the process's `shims/CLAUDE.process.md`: the pin, how "to stand on the tip", "Your role prompt is the message that started this session ... Act only as it says; with none, act on nothing", and "Whoever starts a session archives it once its result is recorded".
- `process/config.json` names the process repository, the tranche branch, the lanes, the Cloudflare account and the environment variable names. Four of the eight workflow files are the process's (`process-gate.yml`, `process-record.yml`, `process-dev-release.yml`, `process-branch-prune.yml`).
- Main (the default branch) has none of this (V).

**Bob's documents on this** (his Ledger and Foundations, not his typed words of 14 Nov):

- Ledger, kept 31 Oct: "A session works on one repository, the product's; the process is a read-only clone at a pinned commit." (`evidence/ledger_lines.md:78`, line PLT-7.)
- Ledger, modified 3 Nov: "A product's CLAUDE.md is under thirty lines, hand-written, naming the pinned process commit and the one command that fetches it. Never generated by the model." (`:1087`, TXT-1; its note was written in by the coordinator.)
- Ledger, kept: "A product's tranche runs on one pinned process version from open to close, named in the plan; every session verifies the pin once at start and says so." (`:1280`, MNT-4.) "A product receives: the short CLAUDE.md, one skill, a settings file carrying the standing permission list, the gate workflow with install and trigger paths, the prune workflow. Nothing else, and a check fails on drift." (`:1382`, SHM-1.)
- Foundations: "Each role's starting prompt names its own rulebook in the pinned process (rulebooks/\<role>.md)" (`evidence/foundations.md:169`); the product's CLAUDE.md is "written by BOB line by line ... only its pin line is changed by the tool when the pin moves" (`:171`).

**Bob's typed words of 14 Nov.** "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`owner_words/bob_words_14nov_c.md:29`). The question it answers was the fourth draft's item 10: "ROOT's start: how a session you start with a plain prompt lands on your newest approvals." (`definition/process4_definition_v4.md`, section M.) His hint names the approvals and the settings file. It does not mention the tool or role texts. Also: "M3: the processes" (`:27`), on which repository PROCESS holds.

**The session's record of 13 Nov** (not his typed words), line 16 as the draft quotes it: "Your first prompt says you are starting or restarting development of a named product, names that product's repository, and says the Process4 development process is to be used." (`definition/process4_definition_v5.md:96`.)

**What the fifth draft says** (V):

- A session is started "with one repository only ... from the newest commit of the tranche branch; in Auto mode; and with starting instructions that name every act it may take. ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven." (`:291`)
- "So the process's tool is each session's only door to GitHub." (`:287`) The allow rule "must match Process4's tool, or no session can push" (`:297`).
- "The product's CLAUDE.md stays under thirty lines. The process has its own repository and one fixed version for each tranche, moved only with your prior approval." (`:309`)
- "No Process4 tool exists ... No Process4 role texts exist" (`:361-362`). "Builder: Claude, before anything is in force." (`:366`)

**What it leaves unsaid** (V by search of the draft: "submodule" 0 occurrences; "pin" only inside other words; "role text" once):

1. Where the tool and role texts physically are for a product session, and how they arrive.
2. What "one fixed version for each tranche" is physically, and so who can move it.
3. What a ROOT started by a plain prompt reads to learn that it is ROOT and what its acts are. The only ROOTs measured to work had the 4 KB printed prompt pasted in (A: `audit2_feasibility.md:59`). An act a starting text did not name was declined by the session itself 6 of 6 (A: `evidence/permissions_inventory.md:256`).
4. Who writes the part of the product's CLAUDE.md that is not his approvals (A: `audit2_requirements.md:262`).
5. That the kept Ledger lines above exist. The appendix lists them as not stated (`definition/process4_definition_appendix_v5.md:124`, `:305`, `:314`, `:322`).

## 4. Conversion

**The product's repository: what stands in the way today** (V unless marked):

1. `CLAUDE.md:21` at the tranche tip: "Act only as it says; with none, act on nothing." A plain-prompt ROOT is told to do nothing (the draft says this, `:363`).
2. `.claude/settings.json`: the only push route names Process3's tool by path; two retired hooks remain. Only Bob edits this file (A: `evidence/permissions_inventory.md:185`).
3. His approvals name "Process3", "BOB", "layer close", and a reviewer's exemption (`CLAUDE.md:3-11`).
4. His approvals forbid sessions to change the required test run: sessions may change workflow files "never adding or renaming a job whose name matches a required check ... and never making the process gate anything but the process's own shim at the pinned process" (`CLAUDE.md:5`). This is his committed text. The audits do not cite it in this connection. So no session may replace Process3's test run until he edits that sentence.
5. The submodule `.process`, the `process/` folder, the four process workflows, and the four "## Process3" lines.
6. GitHub's rule on the tranche branch requires a check named `gate`, with an empty bypass list (A: `evidence/permissions_inventory.md`, section 1f; live settings not read by anyone). His own approvals edits therefore go in as pull requests that the check must pass; that worked on 5, 8 and 9 Nov (V: merges of pull requests 550, 1067 and 1115 by "Bob Krause" on the branch's main line).
7. The run audit reasons that the conversion change itself cannot pass the old check (A, reasoning: `audit2_feasibility.md:47`). Against it (V): the check's own header says "The workflow file itself still comes from the pull request", and its comment says the base's pin judges and "removing the pin later is a record finding". Untested either way.
8. (A) 212 test files written for Process3's bookkeeping are in the product (`definition/process4_audit2.md:223`); the module list needs repair for 29 modules, four new ones, about 50 unowned files and 86 undeclared uses before the first job (`audit2_feasibility.md:305`).
9. (A, not determined) Process3's ROOT, its hourly alarm and other sessions may still be alive on the account (`audit2_feasibility.md:268-276`; `working/trial_plan_facts.md:521`). The product's state branch still names the 8 Nov ROOT (V: `addresses/root.json` at `c4c2529`).

**The trial repository, `neobobkrause/process3-probes`** (V by `git ls-remote` only: default branch `main` at `f353d60`; branches `tranche` at `23f6f65` and `process-state`; 310 branches):

- (A) Its tranche branch carries a pinned Process3, the "act on nothing" line, the Process3 required check and the allow rule naming Process3's tool (`audit2_feasibility.md:230`). Main holds his approvals of 2 Nov, an 11-rule deny list and a five-second test workflow (`working/trial_plan_facts.md:375`).
- (V) Sessions' last two pushes there were refused by the permission checker on 8 Nov: log line 1192 ("its auto-mode classifier refused the push (raw and via p3 github push)") and line 1194 ("'judged dangerous', no reason ... the refusal is probes-specific (its approvals block 9dfed29d as the classifier reads it) ... For Bob"). Line 1195: "Probes stays at c52faf45 (C39) until Bob looks." The cause was not found.
- So it needs the same conversion as the product, with his own commits, before any trial (A: `audit2_feasibility.md:227`; `definition/process4_audit2.md:231`).

**The process's repository.** PROCESS is to hold it (his hint, "the processes"). The branch `process4` is cut from `main` (V: `git merge-base HEAD origin/main` equals `origin/main`). Its `CLAUDE.md` is his approvals of 1 and 2 Nov, which let sessions "merge pull requests into working and tranche branches once their required checks pass, without a person's review" (`/home/user/process3/CLAUDE.md:3`), and it has no `.claude/settings.json` (V). The repository's `tranche` branch does have a 21-rule deny list and approvals restated on 8 Nov (V: `git show origin/tranche:.claude/settings.json`, `origin/tranche:CLAUDE.md`). Which branch PROCESS starts on, and what a product's "fixed version" points at, are unsaid (A: `audit2_feasibility.md:142`, `:148`).

**What the draft says about order and who.** Only this: "The product's repository is not converted ..." (`definition/process4_definition_v5.md:363`); "Builder: Claude, before anything is in force." (`:366`); his acts: commit approvals and the deny list "in the product's repository and in the process's (section I)" (`:124`), make the tranche branch the default (`:118`), connect GitHub and enter secrets (`:125`); "Wording changes only you can make" (`:297`); the trial's cost to him: "one sitting of about half an hour, one settings change, two session starts, one edit to your approvals and one 'stop'" (`:383`). No order. No session named. Nothing on the trial repository's conversion. Section I, which the acts table cites, says nothing about the process's repository (A: `audit2_feasibility.md:286`).

**What the audits say is missing.** A written order with, at each step, who acts and which GitHub rule is in force (`audit2_feasibility.md:50`); that it is "a sitting of Bob's of more than one act, in each repository"; the test run that answers on a change touching no module (`:40`); his acts for the trial repository (`definition/process4_audit2.md:231`); the cost restated (`:175`, `audit2_feasibility.md:235`).

**What Process3 did** (V: `origin/tranche:setup/DEVELOPER.md` in `/home/user/process3`). It had a written order: eleven steps of the owner's, "in one sitting", interleaved with the architecture session's acts ("BOB pushes the tranche (after Step 3) and runs the gate once (after Step 4)"). His approvals (step 9) and the deny list (step 10) were committed directly on the tranche branch before the rule that requires pull requests was created (step 11, "last: ... which stops direct commits to them"). Today that rule exists, so the same order cannot simply be repeated. Bob's Ledger, kept lines: "Shims are regenerated on GitHub's runner with the owner's token and merged by PR; a session never attaches a second repository to do it." (`evidence/ledger_lines.md:1393`, SHM-2); "A product with a tranche running at conversion carries it by one command" (`:1415`, SHM-4); onboarding (`:1404`, SHM-3). Foundations: one document of the developer's steps, "and BOB does every other part of onboarding" (`evidence/foundations.md:208`). The appendix lists SHM-2, SHM-3 and SHM-4 as "Kept; stated nowhere in the main text" (`definition/process4_definition_appendix_v5.md:323-325`).

## 5. The five steps with nobody named

For each: the fifth draft; Bob's typed words; his documents; what Process3 did.

**1. Writing new work into a module.**
- Draft: a module "has work" when "A requirement in its file is marked 'not yet met', or a walk flaw or a notification has been placed against it" (`:157`); ARCH "turns each flaw into work for a named module" (`:135`); walk flaws and notifications for modules with no open job sit in the shared state (`:147`). Nobody is named to write a requirement or its mark into a module's file.
- Typed, 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." (`owner_words/bob_words_14nov_c.md:35`.) "if flaws are found during an external walk those flaws are added to the next round" (`owner_words/bob_words_14nov_b.md:5`).
- His Foundations: the build state, "each module's requirements with their not-yet-met marks", "is written only through the process; it is what tells BOB what to do" (`evidence/foundations.md:106`).
- Process3: the architecture session wrote it. The tool's `found` command printed "BOB's plain pull request: one line, an unmet found mark ... appended to the module's requirement file" (V: `origin/tranche:README.md:85`). On the product's branch: 36 merges from `found/...` branches and 9 from `bob/...req...` branches (V: subjects on the main line of `tranche`).
- Whose: Bob's, as question 5 (`definition/process4_audit2.md:85-91`).

**2. Moving a product to a changed process.**
- Draft: his act is to "approve a product's move to the changed process" (`:119`); "No session building a product may change the process ... or adopt a changed process" (`:264`, Claude's sentence); "one fixed version for each tranche, moved only with your prior approval" (`:309`). Nobody carries it out.
- Typed, 14 Nov: "The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update." (`owner_words/bob_words_14nov_b.md:25`.) It names the approver and the proposer of the means. It does not name who does it.
- His documents: "A fix for a blocking flaw is adopted by a running tranche once, as an explicit recorded act that moves the pin; no job restarts for it." (Ledger, kept, `evidence/ledger_lines.md:1291`, MNT-5.) "the fix lands, BOB moves the pin, and the same job continues" (`evidence/foundations.md:137`). The appendix: "'No job restarts' is not stated" (`definition/process4_definition_appendix_v5.md:315`).
- Process3: a short session, started on the product's repository for that one change by a process-building session, opened a pull request from a `p3/pin-<commit>` branch, which merged through the check (V: `origin/tranche:README.md:53`; 99 such merges on the product's main line by subject, the last "Merge PR 1116: p3/pin-38b0f3f07f into tranche"; the audits count 116 moves, A). Late moves took 14 to 49 minutes each and sent open work back to re-run (A: `evidence/review.txt:231`).
- Whose: Bob's to confirm who may carry it out (`definition/process4_audit2.md:75`; `audit2_feasibility.md:149`).

**3. Deploying.**
- Draft: ARCH "has the product deployed to the development site" (`:135`); "So sessions run both" (`:183`); a job never deploys (`:137`); nothing built (`:364`). No session named.
- Typed: "So a deployment is a step in a tranche." (`owner_words/bob_words_14nov_b.md:5`.) "M7: sessions" (`owner_words/bob_words_14nov_c.md:28`). Standing approvals: sessions may "deploy and use development releases in every way development needs, in the product's own Cloudflare account ... deploy, configure, seed, reset and remove development deployments and their data, and run walkers and other tests against them" (`/home/user/process3/CLAUDE.md:3`).
- His Foundations: "deploying, releasing and acting on a live site are BOB's acts, not a job's" (`evidence/foundations.md:213`).
- Process3: the architecture session, through the tool; its prompt lists "development releases, and deploys at tranche end, as Bob's standing approvals allow" (V: `roles.mjs:106`); `deploy dev` and `release dev` are "BOB" commands (V: `README.md:81-82`); the two late runs ran on GitHub's machines (A). All 12 development deployments ended failing (A: `audit2_feasibility.md:155`).

**4. Preparing a release.**
- Draft: "The process prepares it and waits for your approval" (`:193`); his act, "Approve a public release" (`:122`); nothing built.
- Typed: "A release can (optionally) be started after a tranche completes." (`owner_words/bob_words_14nov_b.md:5`.) "installer and website are outside the tranche"; "installer and site updates wait for a clean development release walk" (`owner_words/bob_words_14nov_c.md:57-58`). Standing approvals: sessions may "cut development releases, with their tags and pre-releases in the product's repository"; never "publish a public release or promote a release to installed sites without my approval" (`/home/user/process3/CLAUDE.md:3`). The product's approvals also forbid sessions to change the website worker and the installer worker (V: product `CLAUDE.md:9`).
- Process3's decision record (a session's record quoting him, 8 Nov): "The process prepares the installer and website updates and runs them only through the protected GitHub environment that names Bob as required reviewer" ("Process, on my approval") (`evidence/DECISIONS.md:93`); "BOB starts the job that builds the installer-update workflow"; "The scoped deploy token is Bob's to add to that environment" (`:109`).
- Process3: none cut. The newest tag is v0.71.0 (V: `git ls-remote --tags`). `release-sign.yml` exists, "Started by hand (Actions tab, or BOB with the GitHub tools)", and waits for his approval (V). The installer and website workflows do not exist (A: `evidence/DECISIONS.md:107`).

**5. Archiving finished sessions.**
- Draft: the word "archive" does not occur (V: 0 matches).
- Typed, standing approvals: sessions may "start, message, interrupt and archive Claude sessions on this account" (`/home/user/process3/CLAUDE.md:3`).
- His documents: a Ledger note "written in by the coordinator" as his word in chat of 3 Nov: "archiving sessions and switching off or deleting tasks are housekeeping, counted and reported, never needed for correctness" (`evidence/ledger_lines.md:27`; Foundations `evidence/foundations.md:177`). Not text he typed.
- Process3: "Whoever starts a session archives it once its result is recorded ... ROOT's hourly sweep archives leftovers" (V: product `CLAUDE.md:22`, a session-written line). Recorded: "21 finished job sessions archived by ROOT's cap sweep" (A: `evidence/roles_root_coordinator.md:108`); one session with unpushed work was archived and the work lost (A: `evidence/permissions_inventory.md:228`); new starts failed silently at about 50 live sessions, one event (A: `:251`).
- (J) At about 177 jobs a round, archiving stops being housekeeping: without it starts fail. That sits against the Ledger note above.

## 6. Whose decision each thing is

### Bob's

1. **The acts he accepts at the start.** What it is: the conversion needs acts only he can take, in three repositories (product, trial, process): at least an approvals edit and a settings-file edit in each, and possibly a GitHub rule lifted and restored. The draft counts for the trial "one settings change ... one edit to your approvals" and nothing for conversion. Options: (a) accept a sitting in each repository, from a written order Claude gives him first; cost, more acts than the draft states, exact number not yet known. (b) ask that sessions do more of it; cost, his approvals must first be widened by him, since they now forbid sessions to change settings or to replace the required test run. Source: `definition/process4_audit2.md:175`, `:231`.
2. **Whether the default branch changes.** It is his setting and his public repository. It does not cure the fault it was chosen for. Options: (a) leave it; cost, he goes on picking the branch when he starts ROOT, as he did on 5 Nov. (b) change it; cost, one act per repository, the unfinished branch becomes what visitors see, main is hidden. Whether (b) helps anything else is Claude's to report.
3. **Who carries out a product's move to a changed process.** His words name the approver and the proposer, not the doer. Options in the record: (a) a session on the product's repository (Process3's way, and his Foundations' "BOB moves the pin"); cost to him, none beyond his typed approval; nothing physical holds it. (b) his own merge on GitHub's website is both the approval and the move (the drift audit's suggestion, `definition/process4_audit2.md:75`); cost, one act for each approved change; never measured.
4. **How new work enters a module** (question 5). (a) ARCH writes requirements and their marks, read as not "editing a module"; no cost to him; it is a reading of his rule. (b) only through the module's own job; a job start for each.
5. **The watcher and a dead ROOT** (question 12) bear on his acts at each start. Not repeated here.
6. **For the trial only:** whether trial sessions run in the cloud environment that holds the product's real deploy tokens, or in a separate empty one, which costs him one more approval (`working/trial_plan_facts.md:446`). And a look at his session and task lists for what Process3 left (`:521`).
7. **Not a decision unless Claude proposes a change:** his kept Ledger lines on how the process reaches a product, on one fixed version per tranche, and on conversion (PLT-7, TXT-1, MNT-4, MNT-5, SHM-1 to SHM-4). They stand until a proposal he answers says otherwise. Two of them meet his words of 14 Nov and would need a proposal: "every session verifies the pin once at start" (the draft ended the version check on "three tests and no others") and the Ledger note that archiving is "never needed for correctness".

### Technical, for Claude to decide and report

1. Correct the sentence on ROOT's start; decide how a ROOT he starts gets from whatever copy it is given onto the newest commit; decide whether the approvals comparison applies to ROOT; start the others by commit id. One trial is owed: whether approvals read after the start count.
2. State how the tool and role texts reach a session, starting from his kept lines; state what a plainly started ROOT reads.
3. Write the order of conversion for each repository: each step, who acts, which GitHub rule is in force; the test run that answers on a change touching no module.
4. Name the session that deploys, the one that prepares a release, and the one that archives.
5. The branch PROCESS starts on; the place for shared facts; what is done about Process3's leftovers; whether the first trial has a watcher.
6. Whether the old-copy fault can be reproduced in the trial repository at all (not determined: `working/trial_plan_facts.md:524`).

### Proven and not proven, in one place

- Ran and recorded in Process3: a ROOT started by Bob on an old copy moved to the newest commit and started the other roles (2 of 2); sessions started by commit id landed fresh (1 of 1); the pinned read-only copy fetched as each session's first command (every session, 1 to 9 Nov); a session on one repository starting a session on another (each coordinator from 5 Nov); the eleven-step conversion of the product on 1 and 2 Nov.
- Never run: a ROOT started by a plain prompt with no role text; any Process4 tool; any conversion from Process3 to Process4; a conversion change passing or failing GitHub's required check; the default-branch setting; a push by a session in the trial repository since the two refusals of 8 Nov.
