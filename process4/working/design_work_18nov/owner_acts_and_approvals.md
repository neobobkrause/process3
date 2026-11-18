Length: 155 lines. Last section: "8. What was read, and what could not be found".

# The owner's acts to start a product, the wording of his approvals, and branches

Written by a Claude worker on 18 Nov 2026. A worker's findings and proposals. **Nothing here is the owner's words unless it is in quotation marks, and nothing here has run.** It answers the open line in part 6, section 2 of the seventh draft, on Claude Code and Cloudflare only.

Marks: **[record]** stated in a file of this repository, named. **[memory]** what I know with no source in hand. **Proposal:** mine, for the owner to adopt or change. "Process3" is the process before this one.

## 1. The short answer

- The owner has ten acts before the first tranche opens, in one order (section 3). Eight are settings or entries that GitHub, Claude or Cloudflare give only to him. Two are his own committed words.
- His approvals need a new block in each repository. The wording is proposed in section 4, labelled as a proposal. The list of forbidden commands needs three changes (section 5).
- Branches: one standing branch named `tranche` beside `main` in the product's repository. His two files are committed on `main` once, at the start, and `tranche` is cut from it. After that he edits them on `tranche` only (section 6).
- Nothing in this file adds a test, check, gate, review or stop.

## 2. Facts gathered

**What Process3's start-up asked of him.** Eleven steps "in one sitting", interleaved with acts of the architecture session [record: `working/session2/point3_first_hour.md` line 168; the guide itself, `setup/DEVELOPER.md`, is on another branch and was not read]. The steps the record gives: install Claude's GitHub App (2); connect Claude to GitHub as the second account, in a private window (3); Actions settings (4); merge settings (5); no classic branch protection (6); a rule on every branch (7); deploy tokens into the cloud environment (8); his approvals (9); the deny list (10); the rule on main and the tranche, "last", because it "stops direct commits to them" (11) [record: `evidence/permissions_inventory.md` 1f, `working/k_evidence.md` lines 124 to 129].

**How his approvals and the deny list are loaded.**
- From the copy of the repository a session is handed at its start, once [record: `working/foundations_updated/09` lines 34 to 36]. That copy was twice an old one, lacking approvals committed sixteen minutes earlier; a start by commit id landed fresh, 1 of 1 [record: point3, section 2].
- The deny list loads only when the session holds one repository and starts from a branch that carries it. A denied tool is removed outright (1 probe, 8 acts) [record: inventory 1b, 1c].
- An allow rule changed nothing under Auto mode: allow-listed acts were still judged [record: inventory 1b]. The Artifact tool is the exception recorded: it asked a person until it was allow-listed (1 case).
- A branch that does not carry the working approvals gives a session almost none: "A runner started by hand from main held no approvals and was refused session starts" [record: inventory 1a].

**Which wording was accepted and which declined.**

| Wording or route | Result | Source |
|---|---|---|
| His consent quoted in a session's starting text | Declined by the session itself, 11 of 11 merges | Foundations only; no evidence file found |
| His consent typed in the acting session | 0 of 21 refused | Foundations only; no evidence file |
| "open, comment on and merge pull requests" (1 Nov) | The checker's reason "Merge Without Review" fired once | inventory 2a |
| "through the process's merge tool ... once its gate and their required checks pass, without a person's review" (from 2 Nov) | About 700 merges with no review, none recorded as refused | inventory 2b, 2c |
| An act the text did not name in so many words (a revert exemption; ending a hold) | Refused: "CI Bypass" once, "Security Weaken" twice | inventory 1e rows 32, 35 |
| A session writing his relayed approvals into a loaded file | Refused 2 of 2, "Instruction Poisoning" | inventory 1a |
| Approvals "restated ... for this repository only" in the trial repository (8 Nov) | Sessions' next two pushes there refused, "judged dangerous". Cause never found | inventory row 34; point3 section 4 |
| An unforeseen ask from the directing session | Done 10 of 10 with his committed text; 0 of 10 without (one file says 2 of 10) | inventory rows 21, and its discrepancies |

What I take from the table: name each act in so many words; say "including sessions that other sessions started"; say "without a person's review"; name the tool as the route; and treat any approval that reaches the acting session only as another session's quotation as likely to be declined.

