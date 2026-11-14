# Section K, points 1 to 7: evidence for Bob's decisions

14 Nov 2026. Research worker's findings. Read-only: nothing was changed, committed or pushed in any repository.

## How to read this

- **Measured** means a count taken from git or from a stored report, either by a named evidence file or by me today. **Judgment** means someone's reading, mine included; each is marked.
- **Sources.** The handoff files in `/home/user/handoff/`. The clones `/home/user/repos/process3` and `/home/user/repos/civicsmith-copy` (made today by a sibling worker; I only read them). The coordinator's running log, `notes/coordinator-findings-3-4nov.md` on `origin/start/coordinator-4nov` in process3 (1,302 lines; "LOG Ln" below). My own scripts are in the session scratchpad and are not kept.
- **Bob's words.** A line in quotation marks after "Bob" is quoted in the source as his. Where the source only paraphrases him I say so, because his decision of 13 Nov is that only words he wrote count as his.
- **The decisions of 13 and 14 Nov.** No handoff file holds their full text. I quote them only as far as `process4_disposition.md` and `audit_D_central.md` quote them.
- **What I could not read.** The GitHub API is not attached to this session (attaching it would mint credentials, which my brief rules out). Pull-request comments, where each gate run posted its findings, are therefore unread. This limits K1 and K4.

---

## K1. Two checks beyond the three tests

### K1(i). The check that a job's pull request wrote only its own module's files

**(a) Bob's documents**

- ARC-2, kept 31 Oct 01:44 UTC, no note: "Each file has one owner module; a job writes only its module's paths and tests and the strike of its own marks." The page's own points: for, "Working today. / Makes parallel jobs safe from overwriting each other. / A simple check."; against, "Shared files such as configuration need a designated owner. / A fix that spans modules needs two jobs or a BOB ruling."
- Foundations, "A job's life", step 4: "It writes only its module's files and tests (ARC-2), strikes only its own marks (REQ-4), and never commits a generated artifact (JOB-8)."
- Foundations, "What the checks defend against": "The tool's checks hold against mistakes (a session that edits a settings file, touches another module, resolves a merge with an old copy, merges something red or stale, or moves the pin somewhere unreleased) and against outsiders' fork pull requests."
- Ledger map: "ARC-2 | One owner module per file | gate and merge | Built".
- Decision of 13 Nov as quoted in the disposition: "Each module is updated and tested by a single job"; "exactly three tests and no others, ever".
- Disposition row 28: conflict for the owner. Its note: "No evidence against the check: one false refusal, repaired on 3 Nov (change_sample PR 46, cited by audit A)."
- Section H of the draft records that on 13 Nov Bob confirmed three sibling checks end (new tests fail when the change is undone; the second run on the merged result; built files match their sources). He has not ruled on this one.

**(b) What Process3 did**

How it was built (read from `tool/lib` at `origin/tranche` of process3):

- It ran in the test run on GitHub and again at the merge. In the test run: `gate.mjs:153`, for each changed file not under the module's own paths, a finding "job <id> may not change files outside its module". At the merge: `merge.mjs:433`, the merge tool refused with "<branch> changes files outside its module".
- By the end the same rule was applied in two more places: the command by which a job published its work "refuses any file outside your paths" (`job.mjs:171`), and the command that took another branch's work into a job refused files outside the module's paths (`job.mjs:666`).
- The rule was also in every job's starting text: "Not yours, and this line wins over any act above: ... editing ... another module's files" (`job.mjs:189`).
- A module's own paths were its ledger entry's `paths` and `tests`, its requirements file, and its own two record files (`gate.mjs:67`). The merge tool read the paths from the tranche's copy of the entry, never from the job's branch.
- The merge tool repeated the check because "it repeats the checks a pull request could switch off in its own copy of the gate workflow" (`merge.mjs`, header comment).

How often it fired: **not found.** The gate's findings were posted as pull-request comments, which I could not read. The gate rows kept in git "carry no reason field" (product_side, "What could not be established"). Related counts that are measured:

