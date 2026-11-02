# The developer's steps

There are 11 steps. Take them in order, in one sitting, with no pause: once the repository is yours (Step 1), none of them waits on another person. These are the steps only you, the owner of the product's repository, can take. A Claude session cannot take any of them, and nothing a session can do is listed here. Each step says why it is needed, the exact clicks on github.com (or Cloudflare, or claude.ai), how BOB (the coordinating Claude session) confirms it, and which entry of the setup list (`setup/conditions.json`) it sets.

The order, in short:
- Steps 1 and 2: your account and the repository, signed in as yourself.
- Step 3: the session account's part, in a private window, so your own window stays signed in as you.
- Steps 4 to 8: while you take these, BOB pushes the tranche (after Step 3) and runs the gate once (after Step 4).
- Steps 9 and 10: the approvals and the deny list, as your own commits directly on the tranche.
- Step 11, last: the ruleset on `main` and the tranche, which stops direct commits to them.

When you are done, tell BOB on the onboarding page. BOB starts a fresh session from the tranche branch (the deploy variables reach only sessions started after you saved them) and runs `p3 setup check` there once, which reads everything back.

`p3 setup check` prints one line per entry: `set`, `missing`, `unmeasured` (nothing to measure yet), `not configured` (the product's config does not ask for it), or `confirmed` (GitHub does not let a session read it, so your word on the onboarding page stands for it). No job starts while an entry is `missing`.

Words used below, filled in when BOB shows you this page for your product: `<owner>/<product>` is the repository; `<session account>` is the second GitHub account the Claude sessions act as; `<tranche>` is the tranche's name. The **tranche** is the branch the sessions' work collects in before it reaches `main` (named `tranche` unless `process/config.json` says otherwise). The **required check** is `gate` unless `process/config.json` names another.

Two rules for every edit you make on github.com:
- Only an edit made on github.com in the browser, signed in as yourself, counts: the pencil (**Edit this file**) or **Add file**, then **Create new file**. Do not upload a file (**Add file**, then **Upload files**): the edit page shows you exactly the text you commit, and an upload does not. Do not use GitHub Desktop or `git push`: those are not website commits, and the checks report them.
- If GitHub offers to commit only to a new branch, it opens a pull request on the next page. On that page, set **base** to the tranche, not `main`, before you click **Create pull request**.

## Step 1. Own the product's repository

Why: every other step is a setting of this repository, and only its owner can change settings.

Clicks: signed in to github.com as yourself. If the repository does not exist yet, click **+** (top right), then **New repository**, name it `<product>`, and click **Create repository**. If it exists under another account, that account's owner moves it to you: **Settings**, then **General**, then at the bottom **Transfer**.

How BOB confirms: BOB can open the repository with `gh api repos/<owner>/<product>`, and its owner is you.

Sets: none, because the setup check reads this repository, so it cannot run before the repository is yours; Step 3's `account` reads it.

## Step 2. Install the Claude GitHub App, and invite the session account, as yourself

Why: the sessions reach the repository through the Claude GitHub App, which only the owner can install on it. The sessions push their own branches and open pull requests as the session account, so it needs Write. It must not be an admin, so it can never change these settings or get around the rules below.

Clicks: signed in to github.com as yourself, in your own window.

1. Open `https://github.com/apps/claude/installations/select_target`, pick your own account. If **All repositories** is already chosen, leave it, since `<owner>/<product>` is then included. Otherwise choose **Only select repositories**, pick `<owner>/<product>` (keeping any repositories already listed), and click **Install** (or **Save**).
2. Open `https://github.com/<owner>/<product>/settings/access` (**Settings**, then **Collaborators**), click **Add people**, type `<session account>`, pick it, and click **Add ... to this repository**. On a repository you own personally, a collaborator gets Write, never admin.
3. On the same page, check that `<session account>` is the only other person listed.

How BOB confirms: the collaborator list cannot be read by a session, so you confirm it on the onboarding page. Step 3 makes `account` readable.

Sets: `collaborators`.

## Step 3. In a private window: accept the invitation and connect Claude's GitHub as the session account

Why: the sessions act on GitHub through Claude's GitHub connection. If it is connected as you, every session would act as the owner, and the rules below would not hold them. A private window keeps the session account's sign-in apart, so your own window stays signed in as you for every later step.

Clicks:
1. Open a private window: in Chrome or Edge press Ctrl+Shift+N (Cmd+Shift+N on a Mac); in Firefox, Ctrl+Shift+P (Cmd+Shift+P); in Safari, **File**, then **New Private Window**.
2. In the private window, open `https://github.com/login` and sign in as `<session account>`. Open `https://github.com/<owner>/<product>/invitations` and click **Accept invitation**.
3. In the same private window, open `https://claude.ai/connect-github` and sign in to claude.ai with your own Claude account. If claude.ai emails you a sign-in link, copy the link (or the code) from the email into the private window, not your normal one, so the sign-in lands there. Then connect (or reconnect) GitHub. When GitHub asks you to authorize Claude, check that the account shown at the top is `<session account>`, then click **Authorize**. If GitHub offers to install the Claude app on `<session account>`, close that page without installing: Step 2 already installed it on the repository.
4. Close the private window. Your own window is still signed in to github.com as you.
5. On the onboarding page, tell BOB Step 3 is done. BOB then pushes the tranche while you go on with Step 4.

How BOB confirms: `p3 setup check` shows `account` set (push, not admin), and the account it names is `<session account>`, not yours.

Sets: `account`.

## Step 4. Actions settings, secrets and environments

Why: the gate runs the product's code from every pull request. Only its posting step gets a token that can write, and only for that step; no deploy or release key may be within the gate's reach, since those live in Claude's cloud environment (Step 8). The gate's records must be kept 90 days, because a merge trusts a gate result only while its record still exists. A record keeps the retention set when it was made, so take this step first of Steps 4 to 8, and tell BOB when it is saved: BOB runs the gate once only then.

Clicks:
1. Open `https://github.com/<owner>/<product>/settings/actions` (**Settings**, then **Actions**, then **General**). Under **Artifact and log retention**, enter `90` days and click **Save**. Under **Workflow permissions**, choose **Read repository contents and packages permissions**, untick **Allow GitHub Actions to create and approve pull requests**, and click **Save**.
2. **Settings**, then **Secrets and variables**, then **Actions**: there should be no repository secrets.
3. **Settings**, then **Environments**: there should be none. If one must exist, open it and under **Deployment branches and tags** choose **Selected branches and tags** with `main` only.
4. On the onboarding page, tell BOB Step 4 is saved. BOB runs the gate once while you take Steps 5 to 8.

How BOB confirms: `p3 setup check` shows `artifact-retention` set once the gate has run (`unmeasured` before then). The other three cannot be read by a session, so you confirm them on the onboarding page.

Sets: `actions-settings`, `artifact-retention`, `secrets`, `environments`.

## Step 5. Merge settings

Why: the sessions' work is merged by the tool alone, with a merge commit, so each pull request's history stays whole, and no branch is ever deleted.

Clicks: open `https://github.com/<owner>/<product>/settings` (**Settings**, then **General**), and scroll to the **Pull Requests** section: tick **Allow merge commits**; untick **Allow auto-merge**; untick **Automatically delete head branches**. Each saves when clicked.

How BOB confirms: `p3 setup check` shows `merge-settings` set.

Sets: `merge-settings`.

## Step 6. Delete any classic branch protection rule

Why: the rulesets in Steps 7 and 11 hold `main` and the tranche. An older classic branch protection rule adds requirements the tool does not expect, and a session cannot read who may bypass it.

Clicks: open `https://github.com/<owner>/<product>/settings/branches` (**Settings**, then **Branches**). Under **Branch protection rules**, for each rule listed, click **Delete**, then confirm in the dialog that opens. If the page says there are no branch protection rules, there is nothing to do.

How BOB confirms: `p3 setup check` shows `classic-protection` set. It reads `main` and the tranche (`protected`, and the protection itself where GitHub lets a session read it) and reports any classic rule as missing, to remove.

Sets: `classic-protection`.

## Step 7. A ruleset named every-branch, on all branches

Why: no session may delete any branch or rewrite its history, wherever it is. This ruleset does not stop your own commits in Steps 9 and 10.

Clicks: open `https://github.com/<owner>/<product>/settings/rules` (**Settings**, then **Rules**, then **Rulesets**), click **New ruleset**, then **New branch ruleset**.
1. Name it `every-branch`. Set **Enforcement status** to **Active**. Leave **Bypass list** empty: no app, no deploy key, no role.
2. Under **Target branches**, click **Add target**, then **Include all branches**.
3. Under **Branch rules**, make sure **Restrict deletions** and **Block force pushes** are ticked, and nothing else.
4. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-all-branches` set; you confirm the empty bypass list on the onboarding page.

Sets: `ruleset-all-branches`, `ruleset-bypass`.

## Step 8. The deploy token, in the Claude cloud environment

Why: the process deploys the product so walkers can run and each round can find and fix flaws, unattended. The sessions need the product's deploy token for that, in their own environment. The product binds R2, Durable Objects, containers, service bindings, browser rendering and send_email, so the token needs each scope below; without Workers KV, `wrangler delete` exits with an error after it has succeeded.

Clicks:
1. On `https://dash.cloudflare.com`, sign in. The product's account is the one whose **Account ID** is the value `process/config.json` names as `"cloudflare_account"` (BOB shows it on the onboarding page; each account's ID is on its **Account home**, under the account's name, or in the URL after `dash.cloudflare.com/`). In that account, click **R2 Object Storage** in the left sidebar. If the page offers to enable or purchase R2 instead of listing buckets, follow it to enable R2 (it has a free tier; Cloudflare may ask for a payment method), because the token's R2 scope cannot be read until R2 is on. Click your profile icon (top right), then **My Profile**, then **API Tokens**, then **Create Token**. Next to **Create Custom Token**, click **Get started**.
2. Name it (for example `<product> development`). Under **Permissions**, add these four rows, using **+ Add more** for each after the first, all under **Account**:
   - **Workers Scripts**: **Edit**
   - **Workers R2 Storage**: **Edit**
   - **Containers**: **Edit**
   - **Workers KV Storage**: **Read**
3. Under **Account Resources**, choose **Include** and the product's account (the one with that Account ID). Click **Continue to summary**, then **Create Token**, and copy the token. Never paste it into a chat.
4. On claude.ai, open any Claude Code session for this product. Click the cloud environment menu in the session's title bar, then **Edit**. Add each variable that `process/config.json` lists under `"environment"` (for example `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`), with exactly that name, as an environment variable (not under Network secrets), because `p3 setup check` and the product's deploy tools read environment variables. Set `CLOUDFLARE_API_TOKEN` to the token, and `CLOUDFLARE_ACCOUNT_ID` to that Account ID. Click **Save**.

How BOB confirms: the variables reach only sessions started after you save, so BOB confirms from a new session. `p3 setup check` there shows `environment` set (it prints only the names), `deploy-account` set (it prints only the configured account and whether it matches), and `deploy-token` set: it makes one harmless read per scope (list Workers scripts, list R2 buckets, list containers, list KV namespaces) and reports each scope present or missing, never printing the token. A read cannot tell Edit from Read, so choose **Edit** exactly as listed above. Before `process/config.json` lists them, all three show `not configured`.

Sets: `environment`, `deploy-account`, `deploy-token`.

## Step 9. The standing approvals, in CLAUDE.md on the tranche

Why: the standing approvals say what sessions may do without asking you. A session acts on them only when they are on the branch it starts from, and every session starts from the tranche. The checks accept a change to them only when it is your own commit made on github.com, so a session cannot widen its own approvals. BOB's setup puts nothing in the approvals block: the text is yours. Take this step before Step 11, which stops direct commits to the tranche.

Clicks: signed in to github.com as yourself, in your own window.

1. Open `https://github.com/<owner>/<product>/tree/<tranche>`. If GitHub shows a 404 page, BOB has not pushed the tranche yet: ask BOB on the onboarding page, and take this step once BOB says it is there. Otherwise, look at the file list: if `CLAUDE.md` is in it, open `https://github.com/<owner>/<product>/edit/<tranche>/CLAUDE.md`; if not, open `https://github.com/<owner>/<product>/new/<tranche>?filename=CLAUDE.md`. Check that the branch shown above the editor is the tranche.
2. Add this heading on a line of its own (or the heading `process/config.json` names under `"approvals"`), once, and only once in the file:

   ```
   ## Standing approvals from Bob
   ```

3. Under it, paste your approvals: the text is your own, from your onboarding page. Give your text no heading of its own that holds any form of the word "approve" (approve, approved, approval): the checks count every such heading, and allow one. Leave any other part of the file as it is.
4. Make the change here, in the browser, signed in as yourself. An upload, GitHub Desktop or a `git push` does not count.
5. Click **Commit changes...**, choose **Commit directly to the `<tranche>` branch**, and click **Commit changes**. If only **Create a new branch** is offered, on the next page set **base** to the tranche, not `main`, then click **Create pull request**; BOB merges it.

How BOB confirms: `p3 setup check` shows `approvals` set: one approvals block in `CLAUDE.md` on the tranche, last changed by your own commit through GitHub's website. It judges by the owner `process/config.json` on the tranche names under `"approvals"`, `"owner"` (by default `neobobkrause`). The record check also reports any later change to the approvals that is not your own website commit.

Sets: `approvals`.

## Step 10. The deny list, in .claude/settings.json on the tranche

Why: the deny list stops every session from force-pushing, deleting a branch, writing files through GitHub instead of git, and merging any way but the tool. The settings file is yours: the checks find any change to it that is not your own commit on GitHub's website. BOB's setup puts nothing under `.claude/`, so you create the file. Take this step before Step 11, so it is a direct commit to the tranche.

Clicks: signed in to github.com as yourself, in your own window.

1. Open `https://github.com/<owner>/<product>/tree/<tranche>` (it is there: you used it in Step 9). If the file list shows a `.claude` folder holding `settings.json`, open `https://github.com/<owner>/<product>/edit/<tranche>/.claude/settings.json` and replace its whole text; otherwise open `https://github.com/<owner>/<product>/new/<tranche>?filename=.claude/settings.json`. Check that the branch shown is the tranche.
2. Make the change here, in the browser, signed in as yourself; an upload, GitHub Desktop or a `git push` does not count. Paste this whole file, exactly. Do not add a rule such as `"Bash(git push origin :*)"`: it would block a session's push of its own branch.

   ```json
   {
     "permissions": {
       "deny": [
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
       ]
     }
   }
   ```

3. Click **Commit changes...**, choose **Commit directly to the `<tranche>` branch**, and click **Commit changes**. If only **Create a new branch** is offered, on the next page set **base** to the tranche, not `main`, then click **Create pull request**; BOB merges it.

How BOB confirms: `p3 setup check` shows `deny-list` set.

Sets: `deny-list`.

## Step 11. A ruleset on main and the tranche (last)

Why: nothing reaches `main` or the tranche except through a pull request whose required check is green, merged with a merge commit. The tool merges once the check passes, without a person's review, so the ruleset asks for no approving review. Step 7 keeps every branch, these two included, from being deleted or rewritten. This step is last because it stops your direct commits in Steps 9 and 10.

Clicks: open `https://github.com/<owner>/<product>/settings/rules` (**Settings**, then **Rules**, then **Rulesets**), click **New ruleset**, then **New branch ruleset**.
1. Name it (for example `process3`). Set **Enforcement status** to **Active**. Leave **Bypass list** empty: no app, no deploy key, no role.
2. Under **Target branches**, click **Add target**, then **Include by pattern**, and enter `main`. Do it again for the tranche's name.
3. Tick **Require a pull request before merging**. Leave **Required approvals** at `0`, and leave **Require review from Code Owners** unticked: the tool merges once the check is green, and a required review would stop every merge. Open **Additional settings** and, under **Allowed merge methods**, leave only **Merge**. Leave **Restrict deletions** and **Block force pushes** as GitHub sets them here: Step 7 already holds both on every branch.
4. Tick **Require status checks to pass**, click **Add checks**, type `gate`, and pick the one whose source is **GitHub Actions** (BOB ran the gate once after Step 4, so it is offered). If it is not offered, type `gate` in full, add it, and set its source to **GitHub Actions**, not any source.
5. Click **Create**.

How BOB confirms: `p3 setup check` shows `ruleset-main-tranche` set. The bypass list cannot be read whole by a session, so you confirm it on the onboarding page.

Sets: `ruleset-main-tranche`, `ruleset-bypass`.