**GitHub settings Process3 relied on** (what its guide asked him to set; nobody has read the live settings) [record: inventory 1f]: he is the only admin; sessions act as a second account, a collaborator with Write; a rule on every branch (no deletion, no force-push, empty bypass list); a rule on main and the tranche (pull request required, merge commits only, one required check, required approvals 0, empty bypass list); merge commits allowed, auto-merge off, delete-branch-on-merge off; the default workflow token read-only and "Allow GitHub Actions to create and approve pull requests" off; no repository-level secret; a `release` environment "whose required reviewer is Bob". His own approvals edits of 5, 8 and 9 Nov went in as pull requests he merged after the check [record: point3 section 4, item 6].

**Secrets and the deploy token.** A Cloudflare API token for one account (scopes recorded: Workers Scripts Edit, R2 Edit, Containers Edit), entered with ten other values as environment variables of Claude's cloud environment, "not under Network secrets"; "The variables reach only sessions started after you save" [record: inventory 1f; k_evidence line 126]. A session can read the variables' names, never the values, and can propose an environment for him to approve; whether the platform's secure form for one host can replace the variable for deploying is unmeasured [record: k_evidence lines 141 to 146].

## 3. (a) The owner's acts, in order

For a new product. Acts 1, 2, 4 and 7 are made once for the process and not again for a second product. Each act is his because of the reason given; "the proxy" is the sessions' route to GitHub, which refused a write to branch rules 2 of 2 and refuses reads of Actions settings, secrets and collaborators [record: inventory 1f].

1. **Have a second GitHub account for the sessions.** Where: github.com, signed out of his own account. Why his: GitHub's terms ask that a person set up a machine account and answer for it [record: `evidence/levers_github_cloudflare_product.md` line 295]. Without it sessions act as the owner and no GitHub rule holds them.
2. **Give that account Write on the product's repository and on the process's.** Where: each repository, Settings, Collaborators, add the account; then sign in as it and accept. Why his: only the repository's owner can change collaborators; a collaborator on a personal repository "gets Write, never admin".
3. **Set the repository's own settings, in each repository.** Where: Settings, General: allow merge commits; "Allow auto-merge" off; "Automatically delete head branches" off. Settings, Actions, General: workflow permissions read-only; "Allow GitHub Actions to create and approve pull requests" off. Keep no repository-level secret. Why his: a collaborator cannot change settings, and his approvals forbid sessions to.
4. **Make the rule for every branch, in each repository.** Where: Settings, Rules, Rulesets, new branch ruleset, all branches: "Restrict deletions", "Block force pushes", bypass list empty. Why his: as act 3.
5. **Connect Claude to GitHub as the second account, and install Claude's GitHub App on both repositories.** Where: a private browser window, signed in to GitHub as the second account and to Claude as himself; claude.ai, Settings, Connectors, GitHub. The App: github.com, Settings, Applications, as the owner. Why his: no session has a tool for it. On 5 Nov the connection was first made as his own account and no job ran for 94 minutes [record: k_evidence line 133].
6. **Make the deploy token and enter the secret values.** Where: Cloudflare's dashboard, an API token for the development account only; then claude.ai, the cloud environment's settings, one environment variable for each name the process's page lists. Why his: only he holds the values, and a session must never see or type one. This comes before any session start, because values reach only sessions started afterwards.
7. **Commit his approvals and his list of forbidden commands in the process's repository.** Where: GitHub's website, signed in as himself, branch `main`: the approvals block in `CLAUDE.md`, the list in `.claude/settings.json`. Why his: they are his words; a session that wrote them was refused 2 of 2.
8. **Commit the same two files in the product's repository, then make the tranche branch.** Where: GitHub's website, branch `main`; then the branch menu, type `tranche`, "Create branch: tranche from main". Why his: as act 7; and until these files exist on a branch no session holds any approval to push there.
9. **Start ROOT.** Where: the Claude app, a new cloud session on the product's repository alone, branch `tranche` picked, Auto mode, the model and effort he wants, and a plain prompt naming the product and Process4. Why his: sessions are started only by a person, by another session, or by a scheduled task, and a task's fresh session could start none (0 of 3) [record: inventory row 28].
10. **Make the rule for `main` and `tranche`,** when ROOT's sessions tell him the required test run has reported once. Where: Settings, Rules, Rulesets, new branch ruleset naming `main` and `tranche`: require a pull request; required approvals 0; merge commits only; require the status check the process's page names; bypass list empty. Why his: as act 3. Why last: it stops direct commits, and the check must exist to be required. In the process's repository the same rule names `main` only.

