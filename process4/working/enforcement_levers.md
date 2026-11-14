# Process4: what could physically stop a session adding a test or a check

14 Nov 2026. Read-only research. Nothing in any repository was changed; no session was started.

## 0. Scope, marks and limits

**The question.** Process4 has three tests and no others. A process fix may only correct or remove. Today that rule is text only (definition, section J item 8). This paper asks what permission settings and structural choices could make an addition impossible, or leave it with no power to stop work, without adding any check, scan, gate or reviewer.

**Marks on every platform fact.**

- **[doc today]** read today in the vendor's documentation. GitHub pages were read from the documentation's own source (`github/docs`, branch `main`) and are cited by their docs.github.com address. Claude Code pages were read at code.claude.com. Two GitHub pages (the permission levels page and the REST page for Actions policies) were read through a fetch that summarises, so their quotations may not be exact to the letter.
- **[tool today]** stated in the tool definitions this session was given today, or observed in this session today.
- **[P3 measured]** measured in Process3; file and passage given.
- **[repo today]** counted today from the two public clones (`process3` at `origin/tranche` 38b0f3f, `civicsmith-copy` at `origin/tranche` e7ec72e).
- **[memory]** from memory, not checked.
- **[untested]** nobody has measured it on these repositories.

**Limits.** GitHub's API was closed to this session for both repositories ("GitHub access to this repository is not enabled for this session" [tool today]). So live rulesets, collaborators, Actions settings and the plan of the owner's account were not read. Session transcripts were not available.

**What the evidence shows about plan and visibility.**

- Both repositories are public: an anonymous clone of each succeeded today [tool today].
- Both are owned by a personal account, not an organization: the owner's setup guide says "On a repository you own personally, a collaborator gets Write, never admin" [repo today: `process3` `setup/DEVELOPER.md` Step 2]. Not read live.
- The GitHub plan (Free or Pro) is not stated anywhere I read. For public repositories the two plans offer the same features used below.
- The owner's Claude plan is not stated. It matters for one lever only (managed settings, lever 9).

---

## 1. Surface map