- 1,187 gate runs on 207 job pull requests, 3 to 5 Nov: 113 red (9.5%); "74% went green with no change to job code or tests". The audit listed "ownership/ledger" under KEEP and gave it no count (LOG L681, the coordinator's check audit of 5 Nov; the audit document itself is not in the repository).
- 6 to 9 Nov: 70 of 789 gate runs red; 43 red with the module's tests passing; the reason is not recorded (product_side §9.3).
- Of 171 "block" messages jobs wrote in November, none names the ownership check or its refusal text. 34 say the fix needed lies outside the job's own paths and hand it to the coordinating session (measured by me, keyword search of the block commits). product_side's larger figure, 69, counts "a record, ledger or paths check" together.

Real cross-module writes against false alarms:

- Measured by me from git today. I took every commit a job brought to a merge (506 job merges on the tranche and layer branches, 2,414 commits) and every unmerged commit on job branches (25 branches, 126 commits), and compared the files each commit changed with the module's own paths as its ledger entry lists them at the last tip.
  - Commits that changed another module's source or tests: **0 of 2,540.**
  - One pull request (57, `bundler`, 3 to 4 Nov) changed a file outside its paths, a workflow file, and undid it before merging: "leave deploy-test.yml as the tranche has it (a workflow edit is Bob's)".
  - One commit (pull request 365, `op-grades`, 5 Nov) wrote a new requirements file that a later split made another module's. That is a by-product of the size cap (section I item 3), not a cross-module write.
- Limit of that measurement: it uses each module's paths as they stood at the end. Where the check fired because the list of paths was wrong and the list was then widened, my count cannot see it.
- Known false alarms, each from the map or the tool and none from a job writing another module's code:
  - 3 Nov: "Every layer-1 job on the copy failed the ownership check when it cleared a mark; BOB worked around it" (change_sample PR 46). The check was loosened 47.6 hours after it was added.
  - 5 Nov: "ledger: case-authoring and queue paths gain their requirements-notes files (PR 456, 455 ownership findings)" (product commit `c40b90c79c`).
  - 7 Nov: "screens-ai's entry had empty paths and tests, so the gate fails ownership on every screens-ai file" (product commit `651461f5ca`).
- No recorded case in Process3 of the check stopping a job from overwriting another module's code. **Judgment (mine):** the measured record cannot tell whether jobs kept to their module because of the check or because their instructions said so. Every job's starting text carried the rule, and 117 of the 220 job entries also say "Edit no other module" (my count).

**(c) Options, with cost and risk**

1. **The check ends; the rule rests on the job's instructions.** Cost to Bob: none. Risk: two parallel jobs overwrite each other's files, the case ARC-2 names. Measured rate of a job writing another module's code in Process3: 0 in 2,540 commits, while the check existed in up to four places.
2. **The check stays, read as part of the first test.** The first test already carries one check that is not a test of behaviour ("the uses the module declares match what its code imports"). Cost to Bob: none in acts. Risk: it needs a correct list of every module's files; each of the three recorded false alarms came from that list or from the tool, and each stopped jobs until a session repaired it.
3. **The rule is held inside the merge tool, with no separate check.** The merge tool is the only way a session can merge. **Judgment (mine):** a refusal inside the merge tool is still a check by another name; section H counts such things as checks.
4. **A GitHub setting holds it.** See (d): none is available on this repository.

**(d) Constraints**

- GitHub cannot restrict which files a push may change on a public repository: "Push rulesets are available for the GitHub Team plan in internal and private repositories" (levers §1, from GitHub's documentation). Both repositories are public.
- Making the repository private to get that rule "forfeits free Actions minutes, the merge queue ... and required reviewers on environments (public-only below Enterprise)" (levers, line 126). The release approval in section C of the draft depends on a required reviewer on an environment.
- CODEOWNERS can only require a named person's review of a path. That makes Bob a reviewer of merges, which is against unattended running and against his act list.
- The deny list is one file per repository, committed by Bob. It cannot differ per job unless a session writes settings files, which the permission checker judges case by case (PLT-2) and which permission management as preserved does not allow. **Judgment (mine).**
- "Exactly three tests, and no others, ever", read with Bob's confirmation of 13 Nov on the three sibling checks, points to option 1 unless he reads this check as part of the first test.

### K1(ii). The install-from-scratch test and the upgrade test before a public release

**(a) Bob's documents**

- Foundations, "Where the process stops": "A development release stops as a draft, deployed only as a development deployment in the product's own account, and the Release workflow runs an install-from-scratch test and an upgrade-from-previous-release test as release-tier fixtures before it does." This is disposition row 263, F-STOP-2: purpose kept, mechanism open.
- No Ledger line asks for either test. The canon analysis lists them as A26 and A27 with no phase and no builder ("—").
- BD-R4, Bob, 8 Nov, on the product's existing migration test: "There are no earlier versions of the plane that exist. So migrate-released need only look at perhaps the last 2 or 3 versions just to make sure that the migration process actually works." (The record adds "the last 3 releases (the coordinator's reading of "2 or 3", the safer end)".)
- BD-R3, Bob, 8 Nov: "build the installer only when the internal walk completes without the need for another round, and build the site update only once the external walks complete without the need for another round."
- The disposition gives both readings: "Tests outside the three; they end ("no others, ever")" against "tests of release packaging that D6, which speaks of rounds, does not address".

**(b) What Process3 did**

- **Neither was built as a release-tier test, and neither ran.** Measured by me: the product's release configuration (`process/config.json`, `release.checks`, at `origin/layer/14`) holds two checks, "setup-words fresh" and "fleet bundles". Neither installs from scratch or upgrades.
- **No release of any kind was cut.** "So NO release dev for round 1" (LOG). No tag beginning `p3dev` is on the product's remote (measured by me; a development release would have pushed one). All 12 development deployments ended `ok: false` (product_side, re-read by me in `deploys/dev.jsonl`).
- **The product already has an upgrade test, as a module test.** `bio-plane/test/system/migrate-released.test.mjs` is listed in the `plane` module's own tests (its ledger entry at `origin/layer/14`). Its header records why it exists: "Every release from 0.59.0 to 0.63.0 BRICKED an existing store ... The battery never saw it because every suite builds a FRESH store ... DIST found it live on biosmoke7, at 0.62.0."
- **The installer has module tests too:** `newgroup/test/` and `bio-plane/test/system/newgroup-bundle-fresh.test.mjs`, in the `installer` module's entry. The internal walk also walks the installer's pages (journey 28, for example "install: the installer's first page", in the stored walk report).

**What the two tests would catch that a scripted walk would not**

- **Upgrade.** A walk runs on a fresh copy. Every development deployment is "a whole fresh copy named `p3dev-<slug>`" (levers §7). A fault that appears only when new code meets data written by an older release cannot show on a fresh copy. The migration test's own header is the recorded case.
- **Install from scratch.** Development deployments are made by the product's deploy scripts over Cloudflare's interface, not by the installer (levers §7, §8.1: "The product's own install path (the REST deploy, the installer) is not exercised"). **Judgment (mine):** a walk therefore proves the product runs once deployed, and proves the installer's screens, but not that the installer can place a signed release into an empty account.

**(c) Options, with cost and risk**

1. **Both end as tests of their own; what exists stays where it is.** The upgrade test and the installer's tests remain module tests of `plane` and `installer`, inside the first test. Cost to Bob: none. Risk: they run only when those modules' own files change, so an upgrade fault introduced by another module is seen only if the notice to `plane` leads its job to run that test. **Judgment (mine).**
2. **Both are kept as steps of preparing a public release.** Cost to Bob: none in acts; they run before he is asked to approve. Risk to the product: none added. It is a fourth and fifth test unless he reads release preparation as outside "three tests".
3. **The external walk is made to cover them:** it walks a copy installed by the installer, and a copy upgraded from the last release. Cost to Bob: none in acts. Risk: unbuilt and unproven; the external walk took 60 and 64 minutes each time it ran (measured, product_side).
4. **Both end, nothing replaces them.** Risk: the first public release that meets an existing group's data is the first test of upgrading. The recorded history is releases 0.59.0 to 0.63.0, each of which broke existing stores.

**(d) Constraints**

- "Exactly three tests, and no others, ever" rules out option 2 unless Bob says release preparation is not a test in his sense.
- Bob's own word of 8 Nov (BD-R4) keeps the migration test, bounded to the last two or three releases. Option 4 would drop what he chose to keep five days earlier.
- A public release needs his approval in any case, so options 2 and 3 add no act of his.

---

## K2. Set-up acts on the Claude side

**(a) Bob's documents**

- P17, modified 3 Nov; the stored note is a copy of the suggestion: "Keep it whole after onboarding; no Ledger line holds it today. Your word, 3 Nov: during onboarding the platform forces a few GitHub steps of yours; keep those as few as possible, each walked through."
- Foundations, "The human and the AI": "You do not edit files or enter commands; the few steps of yours the platform forces at onboarding are kept as few as possible and each is walked through (P17)."
- Foundations, "Setup": "One document, the developer's steps ... lists only the acts the developer must take, each with why ... What the check cannot read (secrets, Actions settings, collaborators, the cloud environment) is confirmed there once." (F-SET-4.)
- Foundations, "Deploy tokens": "Onboarding adds the product's deploy tokens to the cloud environment as environment variables, the one route both the deploy tools and setup check were measured to read (2 Nov)". (F-SET-8b; section I item 12.)
- Foundations, "Moving accounts": "development can stop under one Claude account and restart under another on one plain request (your word, 2 Nov; GAP-8): ... the developer recreates the cloud environment and Claude's GitHub connection from a page the process writes".
- GAP-8, kept 3 Nov 17:35 UTC, no note; source "Your words, 2 Nov about 18:58".
- Decision of 13 Nov, quoted in audit D: "The user doesn't enter commands nor edit source files. The only actions he will very occasionally take are changes to GitHub or Cloudflare settings related to permissions or rules."

**(b) What Process3 did**

The acts, exactly (process3 `setup/DEVELOPER.md`, 11 steps, and `rulebooks/account-switch.md` section 2):

1. **Connect Claude to GitHub as the session account** (Step 3). In a private browser window: sign in to GitHub as the second account, accept the repository invitation, open claude.ai's GitHub connection page signed in to Claude as himself, and authorise with the second account showing. Why: "If it is connected as you, every session would act as the owner, and the rules below would not hold them."
2. **Install the Claude GitHub App on the repository** (Step 2). This is on GitHub's side, as owner.
3. **Put the deploy token into the Claude cloud environment** (Step 8). Create the Cloudflare token (Cloudflare's side), then on claude.ai open the environment's settings and add each variable the product lists, "as an environment variable (not under Network secrets)". The product lists 11 names. "The variables reach only sessions started after you save."
4. **At an account switch,** on the new Claude account: connect GitHub as the session account; install the App; "Recreate each product's cloud environment: its network, its setup script, its variables and the network secret for api.cloudflare.com, with the values only Bob holds"; share the documents; start the first session.

How often (my count from the record; the dates are the record's):

- Onboarding, 1 to 2 Nov: once.
- Account switch of 5 Nov: GitHub connected twice. The first connection was as Bob's own owner account, so "06:23 every job start refused"; the second was as the collaborator. "Cost: 0 jobs live 05:44-07:18 (94 min at 0/20, against 19/20 at 05:20)."
- 6 Nov 19:19Z: GitHub suspended the session account. A new session account followed; every merge from 7 Nov is by `believeinoakland` (permissions_inventory).
- 7 Nov: a second account switch was prepared and cancelled. Bob: "The account switch didn't work... So start everything back up here in this account." Cost "about 9.5 h" (LOG L1067, L1075).
- So in nine days: three occasions that needed these acts, and a fourth that was abandoned. Bob, 6 Nov, on why switches happen: "I'm watching weekly usage. So I'll let you know when it's time to start shutting down development under this account and prepare for the move to another." (LOG L980.)

Can a session do any of them?

- **GitHub's settings: no.** Measured 1 Nov: setting branch protection from a session was "Refused by the proxy, 2 tries"; sessions also cannot read Actions settings, secrets, collaborators or environments (permissions_inventory).
- **Claude's GitHub connection: no tool for it.** The tool a session has for reaching a repository tells it, on refusal, that "the user should reconnect GitHub under claude.ai Settings → Connectors". Observed in this session's tool descriptions today; not a Process3 measurement.
- **The cloud environment: in part.** Observed in this session today, not trialled as a Process4 route:
  - A session can read its environment's variable names, never the values. This account's environment, named "BIO", shows 16 names, among them the 11 the product lists, one network secret for `api.cloudflare.com`, and a setup script. It reads as editable by the session's proposal.
  - A session can propose a new environment or an edit: network hosts, a setup script, and variables that are not secret. Each proposal shows Bob an approval prompt "every time, in every permission mode", and "nothing is created unless they approve".
  - A session must not put a secret into a variable. For a secret, a session can ask the platform to show Bob a secure form; the value is stored as a network secret that the platform adds to requests to one named host. The session never sees it.
  - Process3's deploy tools read the token from an environment variable, and its steps said "not under Network secrets". The signing seeds are not credentials for a web host. **Judgment (mine):** so the token values still pass through Bob's hands, and whether the network-secret route can replace the variable for deploying is unmeasured.
- **Starting the first session on a new account: no.** Sessions are created only by a person, by ROOT, or by a scheduled task, and a task's fresh session could not start sessions, "0 of 3" (2 Nov).

**(c) Options, with cost and risk**

1. **Accept them as listed acts, outside the two kinds of setting.** Cost to Bob: about one sitting per product start and per account switch. Risk: the one recorded mistake, connecting GitHub as the owner, was part of a 94-minute outage: job starts were refused at 06:23 and everything was closed again at 06:37.
2. **Accept them, and have sessions prepare what they can:** a session proposes the environment and its non-secret variables, and Bob approves a prompt and types only the secret values. Cost to Bob: fewer steps, but each proposal is a prompt that waits for him. Risk: unproven; a prompt that waits for Bob stops that session while nobody watches. **Judgment (mine).**
3. **Not accepted: the definition must show each done without him.** The evidence says it cannot be done for the GitHub connection or for secret values.

**(d) Constraints**

- The decision of 13 Nov names only GitHub and Cloudflare settings. These acts are on claude.ai, so they are an exception he must grant or refuse; the platform leaves no third way for the connection and the secrets.
- Permission management as preserved requires that sessions act as a second GitHub account that "can push and merge but cannot change settings". That is exactly what Step 3 sets up. Skipping it means sessions act as the owner.
- "Bob enters no commands and edits no source files": none of these acts is a command or a source edit. They are clicks and pasted values in two web pages.

---

## K3. Bob's approval before one particular merge

**(a) Bob's documents**

- GAP-10, kept 3 Nov 17:35 UTC, no note: "Review findings go to the job as diagnosis and review is never the merge gate; a green gate merges without Bob, who approves a particular merge only when he asks to. Replaces INT-3."
- INT-3 (31 Oct), which it replaced: "Branch protection plus your approval is the last word." The page's "against": "You become the approver for every merge unless you delegate that to the green check alone."
- Foundations, "The human and the AI": "Approving a merge is such an act only when you ask for it: by default a job, layer or tranche merges on a green gate without you, while a public release waits for your approval (GAP-7), and you ask for your approval before a particular merge when a design is hard enough to warrant it (GAP-10)."
- Foundations, "Review": "the tool merges without you by default; you ask for your approval before a particular job, layer or tranche merges as the exception, not the norm (GAP-10, replacing INT-3)."
- Disposition rows 57, 123 and 239: all KEEP. Section 5 gives both readings: "A gate; it ends, and under D2 nothing waits for him" against "His own option, used only when he asks; not part of the process's tests."

**(b) What Process3 did**

- **Used: not found.** I searched the coordinator's log for Bob asking to approve a merge before it happened and found no case.
- **How it was built: no mechanism of its own.** The ledger map marks GAP-10 "Merge on green without Bob | merge | Built", which is the default half. Nothing in the tool marks one pull request as waiting for Bob. The nearest things:
  - The GitHub rule on the main and tranche branches required no approving review ("required_approving_review_count": 0), so Bob could merge any pull request himself on GitHub's website.
  - The merge tool refused some kinds of change and said "that needs the owner's word: bring it to Bob": a workflow file change outside set limits, a change to the process pin's source, a deleted config (`merge.mjs` lines 639 to 708).
  - A "hold" row could keep a module's work from starting (`hold.mjs`); it held starts, not merges, and "no hold needs Bob".
- **Merges Bob made himself** (measured by me from the first-parent history; reading the author and the title format is my judgment):
  - 6 Nov: product pull request 625 and process3 pull request 188, both changes to workflow files, which the tool held for his word. These two carry GitHub's own website merge title and the log says "Bob merged process3 188 and copy 625". They are the only merges of session-written work that are clearly his own clicks.
  - 1 Nov: the first builds, the first two job merges (pull requests 3 and 9) and the first pin moves carry his name. The second GitHub account's first merge is on 2 Nov, so on 1 Nov sessions may have been acting through his own GitHub connection. Git cannot tell his clicks from theirs.
  - 5 Nov: seven merges carry his name (five in the product, two in process3) because Claude's GitHub connection was his own account for about half an hour. Those were sessions, not him.
  - The rest of the merges and commits under his name are his own edits to his approvals (14 patch merges on the product's tranche).
- None of these was his choice to look at a hard design before it merged. Each was forced by the tool or by the platform.

**(c) Options, with cost and risk**

1. **The option stays, by word:** Bob tells the coordinator "do not merge module X's job until I say", and says so again to release it. Cost to Bob: nothing unless he uses it; when he does, two messages. Risk: that module's job stays open until he answers, the module can take no further job, and modules that use it wait for its notice; other modules carry on.
2. **The option stays, by a click:** he approves or merges that pull request on GitHub's website. Cost: one click, which is not on his act list and is neither a command nor a setting. Risk: as option 1. How the merge tool would know to wait is unbuilt.
3. **The option ends.** Cost: none. Risk: he loses a lever he has never used. He can still add work after the merge, or stop development by word.

**(d) Constraints**

- The decision of 13 Nov: "It doesn't block waiting for user input unless it is completely blocked". A held merge is a wait on him. It is at his own request and holds one module, so it does not stop the process; whether that fits is his reading to give.
- His act list in section B has no such act. Option 1 needs none: "Tell the coordinator things in conversation" is already there.
- "No review by a fresh reviewer" is about sessions reviewing sessions and does not bear on his own approval.
- Only words he wrote count as his, so the coordinator must pass on the hold and the release in his exact words.

---

## K4. The two numbers that judge the process

**(a) Bob's documents**

- SES-12, kept 31 Oct 02:16 UTC, no note: "Two health metrics from day one: the false-done rate caught by independent re-verification, and cost per PR that survives a revert window." Source: "the only field number for false-done is about one in eleven". The page's "against": "The revert window delays the cost number. / Needs the receipt and revert check, JOB-7 and JOB-12, to compute false-done."
- Foundations, "The shape in one paragraph": "The process is pinned per tranche, fixed only by a recorded act, measured by its false-done rate and its cost per surviving pull request".
- Foundations, "Maintenance": "judged by two numbers neither earlier process measured"; "False-done rate: the share of COMPLETE claims refuted by the gate's re-run and revert check."; "Cost per surviving pull request: tokens or dollars per PR still in place after a two-week revert window."
- Foundations, "To measure on the first tranche": "The two health metrics of the previous section are measured from day one and have no decision date; they are the standing judge of every other line."
- Other measures in his documents:
  - P1, modified 3 Nov, note in his own first person: "Keep as Process3's purpose, with my 3 Nov words added: quickly and cheaply, behaviour that survives, my time only where it is mine."
  - PLN-6: "A tranche's report states elapsed time, work finished, deferrals with reasons, work left, cost, and the share of cost that was process overhead."
  - GAP-12: "A tranche's report also states BOB's idle time while work was ready and the minutes of Bob's it took."
  - Foundations, "Measurement": "commits by purpose, sessions per job, gate runs per merged job, restarts and tokens by role".
  - Decision of 13 Nov, quoted in the disposition: "A round that completes without any failures ends a tranche".
- **Not found:** any line of Bob's that names walk steps passing, or working behaviour merged per day or per dollar, as a measure. The nearest text is the coordinator's, published to Bob on 5 Nov: "velocity (marks closed per calendar hour, net), efficiency (merges per working session-hour, overhead per PR), quality (false done, rework), capacity as diagnostic" (LOG L341). It was built into the tool's report; it is not his wording.

**(b) What Process3 did**

- **Neither number was ever produced.** No false-done figure is stored in the product's record (I searched the state branch and the product tree). The tranche never closed, so no tranche report was written. The survival window was to be read on 16 Nov, a week after the stop (canon_analysis: "survival read 16 Nov").
- **False-done, the parts that exist:**
  - 693 "job complete" claims in the week, across 169 modules, a median of 3 per module and 21 at most (measured by me from `process/metrics` at `origin/layer/14`).
  - "of 20 refuted job claims today none came from another module's failure" (commit message of process3 pull request 118, 4 Nov, attributed there to Bob at 17:15). 155 claims had been made by that hour (my count). That is about 13% for that day. **The division is mine, across two sources.**
  - "Ten of the twenty "false done" findings that week were the revert check tripping on tests that pass either way by nature" (review.txt). I could not reconcile "today" with "that week".
  - 6 to 9 Nov: 5 of 789 gate runs had failing module tests (product_side §9.3).
- **Cost per surviving pull request, the parts that exist:**
  - Survival: 98.8% of merged source lines and 98.4% of merged test lines were still present at the last tip (measured, product_side §5).
  - Cost: 229 cost rows were written for the 693 claims. 123 hold a figure and 106 say "unmeasured". The figures sum to 912.79 dollars, median 2.45, largest 255.37. 111 of the 123 are from 4 and 5 Nov; 8 are from 6 Nov or later (measured by me). So no cost per pull request can be computed for the week.
- **Would they have read healthy?** That sentence in the draft rests on the disposition's note: "218 of 220 jobs read COMPLETE and 98.8% of landed lines survived while 147 of 157 live walk steps failed, so both metrics would have read healthy on a product that did not work." This is **the disposition author's inference**, not a reading of the two numbers. 218 of 220 complete is not the false-done rate. The one day with a usable count gives about 13%, which is worse than the one-in-eleven figure SES-12 cites; by the review's account half of the week's twenty were false alarms of the revert check, so the true share may be lower.
- **Why neither number can see a product that does not work** (this part is measured in kind): both are built from module-level events. False-done counts a job's claim against that module's own tests. Survival counts whether merged lines are still there. Neither runs the product. Meanwhile "All 12 development deployments ... ended `ok: false`" and "No deployment was made for 80 hours ... while 308 landings went in" (product_side).
- **The first number has lost its instruments.** It is defined by "the gate's re-run and revert check". Section H records both as ended on 13 Nov. **Judgment (mine):** what remains countable without any added check is a job marking its pull request ready and its module tests then failing on GitHub.
- **A caution on walk steps as a number.** The walk is ordinary product code that sessions write. The step count moved between runs: the external walk had 175 steps and then 157; the internal walk 238 and then 357 (measured by me from the stored reports). redteam_corruption finding 6: "a job "correcting a stale step" raises the number".

**(c) Options, with cost and risk**

1. **The two numbers remain the judge.** Cost to Bob: none. Risk: the judge cannot see whether the product works, and one of the two has no instrument left; the cost half was unreadable for most of Process3.
2. **The walk result is added as the judge of the product,** stated as steps passing out of steps walked, with the count of steps removed or loosened since the tranche began beside it. The two numbers stay as measures of the process's honesty and cost. Cost to Bob: none; it reads from the third test, which already runs. Risk: the walk's own steps are session-written.
3. **The judge becomes output per unit:** requirements met and still met, per day and per dollar where the dollar can be read. This is P1's own wording ("quickly and cheaply, behaviour that survives"). Cost: none in acts. Risk: "requirements met" was 60% of the tranche's marks in Process3 (542 of 899 struck) while the product failed its walk, so on its own it repeats the blind spot.
4. **Rounds to a failure-free walk becomes the judge,** as the 13 Nov decision already makes it the end of a tranche. Risk: a count of rounds says nothing of cost.

**(d) Constraints**

- "Exactly three tests": a measure must be read from what the three tests already produce, or from git. Options 2 to 4 need no new test. Keeping the first number as the Foundations define it would need the two ended checks back, which the 13 Nov confirmation rules out.
- Cost can be reported only "where it can be read" (section I item 4, which rests on Bob's SES-9: usage is read by an allowed route or named unmeasured).
- The disposition's own note on row 73: "the owner should see any change to his judge".

---

## K5. The external walk

**(a) Bob's documents**

- Decision of 13 Nov, quoted in the disposition: "A round that completes without any failures ends a tranche, after which an optional multi-session deploy-and-external-walk runs". Also quoted: "No regression or deploy-and-walk between layers". The quotes do not say whose option it is.
- **A public release must have passed one.** Foundations, "Two kinds of release": "A public release is a development release the walkers have passed, published only with your approval (your word, 2 Nov; GAP-7): the process prepares it and shows you what it carries". This is F-REL-2.
- GAP-7, kept 3 Nov 17:32 UTC, no note: "A public release or promotion to installed sites waits for Bob's approval through the protected GitHub environment; development releases are drafts and need none."
- BD-R1, Bob, 8 Nov, his words: "Once a walk completes, that ends the current round, and a new round (of the same tranche) is started to work (layer by layer) to fix to those modules that have been identified as having flaws. This successive set of rounds continues until an internal walk doesn't find flaws, the release deployment happens, and the walk of the release also doesn't identify flaws. When the release walk is clean, the installer is updated for that release, then the civicsmith.dev website is updated to refer to the new install, and that ends the tranche."
- PD-16 records Bob, 8 Nov: "The live walk will take a long time and will end up being an expensive means of identifying many of the same the flaws the internal walk found. Stop the live walk now, update the process so that the live walk only runs once a round closes with no flaws found from the internal walk. And try to configure both walks to run as many walks as is reasonable to speed up the walking process. (But be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account."
- BD-R5, Bob, 9 Nov: "The first run or two of the external system will run without without an AI account connected. Once the external walks identify and fixed all the flaws to be found by walking all the non-AI journeys, we'll configure an AI so that the AI-assisted journeys can be run and debugged." And: "Yes, the installer update and site update wait until a release walk with AI on is also clean."
- Findings: P22, kept 3 Nov, no note: "what a walk finds becomes a round's entries, never edits to a running one". F-STOP-3: the walk's findings after a deployment "enter the next round as ledger entries by the route for work found elsewhere (PLN-3)".
- Who acts: Foundations, "Deploy tokens": "deploying, releasing and acting on a live site are BOB's acts, not a job's". Bob's standing approvals let sessions "create, deploy, configure, seed, reset and delete development deployments" in the product's own Cloudflare account without asking him.
- LOG L299, 5 Nov, the coordinator's paraphrase and not a quotation: "BOB'S WORD (Bob): deployment only at the end of a tranche, never between layers".

**What these say on the three questions**

- **Who decides it runs.** In every text before 13 Nov a rule decides, not a person: it runs when a round's internal walk is clean. Neither Bob nor the architecture session chooses case by case. The word "optional" is new on 13 Nov and I found no text saying whose option it is.
- **A public release must have passed one:** yes, in the Foundations line above and in BD-R1.
- **Findings after the tranche has ended.** By Bob's words of 8 Nov the question could not arise: the tranche did not end until the release walk was clean, and its findings opened another round of the same tranche. The 13 Nov decision ends the tranche before the external walk. No text of his says what its findings then open.

**(b) What Process3 did**

- 12 development deployments, 4 to 8 Nov, all `ok: false`; 10 stopped at the walk (measured, product_side; re-read by me).
- Ten of the 12 were on 4 Nov. Then none for 80 hours, "during which 308 landings went in" (product_side). The gap follows Bob's word of 5 Nov 01:55 as the coordinator logged it, "deployment only at the end of a tranche, never between layers"; it was not a session's choice.
- The two full external walks (measured by me from the stored reports on the state branch):
  - 8 Nov 07:20Z. Internal walk first: 238 steps, every one passing, 63 failures of a kind already known. External walk on the same build: 175 steps, 20 passing, 1,691 failures.
  - 8 Nov 23:50Z. Internal walk: 357 steps, 287 passing, 70 failing, all 70 in one group. External walk: 157 steps, 10 passing, 147 failing, 178 failures.
- **So the figure "147 of 157" in the draft is the external walk.** On the same build the internal walk failed 70 of 357. The cause of the difference is not established in the record.
- Why the first pair differed is recorded: the internal walk "never calls" the page checks the external one runs, so "class and DEC-340 faults could surface only on a deployed walk" (PD-11). The decision then made: "the internal walk runs the same page checks ... Faults that depend on deployed data or real bindings stay the live walk's to find."
- Time: the two runs took 60 and 64 minutes (measured). The background limit inside a session is about 30 minutes (PLT-4), so they ran on GitHub's machines.
- As built at the end: "tranche close refuses, in order, without a clean internal walk, a release and a clean release walk" (change_sample PR 269). So in Process3 nothing reached the main branch before a clean external walk. No clean walk of either kind ever happened, and the main branch was untouched all week.

**(c) Options, with cost and risk**

1. **A rule decides: it always runs after a failure-free round.** This is Bob's rule of 8 Nov with the tranche ending earlier. Cost to Bob: none. Cost to the process: about an hour and a development deployment each time. Risk: low.
2. **The architecture session decides.** Cost to Bob: none. Risk: a session weighs an hour's cost against a walk whose value it cannot see in advance. No Process3 case shows how a session would choose, because a rule or Bob's word always decided.
3. **Bob decides each time, by word.** Cost: one message per tranche, and the walk waits for him. Risk: main already holds the tranche by then.
4. **It runs only before a public release.** Cost: none between releases. Risk: faults that only a deployment shows pile up across tranches; the record is 1,691 failures after 80 hours without one.

On the findings:

- A. **They open a new tranche.** Main already holds the work. Simple; the faults are on main meanwhile.
- B. **The tranche does not end until the external walk is clean,** as Bob said on 8 Nov. This reverses the 13 Nov order.
- C. **They become work for named modules at the start of the next tranche,** whenever that begins.

**(d) Constraints**

- "Exactly three tests": the external walk is not one of them. It can stay only as the 13 Nov decision names it: optional, after the tranche, stopping nothing.
- Under the 13 Nov decision the tranche branch merges into main when the internal walk is clean. On Process3's one comparable day, a clean internal walk was followed by an external walk with 1,691 failures. Section J item 11 of the draft already lists the internal walk as unproven.
- Bob's Foundations line makes a passed external walk a condition of a public release. That holds whichever option is chosen.
- Cloudflare's limits bound how many sessions can walk at once (Bob's own caution of 8 Nov). The tool set the external walk to 85% of the account's limit on concurrent browsers ("Free 2 / Paid 170", LOG).
- BD-R5 leaves one act with Bob that is not on his list: connecting an AI account to the deployment before the AI-assisted journeys are walked.

---

## K6. Eight slots: per product or for the whole account

**(a) Bob's documents**

- Decision of 13 Nov, quoted: "The build plan is designed around parallel jobs running, with the concurrent job count bounded by a user-changeable number." Quoted in the disposition: "The default is 8 job slots"; "As soon as a job completes and is merged, its slot is used by the next job".
- PLN-7, kept 31 Oct 01:52 UTC, no note: "Two products may run tranches at once on one account; nothing in the process names a product." The page's "against": "Shared account rate limits are split between products. / Needs a shadow run with two product copies to confirm."
- Foundations: "Measured 1 Nov: at about 50 live sessions the account stops starting new ones, while the create call still reports success. So the process keeps at most 24 live sessions by default ... (your word, 1 Nov)."
- BD-R2, Bob, 8 Nov: "Process3 is a develop process that is designed for use to develop any product, not just civicsmith."
- LOG L286, 4 Nov 23:50, the coordinator's paraphrase and not a quotation: "BOB'S WORD (Bob): Process3 may run in many (hundreds of) accounts; cap and count should be account-specific." The coordinator's own decision follows on the same line: "count = the account's job sessions across all its products ...; cap = env var P3_JOB_CAP in the account's cloud environment, default 20 ...; no per-product key".
- Bob, 6 Nov, quoted (LOG L1021): "I think that github limits can handle the traffic from as many as 8 jobs at a time. Set the job slot limit to 8 and monitor github usage for an hour or so to see if there's any real need or opportunity to low or raise the slot count."
- Bob, 6 Nov, quoted (LOG L1005): "it's important that we confirm that the github usage limits we agreed to abide by are written into process3 and used properly account wide."

**(b) What Process3 did**

Limits that attach to an account, as measured or documented:

- **Claude account, live sessions:** about 50, then new sessions silently fail to start. One event, 1 Nov. Whether idle finished sessions count is unverified (redteam_feasibility).
- **Claude account, weekly usage:** Bob moved accounts on it ("I'm watching weekly usage", 6 Nov). The coordinator noted sessions reporting a seven-day usage warning on 5 Nov (LOG L331). No number is recorded.
- **Claude account, scheduled tasks:** "Rate limit after 5 quick creations" (1 Nov).
- **GitHub, the session account:** 5,000 requests an hour for a user in GitHub's documentation; the tool read 15,000 an hour for this identity (LOG L1005). Use never passed about 12%. GitHub suspended the account on 6 Nov without warning; the cause was never established. Peak before it: 1,387 pushes to one branch in 19 hours.
- **GitHub, the owner's account:** 20 test jobs at once on the free plan (documentation, levers).
- **Cloudflare:** per account. Each product has its own Cloudflare account in Bob's design.

The slot number in Process3 (roles_root_coordinator §4): 24 live sessions of every kind (1 Nov); "about 6" (4 Nov, the coordinator's own number, followed for about six hours); 20 jobs (4 Nov, on Bob's word as logged); 4, then 1 (6 Nov, the coordinator's, after the suspension); 8 (6 Nov, Bob's words above); 20 (7 Nov, logged as "job slots raised to 20"). At the end the tool read the number from an account-wide variable that "was never set on this account", so its default of 20 applied.

Two products at once: **it never happened under Process3.** The log says "No other product exists" and "second-product triage seat decided when a second product runs (PLN-7)". The same account did carry other sessions at the same time: the coordinator, the sessions building process3 itself, the probe repository, and design lanes. On 7 Nov a session on the other account worked on another repository of Bob's, neoprocess.

Width: under the start rule in the draft, 65 modules have work now. With equal job lengths and a bound of 8, 37 of the 65 would run beside a module they use that also has work (no_layers_width). So one product can fill 8.

**(c) Options, with cost and risk**

1. **Eight per product.** Two products run 16 jobs. Cost to Bob: one number per product to change. Risk: the limits that hurt in Process3 belong to the account, not the product: the 50-session ceiling, weekly usage, and the GitHub session account's standing. Sixteen jobs plus each product's standing sessions and walkers stays under 50 only if finished sessions do not count, which is unverified.
2. **Eight for the whole Claude account.** Cost to Bob: one number. Risk: the process must share the slots between products, by a rule not yet written; and a count across products needs some session to see both, while every session holds one repository only.
3. **Eight per product, with Bob lowering each when two run.** Cost: he changes two numbers when a second product starts. Risk: none new. Needs nothing built.

**(d) Constraints**

- One repository per session (preserved permission management): no product session can read another product's record. An account-wide count has to come from the platform's list of sessions, which is account-wide, or from Bob. **Judgment (mine).**
- Only Bob changes the number, and he does it by telling the coordinator (section B). As I read the draft there is one coordinator for each product's development, so "per product" is the form that needs nothing more.
- Bob's own reason for 8 was GitHub traffic from one session account. If two products share that GitHub account, his reason applies to the sum.
- His logged word of 4 Nov points to the account. It is the coordinator's paraphrase, so under his 13 Nov decision it does not count as his word until he confirms it.

---

## K7. Reordering by Bob's word against the fixed start rule

**(a) Bob's documents**

- Foundations, "A job's life", step 1 (F-JOB-1): "BOB takes its work from the record without being asked (PLN-2): each module of the open layer ... whose requirements still carry not-yet-met marks and that has no open job gets a ledger entry and a START, as many at once as the live-session limit allows; your word adds or reorders work."
- This is the only place the words appear. No Ledger line says it. PLN-2, the line cited, says only: "A plan is written from the work that remains; an entry is deferred only for one of three named reasons."
- Decision of 13 Nov, quoted in audit D: "Each module is updated and tested by a single job, with the jobs of earlier modules run before those later in the order."
- Bob, 9 Nov (PD-25): "All jobs of a layer should open at once up to the maximum slot cap."
- The draft's rule (section C): "When a slot is free, the ready module earliest in the order takes it. The rule is fixed and gives the same answer every time."

**(b) What Process3 did**

Bob did redirect work, always by talking to the coordinator. The coordinator then messaged the product session, and twice the result was built into the tool. Cases found (LOG):

- **4 Nov 16:55, narrowing to the "release path".** The coordinator proposed it and "Bob agreed to the release-path scope". Built as a list in the product's config, `"release_path": ["control-plane", "journey-check"]` (still there at the last tip), with the tool's rule "The release path first: next work tags the modules named in `release_path`". The coordinator attached its own number to it, "about 6 job sessions at most", which held work to about 6 of 20 for six hours and was "the coordinator's number recorded as Bob's agreement". Bob asked the next day "why did the coordinator silently limit work to about 6 jobs".
- **5 Nov 02:10** (paraphrase): "stop the current walkers and start the next layer while the process is updated."
- **5 Nov 01:55** (paraphrase): "deployment only at the end of a tranche, never between layers".
- **4 Nov 20:10** (paraphrase): "queue the trial for after the first dev release".
- **5 Nov 15:36** (paraphrase): Bob adds work: "BOB should start a UX design lane".
- **8 Nov:** "Finish, then switch" (layer 12 completes before the new round rule applies). BD-R3 and BD-R5 set the order of the installer build, the site build and the AI-assisted journeys.
- He also stopped and restarted everything by word several times (5 Nov, 7 Nov, 9 Nov).

I found no case of Bob naming one module's job to start ahead of another's. His reorderings were of kinds of work (release path, deployments, walks, a trial), not of modules in the order.

**(c) Options, with cost and risk**

1. **His word can add work but not reorder jobs.** New work is placed against a module and the rule starts it in its turn. Cost to Bob: none. Risk: something he wants soon sits behind earlier modules. With 65 modules holding work and 8 slots, a late module can wait many job-lengths.
2. **His word can name modules to go first; the rule reads that list.** The rule stays fixed and still gives one answer: ready modules he has named, in order, then the rest in order. This is how Process3's release path worked. Cost to Bob: a message naming modules. Risk: it needs a place in the record for his list and a way to clear it; in Process3 the list was two modules and was never cleared.
3. **His word can stop and restart, and nothing else.** As (1), plus the stop on his word that the draft already has.

**(d) Constraints**

- His own decision of 13 Nov orders jobs by module position. Option 2 is an exception to his own sentence, so only he can make it.
- "Only words the owner himself wrote count as his word": the 4 Nov case is the recorded failure, where the coordinator added a number to his agreement. Under option 2 the list must hold only what he wrote.
- The architecture session "does not choose which job starts next". Option 2 keeps that: it adds an input of Bob's, not a choice for a session.
- Changing the module order itself is not a way to reorder: the order is compiled into the product and "Moving a module that registers something can change what a member sees" (interface_and_cycle).
- A module's job that starts ahead of the modules it uses is already allowed by the draft ("It does not wait for the modules it uses to finish"), so naming a late module first breaks no other rule of the draft.

---

## What I could not find

1. **How often the ownership check fired,** and how many firings were false. The findings are in pull-request comments I could not read.
2. **The full text of Bob's decisions of 13 and 14 Nov.** Only the fragments quoted in the disposition and in audit D.
3. **Any use of "approval before a particular merge".** Searched the coordinator's log; absence in one log is not proof.
4. **A stored value of either health number.** None exists; the parts are above.
5. **The cause of the gap between the internal and the external walk on 8 Nov 23:50Z** (70 of 357 against 147 of 157).
6. **Any text of Bob's saying whose option the external walk is,** or what its findings open once a tranche has ended.
7. **Any measurement of two products on one account.** None ran.
8. **A number for the Claude account's weekly usage limit.**
9. **Any line of Bob's naming walk steps passing, or behaviour merged per day or per dollar, as a measure.**
10. **Whether the session-proposed environment route works for sessions that ROOT starts,** and whether its approval prompt can be answered while nobody watches. Observed only as tool descriptions in this session.