Then his standing acts begin: approve or change ARCH's first tranche proposal; connect an AI account to the development deployment before an external walk that needs one; approve each public release.

After the start, an edit to either file is: tell the coordinator to stop; edit the file on `tranche` on GitHub's website, which under act 10's rule becomes a pull request he merges himself; start ROOT again (part 4, section 7).

**A choice inside the order.** If the name of the required test run is fixed before the tool is built, act 10 can be made straight after act 4 and nothing is asked of him after ROOT's start. Process3's required run took its workflow file from the pull request itself [record: point3 section 0, item 7], so the first set-up pull request might then pass. That has not been tried.

**For a product moving over from Process3** there are more acts, which belong to that product's conversion plan. Known from the record: its instruction file tells a session with no starting text to "act on nothing"; its settings file carries two retired hooks; and Process3's own sessions and hourly alarm may still be alive on the account.

## 4. (b) His approvals: proposed wording

**Proposal, for the owner to adopt, change or discard. He has not written or seen these words.** Words in angle brackets are for him to fill. Each block replaces the present one under the same heading, `## Standing approvals from Bob`.

**The product's repository:**

> Standing approvals from Bob, <date>, for Process4. They cover every Claude session working on this product under Process4, including sessions that other sessions started. Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on this product on the Claude account the acting session itself runs under; start the PROCESS session on the process's repository, <owner/process>, when a process fault calls for it; create, switch off and delete the process's scheduled tasks on that account; notify me by push notification; and create and edit this product's pages on claude.ai under that account.
>
> In this repository, <owner/product>, only, and only through the process's tool, they may: push to their own job's or role's working branch; open pull requests, comment on them, mark them ready or draft, and close them; merge a pull request into the tranche branch once GitHub's required test run on it has passed, without a person's review; merge the tranche's pull request into main the same way when the tranche ends; and read and write the process's shared state, which is kept on GitHub and not as commits. They may run builds and tests, fetching public packages for them, and fetch a read-only copy of the process at the version the process config names.
>
> In the product's own Cloudflare account, the one its process config names, and in no other, they may deploy, configure, seed, reset and remove development deployments and their data, run walkers and other tests against them, and run the product's installer and updater there. Development deployments hold no secrets and keep no permanent record. They may prepare a release as far as my approval.
>
> They may never: push, merge or write to GitHub by any route other than the process's tool; force-push; delete a branch, tag or release; change permission, repository or rule settings; change this block or the list of forbidden commands; push to main except through the tranche's pull request; change the process, or move this product to a changed process without my prior approval; publish a public release, or promote a release to installed sites, without my approval of that release, <typed by me in the session that publishes it / given in GitHub's release environment>; reveal a secret value; or act on any other account or service.

**The process's repository:**

> Standing approvals from Bob, <date>, for Process4's own repository, <owner/process>. They cover the PROCESS session and the sessions it starts. Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on Process4 on the Claude account the acting session itself runs under; create, switch off and delete their own scheduled tasks on that account; notify me by push notification; and create and edit Process4 pages on claude.ai under that account.
>
> In this repository only, and only through the process's tool, they may: push to their own working branches; open pull requests, comment on them, mark them ready or draft, and close them; and run the tool's own tests.
>
> A change to the process is merged only on my word given at PROCESS. That word is my approval of that change, typed by me in the PROCESS session and written into the record of the change exactly as typed, with its date. With it, PROCESS may merge that change's pull request into main through the tool, without a person's review. Words of mine quoted or passed on by another session, and my approval of a different change, are not that word.
>
> They may never: merge a change to the process without that word; push, merge or write to GitHub by any other route; force-push; delete a branch, tag or release; change permission, repository or rule settings; change this block or the list of forbidden commands; act on a product's repository, accounts or services, which are governed only by that product's approvals; or act on any other account or service.

