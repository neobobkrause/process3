# The developer's steps

These are the steps only you, the owner of the product's repository, can take. A Claude session cannot take any of them, and nothing a session can do is listed here. Take them in order, once per product. Each step says why it is needed, what to click on github.com, how BOB (the coordinating Claude session) confirms it, and which entry of the setup list (`setup/conditions.json`) it sets.

BOB confirms most steps by running `p3 setup check`, which reads your repository and prints one line per entry: `set`, `missing`, `unmeasured` (nothing to measure yet), or `confirmed` (GitHub does not let a session read it, so your word on the onboarding page stands for it). No job starts while an entry is `missing`.

Words used below: the **session account** is the second GitHub account the Claude sessions act as (for civicsmith-copy, `civicsmith`). The **tranche** is the branch the sessions' work collects in before it reaches `main` (named `tranche` unless `process/config.json` says otherwise). The **required check** is `gate` unless `process/config.json` names another.

## Step 1. Own the product's repository

Why: every other step is a setting of this repository, and only its owner can change settings.

Clicks: if the repository does not exist yet, on github.com click **+** (top right), then **New repository**, give it a name, and click **Create repository**. If it exists under another account, that account's owner moves it to you: **Settings**, then **General**, then at the bottom **Transfer**.

How BOB confirms: BOB can open the repository with `gh api repos/<owner>/<repository>`, and its owner is you.

Sets: none; every later step needs it.

## Step 2. Add the session account, and accept the invitation as that account

Why: the sessions push their own branches and open pull requests as the session account, so it needs Write. It must not be an admin, so it can never change these settings or get around the rules below.

Clicks:
1. Signed in as yourself, open the repository, click **Settings**, then **Collaborators** (under Access), then **Add people**. Type the session account's name, pick it, and click **Add ... to this repository**. On a repository you own personally, a collaborator gets Write, never admin.
2. Sign out, and sign in to GitHub as the session account. Open `https://github.com/<owner>/<repository>/invitations` (or the invitation email) and click **Accept invitation**.
3. Back as yourself, in **Settings**, **Collaborators**, check that the session account is the only other person listed.

How BOB confirms: `p3 setup check` shows `account` set (push, not admin). The collaborator list cannot be read by a session, so you confirm it on the onboarding page.

Sets: `account`, `collaborators`.

## Step 3. Point Claude's GitHub connection at the session account

Why: the sessions act on GitHub through Claude's GitHub connection. If it is connected as you, every session would act as the owner, and the rules below would not hold them.

Clicks:
1. In your browser, sign in to GitHub as the session account (not as yourself).
2. Open `https://claude.ai/connect-github` and connect (or reconnect) GitHub. When GitHub asks you to authorize Claude, check that the account shown at the top is the session account, then click **Authorize**.
3. If the page asks for the Claude GitHub App to be installed on the repository, install it from your own account, and choose **Only select repositories** with just this repository.

How BOB confirms: `p3 setup check` shows `account` set, and the account it names is the session account, not yours.

Sets: `account`.

## Step 4. Write the standing approvals into CLAUDE.md, through GitHub's website

Why: the standing approvals say what sessions may do without asking you. The checks accept a change to them only when it is your own commit made on GitHub's website, so a session cannot widen its own approvals. Take this step before Step 6, which stops anyone writing to `main` directly.

Clicks: open the repository's `CLAUDE.md` on `main` (or click **Add file**, then **Create new file**, if there is none), click the pencil (**Edit this file**), add the heading `## Standing approvals from Bob` (the heading `process/config.json` names) with your approvals under it, click **Commit changes...**, choose **Commit directly to the main branch**, and click **Commit changes**.

How BOB confirms: the record check passes on the tranche once the approvals reach it. It reports any change to the approvals that is not your own website commit.

Sets: none in the list; the record check holds it on every pull request.

## Step 5. Merge settings

Why: the sessions' work is merged by the tool alone, with a merge commit, so each pull request's history stays whole, and no branch is ever deleted.

Clicks: **Settings**, then **General**, then the **Pull Requests** section: tick **Allow merge commits**; untick **Allow auto-merge**; untick **Automatically delete head branches**. Each saves when clicked.