"Can write today" means physically, under Process3's end-state settings. The sessions' GitHub account holds Write on both repositories: it authored and merged the work in both (270 of 296 merges into the process repository's integration branch were made by the two session accounts, 26 by the owner [repo today]).

| # | Surface | Where it lives | Who can write it today | Process3 additions of this kind |
| --- | --- | --- | --- | --- |
| 1 | The process tool's code (commands that can refuse) | Process repository, `tool/lib`, `tool/p3.mjs` | Any session with the process repository; sessions merged their own changes | The main site. 121 of 296 merges added or strengthened a check (41%), carrying 60% of tool code lines [change_sample, Summary]. 252 of 296 merges touched tool code; all 659 commits there are session-written, none the owner's [repo today]. 818 refusal sites at the end [causal_forensics 1.1] |
| 2 | The merge tool | Process repository, `merge.mjs`, `layerflow.mjs` and the removed train | Same | 111 of 296 merges touched the merge path [repo today]. 95 and 128 refusal sites in the two files [causal_forensics 6]. Three merge designs in five days [levers 2.1] |
| 3 | The code behind the required check | Process repository, `gate.mjs`, run by a workflow in the product | Same | 56 of 296 merges [repo today]. Receipt comparison, revert check, size cap, branch binding all entered here [change_sample cases 3, 5] |
| 4 | The tool's own tests | Process repository, `tool/test` | Same | 255 of 296 merges; 41,777 test lines added in nine days [repo today; change_sample section 1] |
| 5 | Workflow files in the product | Product, `.github/workflows` (four copied from the process at each version move, four the product's own) | Any session, by pull request; also on any branch without one | The gate workflow grew from 77 to 273 lines, every change through a version-move pull request; all workflows 446 to 1,021 lines [product_side 6a]. 15 session commits from 1 Nov, none by the owner; 13 copied process files at a version move, 2 changed the product's own workflows [repo today] |
| 6 | The pinned process version | Product, the `.process` submodule entry and `.gitmodules` | Any session, by pull request | Moved 116 times in nine days, all by sessions [product_side 4]; 120 session commits touch it, none the owner's [repo today] |
| 7 | The product's process settings file | Product, `process/config.json` (names the process repository's address, the integration branch, limits) | Any session | 24 to 421 lines; 70 session commits [product_side 6a; repo today]. It can point the product at a different process repository |
| 8 | Role instruction texts | Process repository, `rulebooks/`, prompt builders in `roles.mjs`, `job.mjs`, `start.mjs`; `README.md`; `DECISIONS.md` | Any session with the process repository | Prompts stayed at 4,032 to 4,197 bytes, held by a byte test. Uncapped texts grew: guide 8 KB to 134 KB, decisions 0 to 49 KB [causal_forensics 1.1]. Check sentences outnumber act sentences 4 to 1 or more [1.2] |
| 9 | Starting prompts one session types for another; messages | Claude side; free text in the call that creates a session | Any session that may start or message a session | Not countable. "MY STANDING RULES TO BOB"; "told BOB '6 at most'; BOB followed for ~6 h"; 26 handoff notes re-grew "Rules in force" within a day of being cleared [causal_forensics 3] |
| 10 | Scheduled tasks and extra helper sessions | Claude side | Any session with the task and session tools | Coordinators carried three to five tasks each; the hourly check accreted an audit [redteam_corruption 3; causal_forensics 3E] |
| 11 | Briefs to in-session workers used as reviewers | Claude side; free text | Any session | 285 of 776 commits were review-fix commits; 102 of 104 findings acted on [change_sample 1; causal_forensics 2] |
| 12 | A module's own tests | Product, each module's test files | The module's job (and physically any session) | 211 test files, 11,410 lines, written for the process and not the product: 26% of the week's net test growth [product_side 6c] |
| 13 | The walk's steps | Product, the walker module | Any job on that module | 238 to 357 steps within one round [redteam_feasibility 12] |
| 14 | Which checks are required to merge | GitHub ruleset | The owner only. A session's write was refused by the proxy, 2 tries [P3 measured: permissions_inventory 1e row 13] | None by sessions. But the code that the required name runs was session-written (rows 3 and 5) |
| 15 | The product's CLAUDE.md | Product | Approvals block: the owner only by rule; physically any session by pull request. The rule was held by a check in the Process3 tool and by the permission checker ("Instruction Poisoning", 2 of 2) [permissions_inventory 1a] | Owner 10 edits, each widening a permission. Sessions 5 commits, to the process lines below the block [repo today] |
| 16 | The deny list and hooks | Product, `.claude/settings.json`, `.claude/hooks` | Same as row 15 | Owner 4 commits. One added a hook before every shell command, drafted in answer to a session's finding; still in the tree [product_side 6a] |
| 17 | Requirement files, plan files, the module map, labels, pull-request comments | Product and GitHub | Any session | The module map carries dozens of dated "AMENDED" clauses; labels usable as holds [redteam_corruption channel table] |
| 18 | A session's own conduct | Nowhere | The session | Not countable. "Sessions will still hesitate, over-ask and over-test inside their own work" [audit_D 5.5] |

Two readings of the map.

- Almost every counted addition was in rows 1 to 4, in the process repository, written by sessions the coordinator started there, merged by the sessions' own account, and carried to the product by a version move (row 6). Those sessions loaded the process repository's CLAUDE.md, "which is approvals only", and no text carrying the restraint [causal_forensics 1.4].
- The product side grew too (rows 5, 7, 12, 13), mostly as a consequence of rows 1 to 4. Rows 9 to 11 and 18 leave no record that can be counted.

---

## 2. Candidate physical stops

For each: what it is, whether Bob's plan and visibility allow it, whether it is proven, what it leaves open, what it costs.

### Lever 1. The sessions' account cannot write the process repository

- **What.** The process repository stays public. The sessions' account is not a collaborator on it. Anyone can read a public repository; only collaborators can push.
- **Available.** Yes, on any plan. It is the absence of a grant. A personal-account repository has no read-only collaborator level: "Collaborators can't have read-only access to repositories owned by a personal account" [doc today: docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository]. So "not a collaborator" is the read-only state.
- **Proven.** By GitHub's rules, yes. Not measured in Process3: the sessions' account had Write there throughout. Today's session saw the same wall from the Claude side: the GitHub proxy answers only for repositories attached to the session [tool today].
- **Covers.** Rows 1 to 4 and 8: every counted addition in Process3.
- **Left open.**
  - A fork and a pull request from it. It merges nothing by itself; the owner's merge button is then the way in. The record says he presses it: 151 of 159 drafted lines accepted, four requests in 26 hours each returned as a subsystem [redteam_corruption 5]. The owner can close this with "Limit interactions", an owner-only setting [doc today, same page], for up to six months at a time [levers 1.2, not re-read].
  - Pointing the product at another copy. The product names the process repository in files sessions can write (rows 6 and 7). See levers 2 and 5.
  - The copy inside a session's own container can be edited there. It affects that one session and does not last.
- **Cost.** Every process fix needs the owner: he merges it. A process fault that blocks work then waits for him. That contradicts section E as drafted ("Claude fixes it") unless the fix is prepared by a session and merged by him. Process3 merged 296 changes to the process in nine days and moved the version 116 times; at that rate this lever is unworkable, so it only works if the process is small enough that faults are rare. How rare is not known. The feasibility review expects the first gate defect on day one [redteam_feasibility 1; redteam_corruption 1].

### Lever 2. The pinned process version lives where only Bob can write

Three forms.

- **(a) No version entry in the product at all.** The product refers to one fixed name in the process repository (a branch or tag). Only Bob can move that name, because of lever 1. This removes row 6 and the 116 moves at the root.
- **(b) A branch only Bob can update.** A ruleset rule: "Restrict updates: only users with bypass permissions can push to branches or tags whose name matches the pattern" [doc today: docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets]. Rulesets are available "in public repositories with GitHub Free" [doc today: .../managing-rulesets/about-rulesets].
- **(c) A variable of a GitHub environment.** "To create secrets or variables for an environment in a personal account repository, you must be the repository owner" [doc today: docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables]. A plain repository variable does not serve: "For a personal account repository, you must be a repository collaborator" is all it takes [same page]. So the sessions' account can write repository variables. This matters equally for the slot number.
- **Proven.** None measured. All three rest on documentation read today.
- **Left open.** The product still holds a line that names the reference, in a file a session can write, unless that file is guarded (levers 4, 5). A session's container copy.
- **Cost.** One act of Bob's for each fix a running tranche adopts, plus one per tranche. Under the kept rule "only a fix for a blocking fault, once" that is the number of blocking faults. Unknown; not 116.

### Lever 3. GitHub makes the merge decision; there is no merge tool

- **What.** The required check is already the owner's setting (row 14). If the merge itself is a native GitHub act, no session-written code stands in the merge path, and nothing a session adds outside the required check can block a merge. Two native forms: a plain merge, which GitHub refuses while the required check is not green; or auto-merge, where GitHub merges when it turns green.
- **Available.** Auto-merge "is available in public repositories with GitHub Free" [doc today: gated-feature text in `github/docs`, shown on docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request]. Only the owner can "Allow or disallow auto-merge"; a collaborator can "Enable and disable auto-merge for a pull request" [doc today: permission-levels page]. The merge queue is not available on a personal-account repository [levers 1.1, not re-read today].
- **Proven.**
  - A plain merge by a session with GitHub's own tool, no merge tool: passed in Process3's first-day trials. Four groups of 201, 201, 50 and 120 acts had none refused, and each round in them included a merge of the session's own pull request with no review [P3 measured: permissions_inventory 1e row 18]. That was 1 Nov, before the merge tool existed.
  - Enabling auto-merge: never tried. The setting was off and the deny list removed the command [permissions_inventory 2c].
  - The checker has a "Merge Without Review" reason and used it once [permissions_inventory 2a].
- **Left open.** ARCH can simply not merge, and a job can leave its pull request in draft. The required check's own content (levers 4 to 6). Whether a second workflow reporting a check with the required name can confuse the rule: "Any person or integration with write permissions to a repository can set the state of any status check" [doc today: available-rules page]; how GitHub treats two runs with one name was not found in the pages read.
- **Cost.** Owner acts, once: one edit to the deny list (it removes every merge command and all of `gh` today), one wording edit to the approvals (they say "through the process's merge tool"), and for auto-merge one tick. Then the trial in section J item 1.

### Lever 4. Bob's review required for a few owned paths (CODEOWNERS)

- **What.** A CODEOWNERS file names Bob as owner of `.github/`, `.claude/`, `CLAUDE.md`, the version entry and the process settings file. The ruleset on the integration branch requires a code owner's review. An ordinary job pull request needs nobody; one that touches those paths cannot merge without Bob.
- **Available.** "You can define code owners in public repositories with GitHub Free" [doc today: docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners]. The file is read from the base branch of the pull request [same]. The alternative that keeps the path list in the ruleset itself, "Required reviewers", "is not available on user-owned repositories as they do not contain teams" [doc today: available-rules page]. Path restrictions on pushes are not available: "Push rulesets are available for the GitHub Team plan in internal and private repositories" [doc today: gated-feature text for rulesets]. Not for a public repository on any plan.
- **Proven.** No. Whether "zero required approvals plus code-owner review" lets ordinary pull requests through on a personal repository is untested [levers 1.3; redteam_feasibility 8]. Whether a submodule entry can be owned is untested. Bob cannot approve his own pull request [memory], so the admin must be on the bypass list.
- **Is it a new review?** It is an approval by the owner, on files that are his, set by a GitHub setting. It is not a reviewer session and not a scan. But it is a stop that waits for him, and "approve a pull request" is not on his list of acts in section B. He should rule on whether it counts.
- **Left open.** A session can still write those files on its own branch; a workflow pushed to a branch runs there; a session started from such a branch loads its edited settings [levers 1.3]. The CODEOWNERS file can be edited by anyone with Write ("People with write permissions for the repository can create or edit the CODEOWNERS file"), which is why it must own itself [doc today: about-code-owners]. The permission levels page lists "Define code owners for the repository" as owner-only; the two pages do not agree, and I did not resolve it.
- **Cost.** Bob's click each time routine work touches an owned path. In Process3 none of 508 job landings did [redteam_corruption, "Tried to break" 2]. Version moves (120 commits), copied workflow files (13) and process lines in CLAUDE.md (5) did; with levers 1, 2 and 6 those disappear. What remains is changes to the product's own workflows: two in nine days [repo today: two commits of 6 Nov, to the regression, release-signing and build workflows]. Each would wait for him while other work goes on.

### Lever 5. An Actions policy: only named workflow files may run for the sessions' account

- **What.** GitHub's workflow execution protections. "Actor rules let you separate who contributes code from who runs your CI, so you can grant a contributor write access without granting them the ability to execute workflows." "You can scope policies to specific workflow paths." [doc today: docs.github.com/en/actions/concepts/about-actions-policies and .../actions/how-tos/administer/control-workflow-execution]. The policy's target takes include and exclude lists of workflow paths [doc today: docs.github.com/en/rest/actions/policies]. So one policy can say: every workflow file except the named ones runs only for Bob. A workflow file a session adds then never runs. It is inert.
- **Available.** "All public repositories"; set by "Repository administrators" [doc today: control-workflow-execution page]. The levers paper dates general availability 17 Sep 2026; I did not re-read the changelog.
- **Proven.** No. New this autumn; never used here. Not determined: who counts as the actor when GitHub's auto-merge makes the push; whether a blocked run shows as a red mark on the pull request ("disallowed workflow runs will fail with an error" [doc today]), which could not block a merge but could prompt a cautious session to stop.
- **Also.** `Settings, Actions, General` can allow only named reusable workflows, by pattern [doc today: docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository]. That stops a product workflow calling a fork of the process.
- **Left open.** The content of the named files themselves. A `pull_request` run takes its workflow file from the pull request, so a job can still change the named gate file for its own run (lever 6).
- **Cost.** One setting. Bob edits the list whenever the product legitimately needs a new workflow file.

### Lever 6. The required check's definition lives where no pull request can change it

Three forms, none proven here.

- **(a) A reusable workflow in the process repository, called from a short file in the product** [levers 3.3]. With lever 1 the logic is Bob's. The short calling file is still in the product; lever 4 or lever 7 must guard it.
- **(b) A workflow on a default branch only Bob can update, triggered by `pull_request_target`.** That event runs "in the context of the default branch of the base repository" [doc today: docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows], so no pull request can alter it. But from 2 Dec 2026 GitHub blocks that event by default in public repositories; an owner policy must allow it [doc today: docs.github.com/en/actions/reference/security/securely-using-pull_request_target]. It runs pull-request code with the base repository's context, so it must hold read permission only and no secret. The default branch must then be one that sessions cannot merge into, which conflicts with "the tranche merges into main" unless a separate owner-only branch is made the default.
- **(c) GitHub's "Require workflows to pass before merging".** It would be exact. It is Enterprise only and set at organization level: the documentation's feature flag lists Enterprise Cloud and Server only [doc today: `data/features/repo-rules-required-workflows.yml` in `github/docs`]. Not available to Bob.
- **A limit no form removes.** The check runs the module's tests, and those are files the job writes (row 12).

### Lever 7. Deny-list entries

- **What is measured.** "A project deny on an MCP tool removes the tool, and a deny on `Bash(touch:*)` blocks the command", 1 probe, 8 acts [P3 measured: permissions_inventory 1b, 1e row 3]. Deny refusals do not count toward the three-in-a-row stop [row 16].
- **What the documentation adds.** Path rules: "Read and Edit deny rules apply to Claude's built-in file tools, to file commands Claude Code recognizes in Bash, such as `cat`, `head`, `tail`, `sed`, and `tee`, and to the targets of Bash redirections ... They don't apply to ... arbitrary subprocesses that read or write files indirectly, like a Python or Node script" [doc today: code.claude.com/docs/en/permissions]. A bare tool name "removes the tool from Claude's context entirely" [same]. Worker types can be denied by name [same].
- **Entries that would bear on this problem.**
  - In the product: deny edits to `.github/`, `.claude/`, `CLAUDE.md`, the process copy and the process settings file. Deny the tool that attaches another repository to a session (this session has such a tool [tool today]; Process3's checker refused its use once, "Access Added As A Means" [permissions_inventory 1d]).
  - In the product, if the owner creates the hourly alarm himself: deny the tools that create or edit scheduled tasks [redteam_corruption 3c]. One file serves every role, so a tool ROOT needs cannot be denied to jobs only.
  - In the process repository: deny edits to its test folder and its workflow folder. A fix session then cannot add a test file or a CI job by ordinary means. It can still add a refusal inside existing code; no path rule can tell a correction from an addition there.
- **Proven.** Tool removal: measured once. Path-scoped edit denies: documented, never measured in Process3.
- **Left open.** A script or a git command gets round a path rule; the documentation says so. The list loads only in a session that holds one repository and starts from a branch that carries it: "a session with several repositories ... reads only the `enabledPlugins` and `extraKnownMarketplaces` keys ... not permission rules" [doc today: code.claude.com/docs/en/settings, "Settings in cloud sessions"; also P3 measured, permissions_inventory 1c]. The file is itself in the repository (rows 15, 16).
- **Cost.** One commit by Bob per change of the list.

### Lever 8. The permission checker acting on a "never" clause in Bob's own text

- **What the documentation says.** "The classifier reads the same CLAUDE.md content Claude itself loads, so an instruction like 'never force push' in your project's CLAUDE.md steers both Claude and the classifier at the same time" [doc today: code.claude.com/docs/en/auto-mode-config]. There is also a settings block for prose rules the checker blocks "even when the user asks", read from user or managed settings and never from the repository's own settings file [same].
- **Is there measured evidence that the checker enforces such a clause?** No.
  - No Process3 trial tested a prohibition by text alone. Every "never" in the approvals that held (force-push, branch deletion, main) also had a deny rule or a GitHub rule behind it.
  - The one direct comparison found the approvals made "NO DIFFERENCE" to the checker: 0 refused in 201, 201, 50 and 120 acts with and without them. Their measured effect was on the session's own model: 10 of 10 done with them, 0 of 10 without (or 2 of 10 in another copy of the record) [permissions_inventory 1e rows 18, 21 and the two discrepancies].
  - The approvals' clauses on workflow files ("never adding or renaming a job whose name matches a required check") were enforced by tool code, not by any recorded refusal of the checker.
  - The rule against adding checks was never in Bob's committed text in Process3. It was a "Nudge" in rulebooks, a line in three role prompts, and his words in chat [causal_forensics 1.4]. So "text alone did not hold" was measured for the weaker channels, not for this one.
- **How reliable is the checker in general?** Uneven. The same starting prompt passed in one environment and was refused in another in the same turn [permissions_inventory 2a]; archiving passed 2 of 5; an exemption passed twice on 8 Nov and was refused on 9 Nov; two pushes were refused with no reason [1e rows 5, 34, 35]. After one refusal it treated the next push as a bypass [1d].
- **Judgment on the mechanism.** The checker sees a command, not always the diff behind a push. "Is this an added check or a correction?" is a judgment, and a wrong "yes" three times in a row stops a session [P3 measured: 1e row 7].
- **Proven.** No. Not physical.
- **Cost.** One edit by Bob. If the start-up comparison of approvals stays, each edit stops every long-lived session, as it did five times [permissions_inventory 1a].

### Lever 9. Bob's text and rules held on the Claude side, outside any repository

- **What.** A cloud environment's setup script can write user-level instructions: "add a setup script that writes `~/.claude/CLAUDE.md` ... Claude Code loads that file as user instructions in the session" [doc today: code.claude.com/docs/en/cloud-environments]. A session cannot change its environment by itself: the tool that proposes a change "shows the user an approval prompt ... every time, in every permission mode" [tool today]. So a rule placed there is in no branch, cannot be changed by a pull request, and reaches every session started in that environment whatever commit it starts from.
- **Proven.** Partly. Process3 measured a setup script writing user-level checker settings once: 19 of 19 acts passed [permissions_inventory 1e row 4]. That shows the route existed, not that a prohibition placed there holds. The settings page says user settings from one's own machine are "not read" in a cloud session [doc today: code.claude.com/docs/en/settings]; whether a file the setup script writes inside the container is honoured for deny rules is not stated and not measured.
- **Stronger form, plan-dependent.** Server-managed settings reach cloud sessions and their deny rules "can't be overridden", but they exist only for "Claude for Teams and Claude for Enterprise" [doc today: code.claude.com/docs/en/server-managed-settings and auto-mode-config]. Bob's plan is unknown.
- **Left open.** A session can edit a file in its own container. Still text, or a path rule with lever 7's limits.
- **Cost.** A Claude-side setting, which is not one of the two kinds of setting on Bob's list (GitHub, Cloudflare). Section K item 2 already raises Claude-side set-up acts.

### Lever 10. A free GitHub organization

- **What it adds** [levers 1.4; only the "required reviewers" sentence was re-read today]. A real Read role for the sessions' account on the process repository. The merge queue on public repositories, which replaces any merge tool with exact semantics. File-pattern review requirements kept in the ruleset, not in a file inside the repository.
- **What it does not add.** Path restrictions on pushes (Team plan, private repositories only) and required workflows (Enterprise) [doc today, as under levers 4 and 6].
- **Cost.** One transfer of both repositories; the Claude and Cloudflare apps reinstalled; settings re-checked.

### Lever 11. Have nothing that can refuse

- **What.** Structural, and the largest. Every counted addition went into code that sessions run or that CI runs (rows 1 to 5). If Process4's process is GitHub settings, one test workflow and short role texts, with no session-run tool, rows 1, 2 and 4 do not exist. A session cannot add a refusal to a tool that is not there.
- **Proven.** The direction is: the one hard cap in Process3 held all week while uncapped code grew 16 times [causal_forensics, Headline]. The specific design is not.
- **Left open.** The work the tool did must be done by hand in each session from its text (status read-out, the fixed slot rule, the notice). Text-following is text.

---

## 3. What earlier reviewers concluded about a wall round the process repository

**They found the wall itself sound.**

- Levers paper, finding 1: "The process repository needs no wall-building at all ... If the session account is simply not a collaborator on it, GitHub refuses every write."
- Corruption review, verdict: "the wall around the process repository is sound and I could not break it." Under "Tried to break, could not": "A non-collaborator cannot push, and nothing in the product can stand in for the reusable workflow without touching `.github/**`. The only route in is the owner's merge."

**What broke the proposal built on it was not a hole in the wall.**

1. **The growth moves to whatever is not walled.** "The draft then assumes that walling the place where Process3's growth happened removes the growth. The record says growth goes to whatever is uncapped" [redteam_corruption, verdict]. Named outlets: everything on the Claude side (prompts, tasks, messages, worker briefs), the product's tests and walker, helper scripts in the product, labels, requirement files [channel table].
2. **Every defect in the walled part becomes a stop only the owner can clear.** "The first gate defect in run 1 stops all product work, and only the owner can clear it" [redteam_corruption 1; stall table].
3. **The owner's merge button is the remaining route, and he presses it** [redteam_corruption 5].
4. **The owner's requirements exclude the merge that the wall depends on.** Audit D calls it a triangle: "The proposal's one physical defence against the Process3 loop is the owner's merge. Remove the merge (requirement 1) and either sessions can change the process again, or a process defect cannot be fixed with no one watching (requirement 2)" [audit_D 6(iii) item 7]. It asks that "whatever keeps the process from growing holds without him" [6(ii) item 1], and leaves the choice of corner to the owner.
5. **Guarding paths in the product put him in the path of routine work**, and two details were unproven: the sole code owner cannot approve his own change, and zero approvals with code-owner review is untested [redteam_feasibility 8].
6. **Two byte and line caps did not cap, and the first contents are written before any wall exists** [redteam_corruption 7].

The present draft of the definition took the other corner: sessions fix the process (section E), and item J 8 records that nothing physical then holds the rule.

---

## 4. The residue

After the best combination of levers, these remain open to text rules only.

1. **A session being more cautious in its own work.** Running tests again, reading again, asking, not marking a pull request ready, not merging. No setting reaches it.
2. **Demands written into another session's starting instructions, or sent as messages.** The call that starts a session takes free text [tool today]. Nothing compares it with any template. Messages worked as standing rules in Process3.
3. **Workers used as reviewers.** The definition forbids it; a session can still brief one. Denying a worker type removes bulk reading with it.
4. **Tests inside a module's own tests that test the process and not the product,** and added walk steps. These run inside two of the three tests, so they can fail a job. They cannot be walled without stopping the job's real work.
5. **A refusal added inside existing code by whoever may fix the process.** If sessions fix it, no path rule separates a correction from an addition. If only Bob merges, the stop is his reading of a diff, and the record says that does not hold.
6. **Helper scripts in the product that jobs are told to run:** a second tool, regrown outside the process repository.
7. **Rule text in files sessions must write:** requirement files, plan files, the module map, labels, pull-request comments.
8. **Scheduled tasks and extra sessions as watchers,** unless the task tools are denied to every role.
9. **Drafts for Bob.** Sessions drafted approvals text that he then committed; one such commit added a hook before every command. A question from him came back as a mechanism every time [causal_forensics 4.2, driver 9].
10. **The first contents.** Process4 itself will be written by sessions before any wall stands.

Items 1, 2, 3 and 9 leave no record in git. Items 4, 6 and 7 can be counted after the fact, which is reporting, not prevention.

---

## 5. The strongest combinations (my judgment, not a finding)

Each takes a different corner of the triangle in section 3.

### A. Wall the process, let GitHub decide the merge

Levers 11, 1, 2(a), 3, 6(a), 5, 7, and 4 for the few owned paths.

- The process is settings, one test workflow and short texts, in a repository the sessions' account cannot write. The product names one reference only Bob moves. No merge tool. Only named workflow files run for the sessions' account.
- **Holds physically:** rows 1 to 6, 8 and 14. That is every place Process3's counted additions were made.
- **Costs Bob:** one sitting of settings; one merge and one move of the reference for every process fix; a click for each change to the product's own workflows (two in nine days in Process3); wording edits to approvals and deny list. A blocking process fault waits for him. This is the corner the central audit said breaks "unattended" and "very occasionally".
- **Unproven parts:** zero approvals with code-owner review; the Actions policy; a merge with no tool at ARCH's level (section J item 1).
- **Leaves open:** the whole residue. Option: lever 10 adds the merge queue and a real Read role for one transfer.

### B. Split the process by what can stop a merge

Levers 11, 3, 6, 5, 2 for the gate only, 7.

- The part that can block (the required check's workflow and the reference to it) is Bob's alone. The part that cannot block (role texts, the status read-out's wording) stays writable by a fix session, as section E says.
- **Holds physically:** no session can add or change anything that stops a merge on GitHub's side. A text a session adds can ask for more; it cannot refuse.
- **Costs Bob:** an act only when the gate itself is faulty. Text faults are fixed unattended.
- **Leaves open:** role texts can grow demands (residue 2 in a durable form), unless a hard size limit is kept. The one such limit in Process3 held all week, but it was a test in the process repository; Bob should rule on whether keeping an existing limit counts against "no others". Everything else in the residue.

### C. No wall: the rule in Bob's strongest text channel, with narrow denies

Levers 8, 9, 7, and 3.

- Sessions keep Write on the process repository and fix it unattended. The rule "a fix corrects or removes, never adds a test, gate, review or stop" goes into Bob's own committed approvals in the process repository, where fix sessions load it and the checker reads it, and where Process3 never put it. The process repository's deny list refuses edits to its test and workflow folders.
- **Costs Bob:** two commits. Nothing waits for him.
- **Proven:** nothing. This is still text plus a path rule that a script can pass. The trial in section J item 8 would measure it; it "can break the claim. It cannot prove it."
- **Leaves open:** rows 1 to 3 in substance, and the whole residue.

**Order.** A holds most and costs Bob most. B holds what can stop work and costs him only gate faults. C costs nothing and rests on an unmeasured hope. Under every one of them the residue stays, and the corruption review's warning applies: growth goes to what is not walled.

---

## 6. What I could not determine

- The owner account's GitHub plan, and the live settings of either repository (rulesets, collaborators, Actions settings, where the Claude GitHub App is installed). The API was closed to this session.
- The owner's Claude plan, and so whether managed settings are available.
- Whether "zero required approvals plus code-owner review" passes ordinary pull requests on a personal repository; whether a submodule entry can be owned.
- How the Actions policy names the actor for a merge made by GitHub's auto-merge, and whether a blocked run shows red on a pull request.
- How GitHub treats two check runs with the same required name from two workflows.
- Whether the checker lets a session enable auto-merge, and whether a GitHub tool for that exists in cloud sessions.
- Whether settings a setup script writes inside the container are honoured for deny rules. Process3's one trial used a different key.
- Whether the Claude GitHub connection can be granted without the right to write workflow files. Process3 sessions did write them (15 commits from 1 Nov), so today it has that right.
- Any measured case of the checker enforcing a prohibition that had no deny rule or GitHub rule behind it. I found none.
- How often a blocking process fault would occur in a process as small as Process4's. Process3's rate (296 process merges, 116 version moves, nine days) is for a tool of 24,000 lines.

## 7. Sources

- Handoff files, read in full: `process4_definition_main.md`, `permissions_inventory.md`, `redteam_corruption.md`, `redteam_feasibility.md`. Read by section: `levers_github_cloudflare_product.md` (sections 0 to 3), `causal_forensics.md` (1 to 3, 6 to 8), `change_sample.md` (summary, 1, 2, 5, 6), `audit_D_central.md` (5, 6), `product_side.md` (4, 6).
- Clones made today in `/home/user/repos/`: `process3`, `civicsmith-copy`. Counts marked [repo today] are from `git log` on `origin/tranche` of each.
- GitHub documentation source, `github/docs` branch `main`, fetched today: `about-rulesets.md`, `available-rules-for-rulesets.md`, the gated-feature texts `repo-rules.md`, `code-owners.md`, `auto-merge.md`, the feature file `repo-rules-required-workflows.yml`, `about-code-owners.md`, `about-actions-policies.md`, `control-workflow-execution.md`, `use-variables.md` with its permission statements, `events-that-trigger-workflows.md`, `securely-using-pull_request_target.md`, `managing-github-actions-settings-for-a-repository.md`. Two pages read as rendered: the permission levels page for personal repositories, and the REST page for Actions policies.
- Claude Code documentation, fetched today from code.claude.com/docs/en: `auto-mode-config`, `permissions`, `settings`, `cloud-environments`, `claude-code-on-the-web`, `server-managed-settings`.