**What changed from the present blocks, in brief.** "Process3" becomes "Process4". "through the process's tool" now governs every push, pull request act and merge, not the merge alone. "the process's state branch" is gone, and reading and writing the shared state takes its place. "working and tranche branches" becomes "the tranche branch". Gone with the things they named: "its gate", the reviewer's exemption, "BOB", "layer close", the merge train's branches, the branch cleanup exception, "review without approving". New: the three "never" clauses on other routes, on this block and the list, and on the process; the PROCESS paragraph; the route of a release approval. Kept: "including sessions that other sessions started", "without a person's review", the Cloudflare sentence of the present block in this repository.

**Not carried over, for him to add back if the built process uses them:** subscribing to pull request activity; running the repository's workflows by hand; cutting development releases with tags and pre-releases; container images; signing secrets. With every GitHub command denied and a tool that "does only this" (part 6, section 5), a session has no stated way to do any of them.

## 5. (b) His list of forbidden commands: proposed changes

**Proposal.** The starting point is the list he committed for Process3 [record: inventory 1b, quoted there in full for the product; 21 rules described for the process's repository].

1. **Keep** the rules that already take away every direct push and every `gh` command: `Bash(git push)`, `Bash(git push *)`, `Bash(gh *)`, `Bash(curl *api.github.com*)`. The narrower push, merge and `gh api` rules above them are then covered twice and may stay or go.
2. **Add** the GitHub tools that write and were left open in Process3, where sessions opened and commented on pull requests with them. By name, as this session's own tool list shows them today: `mcp__github__create_pull_request`, `mcp__github__update_pull_request`, `mcp__github__update_pull_request_branch`, `mcp__github__create_branch`, `mcp__github__enable_pr_auto_merge`, `mcp__github__pull_request_review_write`, `mcp__github__add_issue_comment`, `mcp__github__issue_write`, `mcp__github__actions_run_trigger`, `mcp__github__create_repository`, `mcp__github__fork_repository`, beside the four already denied (`merge_pull_request`, `create_or_update_file`, `push_files`, `delete_file`). One line, `mcp__github`, would take the whole set and the reading tools with it [memory: the platform's documentation allows a rule naming a whole server; not measured here].
3. **Change** the allow rule from `Bash(node .process/tool/p3.mjs github push *)` to the Process4 tool's own path, covering all its commands: `Bash(node <path of the Process4 tool> *)`. Keep `Artifact` while sessions make pages on claude.ai. The path cannot be written until the tool exists.
4. **Remove,** in a product that carries them, the two retired hooks.
5. **In the process's repository** the list is the same, with the tool's path as it is in that repository. Its `main` has no settings file today, so this is a new file there.

Two things the record does not settle. First, the sixth draft said that unless the allow rule matches the new tool "no session can push". The record I read does not support that: the denied text begins `git push`, the tool's command begins `node`, and allow rules were measured to change nothing under Auto mode. The old line would be dead, not a block. Neither has been tried. Second, "every GitHub command" read literally also takes away reading a failed test run's output, and the tool's list names no such read. Item 2 leaves the reading tools open for that reason; it is the design's choice, not mine.

## 6. (c) Branches, and where his approvals live

**Proposal, the product's repository.**

- Two standing branches, `main` and `tranche`, and one short branch for each job or role change. No state branch.
- `tranche` is one branch that lasts. When a tranche ends, its pull request into `main` is merged with a merge commit and the next tranche goes on from the same branch. Nothing else writes to `main`, so `tranche` never has to take `main` back, and no branch is ever deleted or re-made.
- His two files are committed on `main` at the start and `tranche` is cut from it (act 8), so both branches hold them from the first moment. That matches the design's rule: each later tranche merge carries his newest wording to `main`.
- Every session starts from the newest commit of `tranche`, by commit id where a session starts it. ROOT is started by him with the branch picked, and fetches first.
- He edits the two files on `tranche` only. Between an edit and the next tranche merge, `main` holds his older wording. A session that came up on `main` would act on that older wording, which is why act 9 names the branch.
- His edit is a pull request into `tranche` that he merges on the website. By part 2, section 9 the required test run "passes at once when no module's code or tests changed", so nothing waits. The same holds for the tranche's pull request into `main`.
- The default branch stays `main`. The fifth draft's request to change it was withdrawn in the sixth.