How BOB confirms: `p3 setup check` shows `merge-settings` set.

Sets: `merge-settings`.

## Step 6. A ruleset on main and the tranche

Why: nothing reaches `main` or the tranche except through a pull request whose required check is green, merged with a merge commit; and neither branch can be deleted or rewritten.

Clicks: **Settings**, then **Rules**, then **Rulesets**, then **New ruleset**, then **New branch ruleset**.
1. Name it (for example `process3`). Set **Enforcement status** to **Active**. Leave **Bypass list** empty.
2. Under **Target branches**, click **Add target**, then **Include by pattern**, and enter `main`. Do it again for `tranche`.
3. Under **Branch rules**, tick **Restrict deletions** and **Block force pushes**.
4. Tick **Require a pull request before merging**. Open **Additional settings** and, under **Allowed merge methods**, leave only **Merge**.
5. Tick **Require status checks to pass**, click **Add checks**, type `gate`, and pick the one whose source is **GitHub Actions**.
6. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-main-tranche` set.

Sets: `ruleset-main-tranche`.

## Step 7. A ruleset named every-branch, on all branches

Why: no session may delete any branch or rewrite its history, wherever it is.

Clicks: **Settings**, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**. Name it `every-branch`, set **Enforcement status** to **Active**, leave **Bypass list** empty. Under **Target branches**, click **Add target**, then **Include all branches**. Under **Branch rules**, tick **Restrict deletions** and **Block force pushes**, and nothing else. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-all-branches` set.

Sets: `ruleset-all-branches`.

## Step 8. Actions settings, secrets and environments

Why: the gate runs the product's code from every pull request. Only its posting step gets a token that can write, and only for that step; no key the sessions must not use (Cloudflare, releases, signing) may be within its reach. The gate's records must be kept 90 days, because a merge trusts a gate result only while its record still exists.

Clicks:
1. **Settings**, then **Actions**, then **General**. Under **Artifact and log retention**, enter `90` days and click **Save**. Under **Workflow permissions**, choose **Read repository contents and packages permissions**, untick **Allow GitHub Actions to create and approve pull requests**, and click **Save**.
2. **Settings**, then **Secrets and variables**, then **Actions**: there should be no repository secrets. Keys the jobs need live in Claude's cloud environment, not here.
3. **Settings**, then **Environments**: there should be none. If one must exist, open it and under **Deployment branches and tags** choose **Selected branches and tags** with `main` only.

How BOB confirms: `p3 setup check` shows `artifact-retention` set once the first gate has run (`unmeasured` before then). The other three cannot be read by a session, so you confirm them on the onboarding page.

Sets: `actions-settings`, `artifact-retention`, `secrets`, `environments`.

## Step 9. The deny list in .claude/settings.json, committed by you

Why: the deny list stops every session from editing its own settings file, force-pushing, deleting a branch, writing files through GitHub instead of git, and merging any way but the tool. A session cannot change its own settings file, so the commit is yours.

Clicks: on the tranche, open `.claude/settings.json` and click the pencil (**Edit this file**). Make sure the `"deny"` list under `"permissions"` holds these lines, and does not hold `"Bash(git push origin :*)"`, which would block every push:

```
"Edit(.claude/settings.json)",
"Bash(git push --force *)",
"Bash(git push -f *)",
"Bash(git push --force-with-lease *)",
"Bash(git push origin --delete *)",
"Bash(gh api *contents/*)",
"mcp__github__create_or_update_file",
"mcp__github__push_files",
"mcp__github__delete_file",
"mcp__github__merge_pull_request",
"Bash(gh pr merge *)",
"Bash(gh api *pulls/*/merge*)"
```

Click **Commit changes...**. Step 6 stops direct commits to the tranche, so choose **Create a new branch for this commit and start a pull request**, click **Propose changes**, then **Create pull request**. When its `gate` check is green, click **Merge pull request** and **Confirm merge**.

How BOB confirms: `p3 setup check` shows `deny-list` set.

Sets: `deny-list`.
