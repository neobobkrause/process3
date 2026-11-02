# The developer's steps

These are the steps only you, the owner of the product's repository, can take. A Claude session cannot take any of them, and nothing a session can do is listed here. Take them in order, once per product. Each step says why it is needed, what to click on github.com, how BOB (the coordinating Claude session) confirms it, and which entry of the setup list (`setup/conditions.json`) it sets.

BOB confirms most steps by running `p3 setup check`, which reads your repository and prints one line per entry: `set`, `missing`, `unmeasured` (nothing to measure yet), `not configured` (the product's config does not ask for it), or `confirmed` (GitHub does not let a session read it, so your word on the onboarding page stands for it). No job starts while an entry is `missing`.

Words used below, filled in when BOB shows you this page for your product: `<owner>/<product>` is the repository; `<session account>` is the second GitHub account the Claude sessions act as. The **tranche** is the branch the sessions' work collects in before it reaches `main` (named `tranche` unless `process/config.json` says otherwise). The **required check** is `gate` unless `process/config.json` names another.

## Step 1. Own the product's repository

Why: every other step is a setting of this repository, and only its owner can change settings.

Clicks: if the repository does not exist yet, on github.com click **+** (top right), then **New repository**, name it `<product>`, and click **Create repository**. If it exists under another account, that account's owner moves it to you: **Settings**, then **General**, then at the bottom **Transfer**.

How BOB confirms: BOB can open the repository with `gh api repos/<owner>/<product>`, and its owner is you.

Sets: none; the setup check reads the repository, so it cannot run before the repository is yours.

## Step 2. Add the session account, and accept the invitation as that account

Why: the sessions push their own branches and open pull requests as the session account, so it needs Write. It must not be an admin, so it can never change these settings or get around the rules below.

Clicks:
1. Signed in as yourself, open `<owner>/<product>`, click **Settings**, then **Collaborators** (under Access), then **Add people**. Type `<session account>`, pick it, and click **Add ... to this repository**. On a repository you own personally, a collaborator gets Write, never admin.
2. Sign out, and sign in to GitHub as `<session account>`. Open `https://github.com/<owner>/<product>/invitations` (or the invitation email) and click **Accept invitation**.
3. Back as yourself, in **Settings**, **Collaborators**, check that `<session account>` is the only other person listed.

How BOB confirms: `p3 setup check` shows `account` set (push, not admin). The collaborator list cannot be read by a session, so you confirm it on the onboarding page.

Sets: `account`, `collaborators`.

## Step 3. Point Claude's GitHub connection at the session account

Why: the sessions act on GitHub through Claude's GitHub connection. If it is connected as you, every session would act as the owner, and the rules below would not hold them.

Clicks:
1. In your browser, sign in to GitHub as `<session account>` (not as yourself).
2. Open `https://claude.ai/connect-github` and connect (or reconnect) GitHub. When GitHub asks you to authorize Claude, check that the account shown at the top is `<session account>`, then click **Authorize**.
3. If the page asks for the Claude GitHub App to be installed on the repository, install it from your own account, and choose **Only select repositories** with just `<owner>/<product>`.

How BOB confirms: `p3 setup check` shows `account` set, and the account it names is `<session account>`, not yours.

Sets: `account`.

## Step 4. Write the standing approvals into CLAUDE.md, through GitHub's website

Why: the standing approvals say what sessions may do without asking you. The checks accept a change to them only when it is your own commit made on GitHub's website, so a session cannot widen its own approvals. Take this step before Step 7, which stops anyone writing to `main` directly.

Clicks: open the repository's `CLAUDE.md` on `main` (or click **Add file**, then **Create new file**, if there is none), click the pencil (**Edit this file**), add the heading `process/config.json` names for the approvals (by default `## Standing approvals from Bob`) with your approvals under it, click **Commit changes...**, choose **Commit directly to the main branch**, and click **Commit changes**.

How BOB confirms: the record check passes on the tranche once the approvals reach it. It reports any change to the approvals that is not your own website commit.

Sets: none; the record check, not the setup list, judges the approvals on every pull request.

## Step 5. Merge settings

Why: the sessions' work is merged by the tool alone, with a merge commit, so each pull request's history stays whole, and no branch is ever deleted.

Clicks: **Settings**, then **General**, then the **Pull Requests** section: tick **Allow merge commits**; untick **Allow auto-merge**; untick **Automatically delete head branches**. Each saves when clicked.

How BOB confirms: `p3 setup check` shows `merge-settings` set.

Sets: `merge-settings`.

## Step 6. The deny list in .claude/settings.json, committed by you on the tranche

Why: the deny list stops every session from force-pushing, deleting a branch, writing files through GitHub instead of git, and merging any way but the tool. The settings file is yours: the checks find any change to it that is not your own commit on GitHub's website. Take this step before Step 7, so it is a direct commit to the tranche.

Clicks: BOB first creates the tranche branch and its setup (the process files and the gate workflow) and tells you when they are there. Then, on github.com, switch to the tranche branch and open `.claude/settings.json`; if there is none, click **Add file**, then **Create new file**, and name it `.claude/settings.json`. Click the pencil (**Edit this file**). Make sure the `"deny"` list under `"permissions"` holds these lines, and holds no rule that would block a session's push of its own branch, such as `"Bash(git push origin :*)"`:

```
"Bash(git push --force *)",
"Bash(git push -f *)",
"Bash(git push --force-with-lease *)",
"Bash(git push origin --delete *)",
"mcp__github__create_or_update_file",
"mcp__github__push_files",
"mcp__github__delete_file",
"Bash(gh api *contents/*)",
"mcp__github__merge_pull_request",
"Bash(gh pr merge *)",
"Bash(gh api *pulls/*/merge*)"
```

Click **Commit changes...**, choose **Commit directly to the tranche branch**, and click **Commit changes**.

How BOB confirms: `p3 setup check` shows `deny-list` set.

Sets: `deny-list`.

## Step 7. A ruleset on main and the tranche

Why: nothing reaches `main` or the tranche except through a pull request whose required check is green, merged with a merge commit. Step 8 keeps every branch, these two included, from being deleted or rewritten.

Clicks: **Settings**, then **Rules**, then **Rulesets**, then **New ruleset**, then **New branch ruleset**.
1. Name it (for example `process3`). Set **Enforcement status** to **Active**. Leave **Bypass list** empty: no app, no deploy key, no role.
2. Under **Target branches**, click **Add target**, then **Include by pattern**, and enter `main`. Do it again for `tranche`.
3. Tick **Require a pull request before merging**. Open **Additional settings** and, under **Allowed merge methods**, leave only **Merge**.
4. Tick **Require status checks to pass**, click **Add checks**, type `gate`, and pick the one whose source is **GitHub Actions**. If `gate` is not offered (no gate has run yet), type `gate` in full, add it, and set its source to **GitHub Actions**, not any source.
5. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-main-tranche` set. The bypass list cannot be read whole by a session, so you confirm it on the onboarding page.

Sets: `ruleset-main-tranche`, `ruleset-bypass`.

## Step 8. A ruleset named every-branch, on all branches

Why: no session may delete any branch or rewrite its history, wherever it is.

Clicks: **Settings**, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**. Name it `every-branch`, set **Enforcement status** to **Active**, and leave **Bypass list** empty: no app, no deploy key, no role. Under **Target branches**, click **Add target**, then **Include all branches**. Under **Branch rules**, tick **Restrict deletions** and **Block force pushes**, and nothing else. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-all-branches` set; you confirm the empty bypass list on the onboarding page.

Sets: `ruleset-all-branches`, `ruleset-bypass`.

## Step 9. Actions settings, secrets and environments

Why: the gate runs the product's code from every pull request. Only its posting step gets a token that can write, and only for that step; no deploy or release key may be within the gate's reach, since those live in Claude's cloud environment (Step 10). The gate's records must be kept 90 days, because a merge trusts a gate result only while its record still exists.

Clicks:
1. **Settings**, then **Actions**, then **General**. Under **Artifact and log retention**, enter `90` days and click **Save**. Under **Workflow permissions**, choose **Read repository contents and packages permissions**, untick **Allow GitHub Actions to create and approve pull requests**, and click **Save**.
2. **Settings**, then **Secrets and variables**, then **Actions**: there should be no repository secrets.
3. **Settings**, then **Environments**: there should be none. If one must exist, open it and under **Deployment branches and tags** choose **Selected branches and tags** with `main` only.

How BOB confirms: `p3 setup check` shows `artifact-retention` set once the first gate has run (`unmeasured` before then). The other three cannot be read by a session, so you confirm them on the onboarding page.

Sets: `actions-settings`, `artifact-retention`, `secrets`, `environments`.

## Step 10. Add the product's deploy tokens to the Claude cloud environment

Why: the process deploys the product so walkers can run and each round can find and fix flaws, unattended. The sessions need the product's deploy tokens for that, in their own environment.

Clicks:
1. Open any Claude Code session for this product on claude.ai. Click the cloud environment menu in the session's title bar, then **Edit**.
2. Add each variable that `process/config.json` lists under `"environment"` (for example `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`), with exactly that name, as an environment variable, because `p3 setup check` and the product's deploy tools read environment variables. Set `CLOUDFLARE_ACCOUNT_ID` to the account `process/config.json` names as `"cloudflare_account"`. Save.
3. Never paste a token into a chat. New sessions pick up the change.

How BOB confirms: `p3 setup check` shows `environment` set (it prints only the names) and `deploy-account` set (it prints only the configured account and whether it matches). Before `process/config.json` lists them, both show `not configured`.

Sets: `environment`, `deploy-account`.