**Proposal, the process's repository.**

- `main` holds the process as products use it, and his two files. A product's process config names one commit of `main`.
- PROCESS starts on that repository alone, from the newest commit of `main`, and works on its own short branches. A change reaches `main` only by pull request, merged by PROCESS through the tool after his word is in the record of the change.
- ROOT, which holds the product's repository, starts PROCESS. PROCESS then loads the process's block and list, not the product's.

**What this leaves open.** An urgent fix while a tranche is open is with the owner (part 3, section 8). If it is built on a branch cut from `main`, that branch carries his wording as of the last tranche merge. And PROCESS, started by a session, inherits its starter's cloud environment [record: `working/audit2_feasibility.md`, finding 9, from the platform's text, not tried], so it would hold the product's deploy token.

## 7. Proven and not proven

**Ran in Process3 and is recorded:** his website commits as the channel for approvals, edited about ten times in each repository; a second account with Write; the rules of section 2; the token as an environment variable; the eleven-step start-up of 1 and 2 Nov; his own approvals edits merging as pull requests three times; a ROOT he started moving to the newest commit and starting the other roles, 2 of 2; a session on one repository starting a session on another.

**Not proven:**
- Any of the proposed wording. No session has loaded it and the permission checker has judged nothing under it. The nearest record against a block worded for one repository is the two refused pushes of 8 Nov, cause unknown.
- A merge of a process change on his typed word. The nearest record is 0 of 21 refusals on typed consent, with no evidence file.
- Merges, pushes and shared-state writes by the Process4 tool, which is not built.
- A whole-server deny rule; and each newly denied tool being removed.
- A ROOT started by a plain prompt acting as ROOT on these files.
- The order of acts 9 and 10, and the choice beside it.
- The live GitHub settings of any repository. Section 2 is what he was asked to set.

## 8. What was read, and what could not be found

**Read in full:** seventh draft parts 0, 1, 4, 6, 7, 9 (86, 79, 133, 69, 52, 28 lines); the root `CLAUDE.md` (3 lines); `working/foundations_updated/09-permissions-and-platform.md` (100); `evidence/permissions_inventory.md` (462); `working/session2/point3_first_hour.md` (231); `working/design_state_18nov.md` (143, long lines cut at 600 characters). **By passage:** `evidence/foundations.md` 178 to 216, and the same passage of `foundations_tranche_9nov.md` by comparison; sixth draft 400 to 424; `working/trial_plan_facts.md` 1 to 35 and 425 to 510; `working/k_evidence.md` 110 to 150; `working/audit2_feasibility.md` 28 to 62, 136 to 152, 222 to 240, 262 to 292; `working/readiness_18nov/open_items.md` 19 to 30; seventh draft parts 2, 3, 5, 10 by search. **By search only:** `evidence/levers_github_cloudflare_product.md`, `working/enforcement_levers.md`, both `process3_limits_18nov` files (nothing on these subjects), `working/harness_separation/`, `working/readiness_18nov/proof_status.md`, `owner_words/`.

**Could not be found.**
- A `.claude/settings.json` in this repository on this branch. There is none. The lists quoted are from the inventory, which read other branches and the product.
- Process3's own guide of eleven steps: its step 1 and the exact text of every step. Only other files' accounts of it were read.
- The process repository's approvals as restated on 8 Nov. Only their description was read.
- The owner's typed words of 18 Nov on rewording his approvals for PROCESS. `owner_words/` ends at 17 Nov; the design state gives the ruling in Claude's words.
- Evidence files for "11 of 11", "0 of 21", "about 450" and "15 of 15".
- The Process4 tool's path and command names, and the name of the required test run. Neither exists yet.
- How his approval of a public release reaches the session that publishes. Who publishes is open with him (part 3, section 6).
- Whether a rule can name a required check that has never run, and whether his app can start a session at a commit id.
- Why the sessions' account was suspended on 6 Nov, and why the pushes of 8 Nov were refused.
- What carries his act of connecting an AI account to the development deployment.
