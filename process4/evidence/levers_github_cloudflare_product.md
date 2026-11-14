# Process4 levers: GitHub, Cloudflare and the product itself

Prepared 13 Nov 2026. Scope: which jobs of the Process3 custom tool a native feature of GitHub, Cloudflare or the product can take over, so that no session-written code is needed and no session can modify it. Claude Code and model levers are another analyst's part and are only named here where they join.

How to read the confidence marks:

- **[doc]** read today in the vendor's documentation (GitHub docs source at `github/docs` main, Cloudflare docs Markdown, vendor changelogs). URLs are given.
- **[repo]** read from the local clones (`process3` at `origin/tranche` 38b0f3f, `civicsmith-copy` at `origin/tranche` e7ec72e).
- **[inference]** my reasoning from the above; not stated by a vendor.
- **[untested]** depends on behaviour nobody has measured on these repositories; see section 12.

Not available to me: the GitHub API for either repository (this session has git read access only, and I did not ask for more), so the live rulesets, environments, secrets and PR-level gate timings were not read. Statements about current settings come from `process3/setup/conditions.json` and `setup/DEVELOPER.md`, which describe what the owner was asked to set, not what is set today.

---

## 0. The five findings that change the design

1. **The process repository needs no wall-building at all.** It is public, so any session can read it. If the session account is simply not a collaborator on it, GitHub refuses every write. Nothing else is required on a personal account. [doc]
2. **GitHub's native merge queue is not available on a personal-account repository.** It is available on any public repository owned by an organization, including a free one. This is the single feature that would replace the merge train, the layer flow and the direct flow (three merge designs, roughly 3,600 lines at the end, 9,252 deleted on the way) with a ruleset checkbox. Moving both repositories into a free organization is the one account change worth making. [doc]
3. **A ruleset cannot protect file paths in a public repository.** Push rulesets ("restrict file paths") exist only for private and internal repositories on GitHub Team or Enterprise. The public-repository substitute is CODEOWNERS plus "require review from code owners" on the protected branches: a session can still write `.github/**`, `CLAUDE.md` or `.claude/**` on its own branch, but that change cannot reach the integration branch or `main` without the owner's approval. [doc]
4. **GitHub publishes a push-rate recommendation that Process3 did not find**: at most 6 pushes per minute per repository and 1 merged pull request per minute. Process3's note says "GitHub publishes no limit on git pushes"; after its own ceiling was retired the sessions ran at 238 to 422 pushes an hour (4 to 7 a minute). The state branch alone was 1,387 pushes in 19 hours. Removing the state branch removes most of that traffic. [doc] [repo]
5. **Three features shipped in 2026 that Process3 could not have used** and that remove custom code: GitHub Actions *workflow execution protections* (actor and event allowlists per workflow file, generally available 17 Sep 2026, for all public repositories), Cloudflare *Worker Previews* (an isolated copy per branch with its own Durable Object namespace and containers), and Cloudflare *per-Worker API token scopes* (a token that can deploy selected Workers and cannot create or delete any). [doc]

---

# A. GitHub

## 1. Making the process repository unchangeable, and guarding the gate, instructions and settings in the product repository

### 1.1 What a personal-account repository offers

| Feature | Personal account, public repo, Free | Notes |
| --- | --- | --- |
| Collaborator permission levels | One level only: write. No read-only, triage or maintain role. | "Collaborators on a personal repository can pull (read) the contents of the repository and push (write) changes." Collaborators cannot change settings, rulesets, environments, secrets or collaborators. [doc] |
| Rulesets (branch and tag) | Yes | "Rulesets are available in public repositories with GitHub Free and GitHub Free for organizations." Only the owner (admin) can create, edit or delete them. Anyone with read access can view them. [doc] |
| Classic branch protection | Yes | Works, but "Restrict who can push to matching branches" is not offered on personal repositories: "You can enable branch restrictions in public repositories owned by a GitHub Free organization and in all repositories owned by an organization using GitHub Team or GitHub Enterprise Cloud." Prefer rulesets; do not mix (Process3 lost time to a forgotten classic rule on 2 Nov). [doc] [repo] |
| CODEOWNERS and required code-owner review | Yes | "You can define code owners in public repositories with GitHub Free." The file is read from the **base** branch of the pull request. [doc] |
| Push rulesets (restrict file paths, extensions, size) | **No** | "Push rulesets are available for the GitHub Team plan in internal and private repositories." Not for public repositories on any plan. [doc] |
| Organization-level rulesets | No (needs an organization on Team) | "For customers on GitHub Team or GitHub Enterprise plans you can create rulesets in your organization." [doc] |
| Required workflows ("Require workflows to pass before merging") | **No** | The docs' feature flag `repo-rules-required-workflows` lists GitHub Enterprise Cloud and Server only. Organization ruleset, Enterprise plan. [doc] |
| Merge queue | **No** | "Pull request merge queues are available in any public repository owned by an organization, or in private repositories owned by organizations using GitHub Enterprise Cloud." [doc] |
| Auto-merge | Yes | Public repositories on Free. A collaborator can enable and disable it per pull request; only the owner can allow or disallow it for the repository. [doc] |
| Environments, required reviewers, deployment branch rules, environment secrets | Yes | "available in public repositories for all current GitHub plans". Required reviewers and wait timers are public-only on Free, Pro and Team. [doc] |
| Actions workflow execution protections (actor and event rules) | Yes | "All public repositories, and private repositories on GitHub Team or GitHub Enterprise." Configured by repository administrators. [doc] |

Sources: [permission levels for a personal account repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository), [about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), [creating rulesets for repositories in your organization](https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization), [deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [control workflow execution](https://docs.github.com/en/actions/how-tos/administer/control-workflow-execution).

### 1.2 The process repository: read-only to sessions

**Mechanism.** Keep it public. Do not add the session account as a collaborator. Do not include it in the repositories the Claude GitHub App is installed on. Either one alone is enough; together they are two independent walls.

**Configure.** `Settings → Collaborators`: the list is empty. `github.com/settings/installations → Claude → Only select repositories`: the process repository is not selected. Optionally add one ruleset on `~ALL` branches with "restrict updates", "restrict deletions" and "block force pushes" and no bypass actor except the repository admin, so the owner's own tokens cannot rewrite history by accident.

**Cost.** None. Reads are anonymous git or raw fetches.

**Cannot do.** It cannot stop the session account from opening issues, forks or fork pull requests on a public repository. A fork pull request merges nothing. If the noise matters, `Settings → Moderation → Interaction limits` restricts issues and pull requests to collaborators for up to six months at a time.

**Can a session change or bypass it?** No. Without write access there is no push, no branch, no workflow run in the repository's context. This removes case 9 of the review (98 version moves) at the root: nothing in the process repository can change during a tranche unless the owner changes it.

**Consequence for the design.** In Process3 the product pinned the process as a submodule and ran its tool. If Process4's process repository holds only (a) reusable workflows and (b) the short instruction text, the product needs one line that names the process version (section 3.3) and no submodule, no pin-move command and no start check.

### 1.3 The product repository: sessions have write access, so what can still be walled?

A write collaborator on a personal public repository **cannot**: change any setting, ruleset, environment, secret, Actions policy, collaborator list, webhook or deploy key; push to a branch a ruleset closes to them; merge a pull request a ruleset blocks; read a secret's value through the API.

A write collaborator **can**: create and push any unprotected branch with any file content (including workflow files, `CLAUDE.md` and `.claude/settings.json`); open, edit, close and merge pull requests where rules allow; enable auto-merge; approve other people's pull requests (not their own); set commit statuses on any commit; create releases and tags unless a tag ruleset forbids it; run and re-run workflows; manage labels, issues and milestones. [doc]

So the wall on a public personal repository is "this change cannot reach a protected branch without the owner", never "this file cannot be written anywhere".

**Recommended configuration (zero custom code).**

1. `.github/CODEOWNERS` on `main` and on the integration branch:

   ```
   /.github/          @OWNER
   CLAUDE.md          @OWNER
   CLAUDE.local.md    @OWNER
   **/.claude/        @OWNER
   .mcp.json          @OWNER
   ```

   Only the owner is listed. A collaborator can "act as a code owner" if listed, so the session account must not appear. GitHub's own advice is that the CODEOWNERS file must own itself, which `/.github/` covers. [doc]

2. Ruleset "integration" on `refs/heads/tranche` (or whatever the integration branch is called), enforcement Active, bypass list = Repository admin only:
   - Restrict deletions; block force pushes.
   - Require a pull request before merging: required approvals **0**; **Require review from Code Owners: on**; allowed merge methods: merge.
   - Require status checks to pass: `gate`, expected source **GitHub Actions**; "require branches to be up to date" off (section 2).

   The effect wanted: an ordinary job pull request needs no person; a pull request that touches the gate, the instructions or the settings waits for the owner. Whether "0 approvals + code-owner review on" behaves exactly this way on a personal repository is the first thing to test (section 12, item 1). [untested]

3. Ruleset "main" on the default branch: the same, plus "restrict updates" so that only the owner (bypass) can merge into it. If `main` only moves at a release this costs the owner one click per release.

4. Ruleset "all branches" on `~ALL`: block force pushes. Process3 also forbade every branch deletion; I would drop that and turn on `Settings → General → Automatically delete head branches`, which replaces the prune workflow and its 500 lines (`branches.mjs`). The product repository has 1,178 remote branches today against GitHub's recommended ceiling of 5,000. [repo] [doc]

5. Tag ruleset on `v*` (and any release tag pattern): restrict creations, updates and deletions to the owner. Sessions then cannot cut a release tag.

6. `Settings → Actions → General`: workflow permissions "Read repository contents"; "Allow GitHub Actions to create and approve pull requests" off; allow only actions created by GitHub plus the process repository's reusable workflows; require actions pinned to a full-length commit SHA.

**Cost.** Free. Latency: none for ordinary pull requests; the owner's review time for the guarded paths.

**Cannot do.**
- It cannot stop a session editing `.claude/settings.json` or `CLAUDE.md` on its own job branch. A replacement session started from that branch would load the edited copy. The GitHub-side answer is "always start sessions from the protected branch tip"; anything stronger is a Claude Code lever (managed settings, the cloud environment), not a GitHub one.
- It cannot stop a pull request from running a modified copy of a `pull_request` workflow on itself. The modified run can turn that pull request's own `gate` green, but the pull request touches `.github/` and so cannot merge without the owner.
- It does not stop deliberate forgery. "Any person or integration with write permissions to a repository can set the state of any status check in the repository." Pinning the expected source to GitHub Actions closes the commit-status route; a workflow pushed on some other branch that requests `checks: write` and reports a check named `gate` on another commit is still conceivable. The Foundations call this "a known limit, not code" (threat model: mistakes, not attacks). The only native feature that closes it fully is Enterprise required workflows. [doc] [inference]

**Stronger options without Enterprise, both [untested]:**

- *Workflow execution protections* (`Settings → Actions → Policies`). An actor rule scoped to specific workflow paths says who may run those workflows: "you can grant a contributor write access without granting them the ability to execute workflows." Certain use: an owner-only policy on the release, production-deploy and watchdog workflow files, so a session cannot dispatch them at all. Possible use: an allowlist so that only named workflow files run for the session account, which would make a newly added workflow file inert. Whether policies can express "every workflow file except these" is not stated in the docs. Source: [about Actions policies](https://docs.github.com/en/actions/concepts/about-actions-policies), [changelog 17 Sep 2026](https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available/).
- *The credential's workflow permission.* GitHub refuses a push that creates or changes a file under `.github/workflows/` when the token lacks the `workflow` scope (OAuth) or the Workflows permission (GitHub App). If the Claude GitHub connection can be granted without it, workflow files become unwritable by sessions on every branch. That is a property of Claude's GitHub App, for the other analyst to check.

### 1.4 What a free organization would change

Create a free organization owned by the owner's account; transfer both repositories; add the session account to the product repository as an outside collaborator with the Write role (not as an organization owner).

| Gains on the free tier | Why it matters |
| --- | --- |
| **Merge queue** on public repositories | Replaces the custom merge machinery (section 2). The one material gain. |
| Repository roles (Read, Triage, Write, Maintain, Admin) | The session account can be given explicit Read on the process repository and Write on the product, instead of "not a collaborator" versus "collaborator". |
| Teams, and the ruleset rule "required reviewers when a pull request changes certain files" | File-pattern review requirements live in the ruleset (owner-only) instead of in a CODEOWNERS file inside the repository. The docs say this rule "is not available on user-owned repositories as they do not contain teams." |
| Classic "restrict who can push", ruleset bypass by team | Finer push control on named branches. |
| Organization-level Actions policies and secrets | One place for both repositories. |

| Still not available on the free tier | Needs |
| --- | --- |
| Organization-wide rulesets | Team, list price about $4 per user per month (not re-verified today) |
| Push rulesets restricting file paths | Team, and the repository must be private or internal, which forfeits free Actions minutes, the merge queue (private needs Enterprise Cloud) and required reviewers on environments (public-only below Enterprise). Not worth it. |
| Required workflows | Enterprise Cloud, list price about $21 per user per month (not re-verified today) |

Cost of moving: the Claude GitHub App and the Cloudflare GitHub App must be installed on the organization; rulesets, environments and secrets should be re-checked after the transfer; old URLs redirect. Standard concurrency stays at 20 jobs on Free (40 on Pro, 60 on Team). [doc]

**Recommendation.** Move to a free organization for the merge queue. Do not buy Team or Enterprise for this: the remaining gap (deliberate forgery of a check) is outside the stated threat model.

---

## 2. Merging many job pull requests without a custom merge train

### 2.1 What Process3's tool did, and what was measured

"The tool brings the branch up to the tranche, runs the gate on the merged result, and merges a green, current tip" (GAT-8). Three designs in five days. The re-gate on the merged result caught 3 real conflicts in 146 merges (2.1%). The serial train took the median wait from finished job to merge from 8 minutes to 289. [repo: review]

Two facts about GitHub's own behaviour matter here:

- A workflow triggered by `pull_request` already checks out GitHub's test merge of the head into the base (`refs/pull/N/merge`). The Process3 gate relied on this ("The checkout is GitHub's merge of the head into the base: the suite runs on the merged result"). So the per-pull-request gate is already a gate on the merged result **as of the moment the run started**. What it does not cover is the base moving between that run and the merge. [repo] [doc]
- GitHub recommends at most 1 merged pull request per minute per repository, and suggests turning off "require branches to be up to date" when a merge queue is used. [doc: [repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits)]

### 2.2 Option A (organization): native merge queue. Exact semantics, zero custom code

**Mechanism.** Ruleset rule "Require merge queue" on the integration branch, together with the required check `gate`. A session runs `gh pr merge --auto --merge <n>` once. GitHub waits for the pull-request checks, then places the pull request in the queue, builds a temporary branch `gh-readonly-queue/<base>/pr-<n>-<sha>` containing the base plus everything ahead of it in the queue plus this pull request, fires the `merge_group` event, and merges when the required check passes on that commit. A failing or conflicting entry is removed and the entries behind it are rebuilt. [doc]

**Configure.** Repository-level ruleset (the rule "is not available for rulesets created at the organization level"), targeting the branch by name (the docs warn about wildcard patterns under classic protection):

| Setting | Suggested start | Meaning |
| --- | --- | --- |
| Merge method | Merge | As Process3 used. |
| Build concurrency | 5 | How many merge groups are being checked at once (range 1 to 100). |
| Minimum / maximum group size | 1 / 10 | Up to ten pull requests merged together on one check run. |
| Wait time to meet minimum group size | 1 minute | Irrelevant when the minimum is 1. |
| Require all queue entries to pass required checks | Off | Only the commit at the head of the group must pass, so a group of ten costs one gate run. On, each entry is checked. |
| Status check timeout | 20 minutes | An unreported check counts as failed after this. |

The gate workflow must also trigger on `merge_group`, or the queue waits for ever: "You must use the `merge_group` event to trigger your GitHub Actions workflow." In the workflow: `on: { pull_request: {}, merge_group: { types: [checks_requested] } }`. [doc]

**Cost.** Free on a public organization repository. Latency: one extra gate run per group (about ten minutes if the gate is ten minutes) after the pull-request run. CI cost per pull request is roughly 1 + 1/group size gate runs. Throughput at the suggested settings with a ten-minute gate: 5 groups in flight × up to 10 pull requests per 10 minutes, far above 100 a day; the practical ceiling is the 20-job concurrency limit on Free and GitHub's 1-merge-a-minute recommendation, which grouping respects better than serial merging. [doc] [inference]

**Cannot do.** It does not order merges by layer or by module dependency; order is arrival order. It does not bisect a failed group beyond removing the failing entry and retrying the rest. It cannot be viewed or emptied from `gh` ("You cannot use GitHub CLI to view a merge queue" or remove an entry), only on the website or through GraphQL. It is unavailable on a personal-account repository.

**Can a session change or bypass it?** It cannot change the rule or its numbers. It can add its own pull requests to the queue (that is the intent) and cannot merge around the queue. Whether a session's `gh pr merge --auto` is permitted is a Claude-side question: Process3's deny list removed `gh pr merge` and all of `gh` from every session.

### 2.3 Option B (personal account, today): loose required check plus auto-merge plus a post-merge run

**Mechanism.** Required check `gate` with "require branches to be up to date" **off**; `Settings → General → Allow auto-merge` on; each job runs `gh pr merge --auto --merge` when it marks its pull request ready. GitHub merges the moment the check is green. A second workflow on `push` to the integration branch runs the wider suite on the real merged tip.

**What this gives.** "Gate on the merged result as of the gate run", then merge, with no queue and no code. Textual conflicts are blocked by GitHub itself. Semantic conflicts that arise between the gate run and the merge (measured at about 2% under Process3) show up as a red run on the integration branch within one gate time, attributed to a commit, and are fixed forward or reverted by a session.

**Cost.** Free; no added latency. The integration branch can be red for a short time, which the Foundations' "done means merged" tolerates only if a red integration tip stops the next release, which a required check on the integration-to-main pull request does natively.

**Cannot do.** It does not guarantee the integration tip is green at every commit.

### 2.4 Option C: strict checks plus auto-merge. Not recommended

"Require branches to be up to date" gives the exact guarantee, but every merge makes every other open pull request out of date, somebody must press "update branch" (auto-merge does not), and each update re-runs the gate. With twenty ready pull requests that is a serial train again with quadratic CI, which is the 289-minute queue Process3 built by hand. GitHub's own text: the merge queue "provides the same benefits as the Require branches to be up to date before merging branch protection, but does not require a pull request author to update their pull request branch." [doc]

### 2.5 Option D: batch integration branches (the owner's layer-branch design, natively)

Job pull requests target `layer/N` with a light required check and auto-merge; one pull request `layer/N → tranche` carries the full required check. This is the design that merged layer 7 in 1.5 hours. Native pieces only: branches, a ruleset on `layer/*`, auto-merge. It gates the merged result once per batch instead of once per pull request. The cost is that a red batch must be untangled by a session. It is a good fallback on a personal account if Option B's brief red windows are unacceptable.

### 2.6 Recommendation

Organization: Option A. Personal account: Option B, with Option D held in reserve. In every case the custom code is zero lines and the rule is the owner's.

---

## 3. CI as the only gate

### 3.1 Required status checks: the pitfalls that matter

| Situation | What GitHub does | Design rule |
| --- | --- | --- |
| The whole workflow is skipped by a `paths`/`branches` filter or a `[skip ci]` commit message | The required check stays "Pending" and blocks the merge for ever | Never put a path filter on the workflow that owns a required check. Decide inside the workflow. |
| A job is skipped by an `if:` | The job reports **Success** | Useful for "nothing to test", dangerous for anything else. |
| A job `needs` a failed job | It is skipped and "may not block merging" | The required job must be an aggregator with `if: always()` that reads `needs.*.result` and fails unless every needed job succeeded or was deliberately skipped. |
| The check is reported by a workflow started with `workflow_dispatch` or `workflow_run` | Not evaluated for the pull request | Only `push`, `pull_request`, `pull_request_review`, `pull_request_target`, `deployment`, `deployment_status` count; `merge_group` for queues. |
| Check passed on an older commit | Does not count; must pass on the latest head SHA | No custom "stale green" check is needed for the head. |
| A commit status and a check run share the name | Both must pass | Pin the expected source to GitHub Actions. |

Source: [troubleshooting required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks). [doc]

Process3 knew the second row ("a job skipped by an `if` would report a skipped gate, which GitHub counts as passing") and built tool code around it. The aggregator pattern is the native answer.

### 3.2 The shape of a ten-minute gate

Today's gate is one job with a 90-minute timeout; plane and control-plane gates took 40 to 42 minutes; the review reports the median attempt rising from 12 to 42–65 minutes. Fixed overhead per run includes installing ten lock files, building every bundle, and about seventy lines of Chromium install-and-fallback. [repo]

```yaml
# In the process repository: .github/workflows/gate.yml  (reusable; sessions cannot write here)
on:
  workflow_call: {}
permissions: { contents: read }
jobs:
  plan:                      # under one minute: which modules changed, how many shards
    runs-on: ubuntu-24.04
    outputs: { shards: ${{ steps.p.outputs.shards }}, any: ${{ steps.p.outputs.any }} }
    steps: [ checkout (fetch-depth 0, blob:none), id p: node .github/scripts/plan.mjs ]
  test:
    needs: plan
    if: needs.plan.outputs.any == 'true'
    strategy: { fail-fast: false, matrix: { shard: ${{ fromJson(needs.plan.outputs.shards) }} } }
    runs-on: ubuntu-24.04
    container: mcr.microsoft.com/playwright:v1.56.1-noble     # browser already present
    timeout-minutes: 15
    steps: [ checkout, setup-node with cache: npm, npm ci, node --test --test-shard=${{ matrix.shard }} ... ]
  gate:                      # the one required check
    needs: [plan, test]
    if: always()
    runs-on: ubuntu-24.04
    steps: [ fail unless plan succeeded and test is success or skipped-because-nothing-changed ]
```

Native pieces and their limits [doc]:

- **Matrix sharding.** Node's own runner takes `--test-shard=i/n`. A matrix may create up to 256 jobs per run.
- **Concurrency.** `concurrency: { group: gate-${{ github.ref }}, cancel-in-progress: true }` cancels a superseded run. A concurrency group can now also queue (`queue: max`, up to 100 runs), which serialises deploys without code.
- **Caching.** `actions/setup-node` with `cache: npm`; 10 GB of cache per repository, entries evicted after 7 days unused. Pull-request runs can read caches from the base branch.
- **Runners.** Standard GitHub-hosted runners are "free and unlimited on public repositories": Linux, 4 vCPU, 16 GB. Concurrency: 20 jobs on Free, 40 on Pro, 60 on Team. Job limit 6 hours; 500 workflow runs queued per 10 seconds.
- **Runner image.** Pin `ubuntu-24.04`. The gate's comments record that `ubuntu-latest` moved to Ubuntu 26.04, on which playwright-core 1.56.1 would not install; the fallback code exists only because of the floating label.
- **Machine-readable findings.** `::error file=...,line=...::message` annotations and `$GITHUB_STEP_SUMMARY` give file-and-line findings on the pull request with no posting job and no write token. The two-job "gate then post" split in Process3 existed to post a comment row; with annotations the gate needs `contents: read` only.

Custom code still needed: the `plan` step (which module suites does this diff touch), about 30 lines reading `build/modules.json`. The product already has a 22-line `.github/scripts/module-tests.mjs` that runs every module's tests from the same file.

Arithmetic for load: 100 pull requests a day × (1 pull-request run + about 0.2 queue runs) × (1 plan + 4 shards + 1 aggregator) is about 700 jobs a day, around 30 an hour on average, well inside 20 concurrent jobs if a shard takes ten minutes. [inference]

### 3.3 Where the gate's definition lives

| Option | Who can change the gate's logic | Availability | Custom code |
| --- | --- | --- | --- |
| **Reusable workflow in the process repository, called by SHA** (`uses: OWNER/process/.github/workflows/gate.yml@<sha>`) from a ten-line caller in the product | Logic: owner only. The caller file is in the product, so a session can edit it in a pull request, but that pull request then needs the owner (CODEOWNERS). | Any plan. A public reusable workflow can be called from any repository. Up to 10 nesting levels, 50 unique reusable workflows per file. | The caller stub. This one line is also the whole "pin": the owner changes the SHA between tranches. |
| `pull_request_target` workflow on the default branch | Owner only: since 8 Dec 2025 "the workflow file and checkout commit will always be taken from the repository's default branch". | Any plan, **but** from 2 Dec 2026 GitHub blocks `pull_request_target` by default in public repositories unless an Actions event policy allows it (workflow-file targeting is supported). It runs with the base repository's context, so it must hold `contents: read`, reference no secret and write no cache. | The workflow itself. |
| Organization ruleset "Require workflows to pass before merging" | Organization owner only; the workflow is fetched from a named repository and ref, and filters in it are ignored | **Enterprise Cloud only** | None |

Sources: [reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations), [changelog 7 Nov 2025](https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/), [changelog 2 Nov 2026](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2), [available rules: required workflows](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets). [doc]

**Recommendation.** The first row. It is the smallest thing that works on every plan, and it reduces "pin and version distribution" to one line the owner edits.

**A limit to state plainly.** Whatever runs the tests, the tests themselves and the scripts they call live in the product and are session-writable. A session can weaken a test. No path wall can prevent that without blocking ordinary work. The measured answer in Process3 was the review trigger on deleted or weakened tests (5 acted findings on its first day); see the table in section 11.

---

## 4. Rate limits, abuse detection, and what probably suspended the account

### 4.1 The published limits [doc]

| Limit | Value | Source |
| --- | --- | --- |
| Primary REST, per user (all tokens and apps acting for that user share it) | 5,000 requests an hour | [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) |
| GitHub App installation token | 5,000 an hour, scaling to at most 12,500 | same |
| `GITHUB_TOKEN` inside Actions | 1,000 an hour per repository | same |
| Concurrent requests | 100, shared by REST and GraphQL | same |
| REST "points" | 900 a minute (read 1 point, write 5) | same |
| Content creation | "no more than 80 content-generating requests per minute and no more than 500 content-generating requests per hour"; includes actions in the web interface | same |
| CPU time | 90 seconds per 60 seconds | same |
| **Push rate** | "The recommended maximum limit is 6 pushes per minute per repository." | [repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits) |
| **Merge rate** | "1 merged pull request per minute" | same |
| Git reads | 15 operations a second per repository | same |
| Branches | 5,000 recommended maximum | same |
| Repository size | 10 GB on disk recommended maximum | same |

"These secondary rate limits are subject to change without notice. You may also encounter a secondary rate limit for undisclosed reasons." "Continuing to make requests while you are rate limited may result in the banning of your integration."

### 4.2 GitHub's documented guidance [doc]

From [best practices for using the REST API](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api): avoid polling, use webhooks; make requests serially, not concurrently; "wait at least one second between each" mutating request; honour `retry-after`, else wait for `x-ratelimit-reset`, else at least a minute, then back off exponentially; use conditional requests (a `304` does not count against the primary limit).

### 4.3 Terms that apply to the session account [doc]

- "A machine account is an Account set up by an individual human who accepts the Terms on behalf of the Account, provides a valid email address, and is responsible for its actions. A machine account is used exclusively for performing automated tasks... You may maintain no more than one free machine account in addition to your free Personal Account." ([Terms of Service, B.3](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)). So the owner plus one session account is permitted. A third free account (the attempted "account switch" of 7 Nov) would not be.
- "Abuse or excessively frequent requests to GitHub via the API may result in the temporary or permanent suspension of your Account's access to the API... We will make a reasonable attempt to warn you via email prior to suspension." (Terms, H). Worth checking the session account's mailbox for that warning.
- The Acceptable Use Policies forbid "automated excessive bulk activity" and "using our servers for any form of excessive automated bulk activity, to place undue burden on our servers through automated means" ([section 4](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)).
- GitHub's recommendation for long-lived automation is a GitHub App, not a user token: "If you want to access GitHub resources on behalf of a user or in an organization, or you anticipate a long-lived integration, we recommend building a GitHub App." Apps "are not tied to a user account", use short-lived tokens, and have scaling rate limits ([deciding when to build a GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app)). Whether Claude Code cloud sessions can act as an App installation instead of as a user is a Claude-side question.

### 4.4 What most plausibly triggered the suspension [inference]

The cause was never established. Ranked by fit with the record:

1. **A young account doing nothing but high-volume automated writes.** The pattern of 6 Nov (1,387 pushes to one branch in 19 hours, 143 to 173 an hour at peak, plus pull requests, comments and receipts from up to 24 sessions on one login) matches spam and bulk-activity heuristics that are not published. "Hidden pull requests" appearing afterwards is the usual sign of an account flagged by that system, not of an API rate limit. Primary API usage never passed about 12%.
2. **Content creation.** Every job posted a receipt comment, every gate posted a row, the tool wrote comments for triage and notices. 500 content-creating requests an hour is easy to approach with 20 jobs; nobody counted them before 6 Nov.
3. **Push rate.** The peak hours were under the 6-a-minute recommendation on average but bursty; after the ceiling was removed on 7 Nov the rate went above it and nothing happened, so this is weaker evidence.
4. **One login used by many concurrent agents.** Not a stated limit, but it multiplies every signal above.

### 4.5 Staying safe with no pacing code

- Delete the state branch. It was the majority of pushes and its usage records became "more than half of the state-branch commits".
- One push per turn per job; one pull request per module; no comment-as-record. Records go in the check run's own summary and annotations, which are not content creation by the session account.
- Let GitHub's queue or auto-merge do the merging (fewer API calls than any polling tool, and batching keeps merges near one a minute).
- No polling loops in sessions; pull-request event subscriptions and `workflow_run` do the waking.
- Make the session account recognisably a machine account (profile says so and names the owner, verified email, two-factor authentication), and ask GitHub Support, on the reinstatement thread, what the trigger was and whether the account can be marked as an approved automation account. This is the only way to learn the cause.

**Can a session change or bypass it?** Nothing here is code, so there is nothing to change. The residual risk is behavioural (a session that loops on pushes), which the Actions watchdog in section 5 would show.

---

## 5. Coordination state without a state branch

### 5.1 Where each kind of state can live natively

| State Process3 kept | Native home | Read with | Writes by sessions |
| --- | --- | --- | --- |
| "A job exists for module X, on branch Y, in state Z" | The pull request itself: branch name, draft or ready, labels (`blocked`, `needs-owner`), assignee | `gh pr list --json number,headRefName,isDraft,labels,statusCheckRollup,mergeStateStatus` | One `gh pr create`, occasional `gh pr edit --add-label` |
| START text, coordinator address, receipt | Pull request body (START) and the check run's summary (what ran, exit codes, SHA) | `gh pr view`, `gh run view` | None for the receipt: CI writes its own |
| Gate result and its findings | Check run on the head SHA, with annotations | `gh pr checks` | None |
| Work found elsewhere, flaw reports, walk findings | Issues with labels; sub-issues for a round | `gh issue list --label` | One issue per finding batch |
| Rounds and layers | Milestones or a Project (user- or organization-owned Projects work with public repositories; Projects need GraphQL and the `project` scope) | `gh project item-list` | Optional |
| What is deployed where | Environments and the Deployments list, written automatically when a job names `environment:` | `gh api repos/{o}/{r}/deployments?environment=dev` | None |
| Heartbeat, "who is alive" | Not kept. Liveness is "has this pull request moved"; see the watchdog below | — | — |
| Module requirement marks | Files in the product, as now | git | In the job's own pull request |

Two pitfalls [doc]:
- Closing keywords ("Closes #12") close an issue only when the pull request merges into the **default** branch. With an integration branch that is not the default, issues do not auto-close.
- A `GITHUB_TOKEN` write does not trigger other workflows (except `workflow_dispatch` and `repository_dispatch`); a workflow that labels or comments will not wake another workflow.

### 5.2 Actions as scheduler and watchdog

| Trigger | Runs from | Limits |
| --- | --- | --- |
| `schedule` | Default branch only | Shortest interval 5 minutes; "can be delayed during periods of high loads... some queued jobs may be dropped"; avoid the top of the hour; disabled after 60 days without repository activity in a public repository |
| `workflow_run` | Default branch copy of the workflow | Fires on completion of a named workflow; at most three chained levels; has secrets and a write token even when the first workflow had neither |
| `repository_dispatch`, `workflow_dispatch` | Default branch | Needs a token with write access to call |
| `push`, `pull_request`, `merge_group` | The pushed ref's own copy | The normal case |

[doc: [events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)]

Because `schedule` and `workflow_run` run only the default branch's copy, a watchdog on `main` cannot be altered by a session if `main` is owner-only. That is a wall Process3 worked around (it pushed specially named branches to trigger a deploy because dispatch needs the file on `main`); for a watchdog it is exactly what is wanted.

**A watchdog in about 15 lines of YAML on `main`**, every 30 minutes at an odd minute: list open ready pull requests whose checks are green but which have not merged for N minutes, pull requests with no push for M hours, and whether the integration tip is red; write the list to the run summary; **exit non-zero when anything is listed**. GitHub then notifies the owner of the failed run through his own notification settings (email or web; "Notifications for scheduled workflows are sent to the user who initially created the workflow", so the owner must be the one who commits it). This replaces the sweep's detection half (495 lines in `sweep.mjs` plus the idle alarm that "miscounted for four days"). The waking half, starting or messaging a Claude session, is a Claude-side act; Cloudflare's documentation notes Claude Code routines accept an API trigger, so one `curl` step with a secret held in an owner-only environment could do it, which the other analyst should confirm.

**Cost.** Free. Latency up to the schedule interval plus GitHub's delay.

**Cannot do.** It cannot see inside a session, and a 5-minute floor makes it a backstop, not a scheduler.

**Can a session change or bypass it?** Not the copy on `main`. A session could push a pull request that makes itself look alive; that is true of any liveness signal.

---

## 6. Environments, release approval and secret scoping

**Mechanism.** GitHub environments. A job that names `environment: production` does not start, and cannot read that environment's secrets, until a required reviewer approves. [doc]

**Configure.**

| Environment | Deployment branches and tags | Required reviewers | Secrets | Other |
| --- | --- | --- | --- | --- |
| `dev` | Selected: the integration branch only | None | A Cloudflare token scoped to development Workers only (section 8.6) | Because pull-request runs are matched against `refs/pull/N/merge` since Dec 2025, a pull-request workflow does **not** match a branch-name rule and cannot reach these secrets |
| `production` (and `release` for signing) | Selected: `main` and `v*` tags | The owner; up to six reviewers allowed | Production Cloudflare token, signing seed | Turn **off** "Allow administrators to bypass configured protection rules" if the owner wants the wall to hold against his own automation; wait timer optional (1 to 43,200 minutes) |

Keep **no repository-level secrets**. A repository secret is readable by any workflow on any branch a write collaborator pushes. The product already follows this shape: `release-sign.yml` runs in environment `release` "whose secret `BIO_RELEASE_SEED` is the release key and whose required reviewer is Bob", and `deploy-test.yml` runs in `deploy-test` with a development token and no reviewer. [repo]

Add the ruleset rule "Require deployments to succeed before merging" on `main` naming the `dev` environment, and the integration-to-main pull request cannot merge until a development deployment (with its walk as a later step of the same job) has succeeded. That encodes "a public release is a development release the walkers have passed" with no code. [doc]

**Cost.** Free on public repositories. An approval can wait up to 30 days.

**Cannot do.**
- It protects the secret, not the code that uses it. Once the owner approves a run, whatever that commit's workflow does with the secret happens. Restricting the environment to `main` and tags, which only the owner can move, is what makes the approved code trustworthy.
- "Prevent self-review" is meaningless here because the reviewer and the initiator are different accounts anyway.
- Sessions today also hold a Cloudflare token directly in the Claude cloud environment (`process/config.json` lists `CLOUDFLARE_API_TOKEN` among eleven environment variables). GitHub environments do nothing about that copy. [repo]

**Can a session change or bypass it?** It cannot edit environments or read secrets. It could author a workflow that references `environment: dev` on a branch; the branch rule refuses it. It can trigger a `production` job only by getting a commit onto `main` or a protected tag, which the rulesets forbid.

---

# B. Cloudflare

## 7. What the product uses today, and how deploy and walk work [repo]

**The product.** "The civic accountability record, as software a community group runs for itself. A group's copy lives in its own Cloudflare account." It is therefore installed, not hosted: an installer Worker (`newgroup`) puts a signed release into a group's own account. Thirteen `wrangler.jsonc` files, all pinned to one account id:

| Worker | Bindings and features |
| --- | --- |
| `bio-plane` (the data plane) | SQLite-backed Durable Object `Store`; R2 buckets `bio-captures` and `bio-published`; service bindings to each fleet member and to itself; Browser Rendering binding; `nodejs_compat`; compatibility date 2026-07-01 |
| `pdf-worker`, `ocr-worker` (wasm), `sheet-worker`, `agent-worker` | Fleet members reached only by service binding |
| `agent-runner`, `file-scanner`, `reader-container` | Durable Object plus **Cloudflare Containers**, images named by digest on Docker Hub, `workers_dev: false`, `preview_urls: false` |
| `newgroup` | The installer; deliberately no bindings |
| `site` (`civicsmith-site`) | civicsmith.org, static; observability off |
| `stewards`, `ai-issuer` | Durable Object, R2, `send_email`, daily Cron Triggers |

No D1, KV, Queues or Workflows. `process/config.json` records `"cloudflare_plan": "paid"`.

**Deploy today.** Not `wrangler deploy`. `bio-plane/scripts/deploy.mjs` and `deploy-fleet.mjs` call the REST API, PUT the script, then read it back and compare hashes ("believe only the bytes"). A development deployment is a whole fresh copy named `p3dev-<slug>` with its own buckets and member Workers `<member>-<slug>`; a guard refuses any name without the prefix. Three routes exist:

1. A session (BOB) with `CLOUDFLARE_API_TOKEN` in its cloud environment runs the nine deploy commands in `process/config.json` through `p3 deploy` (573 lines of tool).
2. `deploy-test.yml` in GitHub environment `deploy-test`, started by dispatch or by pushing a branch named `deploy-test/<copy>/deploy`.
3. Releases: `container-images.yml` builds images on `dist/cut-*` branches; `release-sign.yml` signs in environment `release` after the owner approves; `process-dev-release.yml` cuts a draft GitHub release in environment `p3dev-release`.

The wall between development and production inside the one Cloudflare account is prose in `CLAUDE.md` (a paragraph listing which Workers may never be touched) plus the name guard in the script. Nothing at Cloudflare enforces it.

**Walk today.** `bio-plane/src/journey-check` is a Playwright walker (playwright-core 1.56.1) with a local arm and a live arm. `p3dev-walk-setup.mjs` claims a fresh copy as founder, invites a member, writes credentials to a file outside the repository, then runs `npm run journey -- --live <address>`. Reports land in `out/live/report.json`. Earlier walks, with screenshots, are committed under `build/plan/walk-*`; `build/` is 13,017 files and 431 MB of the tree. The live walk of 8 Nov found 1,691 real page faults, "the largest finder of product defects by far".

## 8. Native Cloudflare features that could serve the process

### 8.1 Worker Previews: an isolated copy per branch [doc]

"Previews give each branch an isolated, production-like environment under the same Worker." `npx wrangler preview` (Wrangler 4.135 or later) creates or updates the preview for the current branch at `<preview-name>-<worker>.<subdomain>.workers.dev`, with an immutable deployment URL per deploy. Previews do not inherit production settings; a `previews` block in the Wrangler file defines them.

| Resource | In a preview |
| --- | --- |
| Durable Objects | "Automatically provisions a new Durable Object namespace and storage for each Preview." |
| Containers | A new container app and instances per preview; the configuration must be repeated under `previews.containers` |
| R2, KV, D1, Queues producers | Shared unless the preview is bound to a different resource |
| **Service bindings** | "the Preview of Worker A can only bind to the production Worker B" |
| Cron Triggers, routes, Queue consumers | Target production only; not run for previews |

Limits: 100 previews per Worker on Free, 500 on Paid; 100 deployments per preview; the oldest are deleted automatically. Sources: [Previews](https://developers.cloudflare.com/workers/previews/), [resources and isolation](https://developers.cloudflare.com/workers/previews/resources/).

**Fit with this product.** Good for a change inside one Worker (the plane, 163 of 220 modules live under `bio-plane`). Poor for a change that spans the plane and a fleet member, because the preview plane would call the non-preview member. The product's own install path (the REST deploy, the installer) is not exercised by `wrangler preview` at all. So: previews for fast per-pull-request or per-merge walking of plane changes; the existing fresh-install route kept for the release tier, which is where the Foundations already put "an install-from-scratch test and an upgrade-from-previous-release test". [inference]

**Custom code.** A `previews` block and one command. **Who can change it:** the block is in the repository; the preview limit, Access policy and token are in the Cloudflare account.

### 8.2 Versions, gradual deployments and rollback [doc]

`wrangler versions upload` then `wrangler versions deploy` splits traffic by percentage; `wrangler rollback` returns to any of the last 100 versions. Limits that matter here: version URLs "are not generated for Workers that implement Durable Objects, including Containers"; only one version of a given Durable Object runs at a time and a migration must go through `wrangler deploy`; "Resources connected to your Worker will not be changed during a rollback", so data written by the newer code stays; a rollback is refused across a Durable Object class migration. Useful for the hosted Workers (`site`, `newgroup`, `stewards`); of limited use for the plane. Sources: [gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/), [rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

### 8.3 Workers Builds: a deploy path with no token in a session or in GitHub [doc]

Connect a Worker to the GitHub repository through the Cloudflare Workers & Pages GitHub App (installed by the account or organization owner). A push to the production branch runs the build command then the deploy command (`npx wrangler deploy` by default); a push to any other branch can run the preview command (`npx wrangler preview`). Cloudflare posts a pull-request comment with the preview URL and a GitHub check run per Worker. For a monorepo, each Worker is connected separately with its own root directory and optional watch paths.

| | Free | Paid |
| --- | --- | --- |
| Build minutes | 3,000 a month | 6,000 a month, then $0.005 a minute |
| Concurrent builds | 1 | 6 |
| Build timeout | 20 minutes | 20 minutes |

Sources: [Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [limits and pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/), [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/), [configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

**Cannot do, and one caution.**
- The build token is created and held by Cloudflare, but it is a user token with account-wide "Workers Scripts (edit), Workers KV Storage (edit), Workers R2 Storage (edit)" and it is present in the build environment. The build runs the repository's own scripts, so code on a session's branch could read it during a preview build. "No token in a session" is true; "no session-written code ever sees a token" is not, unless preview builds are off or the token is narrowed (section 8.6). [doc] [inference]
- It does not know about the product's instance-per-copy naming or its read-back verification.
- Six concurrent builds across thirteen Workers and many branches would queue; watch paths help.
- Whether the Workers Builds check run can be used as a required status check, and whether it creates GitHub Deployment records that fire `deployment_status`, is not stated in the docs I read. [untested]

**Recommended use.** Production deploys of the hosted Workers (`civicsmith-site`, `newgroup`, `stewards`, `ai-issuer`) from `main`: the owner merging to `main` is the approval, and no production token exists anywhere but inside Cloudflare. For development, a GitHub Actions job in environment `dev` is simpler to reason about than preview builds from arbitrary branches.

### 8.4 Observability as evidence [doc]

- **Workers Logs.** `observability.enabled` in the Wrangler file. Free: 200,000 log events a day, 3 days kept. Paid: 20 million a month included, then $0.60 a million, 7 days kept; pricing moves to "Cloudflare Observability pricing" on 1 Dec 2026. Structured JSON logs are indexed by field. Previews have their own independent observability block. ([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/))
- **Workers Issues.** "When a Worker throws an uncaught exception, fails an invocation, returns a 5xx response, or logs an error, Issues records the failure as an occurrence. It groups related occurrences from the same Worker into one issue." Enabled by `observability.issues.enabled` (Wrangler 4.134 or later) or in the dashboard. **Automations** send an issue to a destination when an occurrence threshold is crossed or an issue recurs: a generic webhook, a chat service, an incident tool, or a coding agent, where "Claude Code, Cursor, and Devin are supported prebuilt coding-agent integrations" (Claude Code needs a routine id and an authorization token). ([Issues](https://developers.cloudflare.com/workers/observability/issues/), [automations](https://developers.cloudflare.com/workers/observability/issues/automations/))
- `wrangler tail`, Tail Workers, Logpush and OpenTelemetry export exist for live or exported streams.

**Why this matters to the process.** After a walk, "which server-side errors happened during the walk window, grouped" is one query or one page, with stack traces, produced by the platform and not by a session's report. It is the direct form of "run the product and let it show what matters", and an automation can hand a recurring failure to a Claude Code routine with no sweep.

**Cannot do.** The product deploys by a raw REST upload, and its own deploy script notes that "a script PUT that sends none turns [logs] off"; Issues would need the same treatment, a small product change. `site` and `ai-issuer` deliberately keep observability off. Seven days of retention is not an archive.

**Who can change it.** Flags in the Wrangler file are session-writable; automations and destinations live in the Cloudflare account.

### 8.5 A coordination or heartbeat service on Cloudflare: possible, and not wise

Cron Triggers, Durable Objects, D1, KV, Queues and Workflows could hold a ledger, a lease or a heartbeat outside every session-writable repository. I recommend against building one:

- It is a second custom tool with its own code, deploys, schema and failure modes, which is precisely the thing Process4 exists to avoid. Process3's state branch became a subsystem (692 lines of `state.mjs`, a usage ledger, pending-write replay) starting from "who is where".
- Sessions hold a Cloudflare token; unless the service sits in a different account it is not outside their reach.
- Every job listed for it has a native home that needs no code: pull requests and check runs for state (section 5), an Actions schedule for the watchdog, Workers Issues automations for product failures.

The only Cloudflare-side "coordination" worth having is configuration, not code: Issues automations and Access policies.

### 8.6 API token scoping: development but not production [doc]

This changed in 2026. Workers roles can now be granted to API tokens **per Worker**:

| Role | Can |
| --- | --- |
| Metadata Read-Only | View settings, logs, traces, metrics; run `wrangler tail` |
| Content Read-Only | Also read script source |
| Editor | "read, update, deploy, and rename existing Workers, including script content, settings, schedules, versions, deployments... **Cannot create or delete Workers.**" |
| Admin | Create and delete when granted at the product scope |

"Per-Worker roles apply only to the Workers you select. You cannot grant per-Worker access to a Worker that does not exist yet. Creating new Workers requires product-level Admin access." Routes and custom domains need a separate zone permission. Source: [Workers roles and permissions](https://developers.cloudflare.com/workers/authorization/workers/).

**Design.** One token for sessions and the `dev` environment: Metadata Read-Only on all Workers (so sessions can read logs everywhere) plus Editor on a fixed set of development Workers. No access to `civicsmith-site` or `newgroup`. A second token, Editor on the production Workers plus the zone's Workers Routes, held only in the GitHub `production` environment or not at all if Workers Builds deploys production.

**The catch.** The product's development model creates a brand-new `p3dev-<slug>` Worker set for every copy, which needs product-level Admin, and Admin at product scope can also delete or overwrite `civicsmith-site`. Two ways out, both modest: (a) keep a fixed pool of pre-created development copies (`p3dev-1` to `p3dev-N`) and grant Editor on those; or (b) put development in a separate Cloudflare account, which is the only complete wall, since R2 buckets, Durable Object namespaces, DNS and email routing are also account-level. The product already knows a second "rehearsal account" (`CS_TEST_CF_ACCOUNT_ID`). I recommend (b) with (a) inside it: it turns a paragraph of prose in `CLAUDE.md` and a name guard into something Cloudflare enforces. [inference]

**Can a session change or bypass it?** Not with a token that has no token-management permission. Token scopes are set in the Cloudflare dashboard by the owner.

### 8.7 Cloudflare Access for development deployments [doc]

One switch protects "Preview deployments for all Workers" or "Production and preview deployments for all Workers" in an account, including Workers created later; or one Worker; or one hostname. Preview URLs are public by default. A CI walker authenticates with an Access service token in two request headers. Limit: "Worker-level Access policies do not currently support WebSocket connections"; a Worker that needs WebSockets must use a hostname-based application. Needs Zero Trust enabled on the account (the free tier's seat allowance was not re-verified today). Source: [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

With a separate development account, "protect all Workers, all traffic" is one setting, set once by the owner, and no development copy is ever public.

## 9. Automated walks at round close

| Where the browser runs | How | Cost and limits | Verdict |
| --- | --- | --- | --- |
| **GitHub Actions** | A job in environment `dev`, in the container `mcr.microsoft.com/playwright:v1.56.1-noble`, runs `npm run journey -- --live $URL`; uploads `report.json`, screenshots and traces as an artifact; writes counts to the run summary; fails on findings | Free and unlimited on a public repository; 4 vCPU; artifacts kept up to 90 days | **Recommended.** The walker already exists and already runs this way in `regression.yml`. |
| Cloudflare **Browser Run** (the product formerly called Browser Rendering), from a Worker with `@cloudflare/playwright`, or from CI over CDP | Sessions of headless Chrome on Cloudflare; also Quick Actions including a `/crawl` endpoint | Free: 10 browser minutes a day, 3 concurrent browsers. Paid: 10 browser hours a month then $0.09 an hour; 10 concurrent browsers (monthly average) then $2.00 each; default ceiling 200 concurrent | Worth it only for wide parallel walks, or to walk from inside Cloudflare. The plane already binds a browser for its own features. |
| A Claude session driving a browser | As Process3's walkers did | Session tokens; evidence is the model's words | Keep for exploratory walking only; nothing the model says is evidence. |

Sources: [Browser Run](https://developers.cloudflare.com/browser-run/), [limits](https://developers.cloudflare.com/browser-run/limits/), [pricing](https://developers.cloudflare.com/browser-run/pricing/).

**Trigger.** Run the walk as the last step of the deploy job on `push` to the integration branch, so that the environment's deployment succeeds only if the walk passes; or as a `workflow_run` after the deploy workflow. Open one issue per walk with the counts and a link to the artifact; pair it with the Workers Issues list for the same window.

**Where the output goes.** Artifacts, not git. The Foundations say a walk's output "is kept only until it is analysed"; today hundreds of megabytes of it are committed.

**Custom code.** None beyond the workflow file. **Who can change it:** the workflow is under `/.github/`, so the owner.

---

# C. The product as a lever

## 10. What the product looks like, and what would reduce the need for process

### 10.1 Measured from `origin/tranche` [repo]

| Fact | Value |
| --- | --- |
| Files in the tree | 20,060, of which `build/` 13,017 (431 MB), `bio-plane/` 4,996 (82 MB), `docs/` 610, `process/` 398 |
| Modules in `build/modules.json` | 220, in 11 layers (39, 10, 12, 9, 21, 27, 3, 20, 13, 4, 62); 163 live under `bio-plane/` |
| Source per module (bytes under its paths, excluding its tests) | median 123 KB, 90th percentile 319 KB; the largest are asset-heavy (`ux-design` 11.3 MB, `installer` 9.9 MB, `ocr-worker` 6.2 MB) |
| Tests per module | median 191 KB, 90th percentile 831 KB; `pdf-worker` 4.7 MB in 227 files; 14 modules list no test files |
| Test files | 3,639 `*.test.mjs` (47 MB); 3,400 of them under `bio-plane/test/m/<module>/` |
| Declared uses per module | median 10, 90th percentile 26, maximum 134 (`plane`) |
| Transitive dependents per module | median 71, 90th percentile 162, maximum 217 |
| Most-used modules | `setup-words` 213, `test-support` 153, `record-grammar` 132, `record-core` 116, `membership` 116 |
| Language and static checks | Plain `.mjs` throughout. No TypeScript file, no `tsconfig`, no ESLint, Biome or Prettier configuration anywhere in the tree |
| Test runner | `node --test`, with a preload that imposes the platform's SQLite limits; miniflare for Worker tests; Playwright for browser tests |
| Lock files | Ten, each installed separately in the gate |
| `npm test` in `bio-plane` | Has a `pretest` that builds the words files, the case-checker program and **every** fleet bundle first |
| Workflows | `process-gate` (one job, timeout 90 minutes), `regression` (manual, 120), `process-dev-release` (checks job 240), `deploy-test`, `release-sign`, `container-images`, `process-record`, `process-branch-prune` |
| Gate time signals | "plane and control-plane gates take 40-42 minutes" (workflow comment); median attempt 12 minutes rising to 42–65 (review); one forced full gate 55 minutes |

### 10.2 What these facts say

- **The median module cannot be changed in isolation.** With 71 transitive dependents at the median, "run the dependants' suites" is expensive (the owner called it "a large drag with little benefit" and it was reverted), and "notify every user of a changed module" produced 56 jobs for one requirement. The product needs a cheaper way than re-running or re-reading dependants to know an interface still holds.
- **There is no check that runs in seconds.** Without a type check or lint, the cheapest signal that a change broke a caller is a test run measured in tens of minutes. Process filled that gap with receipts, notices and re-test landings (27 of 47 landings in one 29-hour window were re-tests with no code change).
- **The gate's time is mostly fixed overhead and serial execution**, not the module's own tests.
- **The strongest defect finder runs least often.** The walk found 1,691 faults at a round close; nothing like it runs per merge.

### 10.3 Concrete, modest changes

Ordered by what they remove.

1. **Type-check the interfaces without adopting TypeScript.** Add `typescript` as a development dependency and one `tsconfig.json` with `allowJs`, `checkJs`, `noEmit`, including only each module's public entry files at first. JSDoc types on exported functions are enough. A wrong argument shape across a module boundary then fails in a minute or two, in the `plan` job, before any test runs. This is the fast deterministic stand-in for most "provider notices".
2. **Enforce the layer map with a linter, not a tool.** The "imports check" (one real catch) compared declared `uses` with actual imports. `dependency-cruiser` or ESLint's `import/no-restricted-paths`, with its rule list generated from `build/modules.json`, does this as an off-the-shelf check with file-and-line output.
3. **One contract test file per high fan-in module.** For the twenty or so most-used modules, a `contract.test.mjs` that pins the exported surface and the documented behaviours at the interface. A change to `membership` then runs `membership`'s suite including its contract; dependants are not re-run and not notified unless the contract file itself changes, which is visible in the diff. This replaces notices, triage and re-test landings with a file.
4. **Take the bundle build out of `pretest`.** Build generated files once per CI run in the `plan` job, keyed by a hash of their inputs in the Actions cache; module suites that do not import `dist/` should not wait for eight bundles.
5. **Shard and tier the tests that already have a per-module layout.** `node --test --test-shard=i/n` over the selected modules' directories. Name the heavy fixture suites (`pdf-worker`, `doctypes`, `reading-pipeline`, `image-codecs`, 2 to 5 MB of tests each) as a slower tier that runs in the merge queue or nightly, which is what the Foundations already prescribe ("a fixture's tier is set with its requirement").
6. **One install instead of ten.** npm workspaces at the root, or at least one cache key over all lock files. Ten `npm ci` calls are several minutes of every gate.
7. **Pin the runner image and use the Playwright container.** Deletes about seventy lines of browser install and fallback from the gate.
8. **A feature-flag map in `vars`.** Unfinished behaviour lands dark behind a flag read from the Worker's variables. Merges then need no ordering by layer and no "companion must land first" rule (which deadlocked a layer within hours of being written); the flag flips when the last piece lands.
9. **Make deploy-and-walk the routine defect finder.** Run `journey-check`'s local arm in the merge-group run if it fits in a few minutes, and the live arm on every push to the integration branch against one long-lived development copy. Keep the fresh-install and upgrade walks for the release tier.
10. **Move walk output and plans out of git.** Artifacts for walk output; issues for findings. `build/` at 431 MB is two-thirds of the files a session's checkout carries, and GitHub's recommended ceiling for a repository is 10 GB on disk.
11. **Turn on Workers Logs and Issues for development copies**, and have the walker tag its requests (a header carrying the commit SHA) so server-side errors can be joined to a walk.

None of these is a framework. Items 1, 2, 4, 5, 6 and 7 together are the route to a ten-minute gate; whether they reach it is assumption 4 in section 12.

**A warning from the review that applies here.** "The tendency will look for other outlets. Expect it in the product's own test suites." Items 1 to 3 add checks. Each should be the owner's decision, with a number attached (seconds added to the gate), and CODEOWNERS on the lint and type-check configuration files keeps their strictness the owner's.

---

# D. Synthesis

## 11. Each job of the Process3 tool, and what could take it over

Tool sizes are lines at `process3 origin/tranche` (23,429 lines in `tool/`). "Owner" means the repository owner through settings no write collaborator can reach. "Owner via CODEOWNERS" means the file is in the product, a session can propose a change in a pull request, and the pull request cannot merge without the owner.

| # | Job the custom tool did | Process3 code | Native lever | Custom code still needed | Who can change it |
| --- | --- | --- | --- | --- | --- |
| 1 | **Merge ordering** (train, leases, holds, layer flow, direct flow) | `merge` 1,047, `layerflow` 2,579, `hold` 278, plus `direct`, `layer`, `layerbase`, `landed` | Organization: ruleset "Require merge queue" with grouping. Personal: auto-merge. Layer order: feature flags in the product instead of ordered merges. | 0 | Owner (ruleset). Sessions only enqueue. |
| 2 | **Gate on the merged result, then merge a green current tip** | Part of `merge`, `gate` 847, `basered`, stale-green check | Merge queue runs the required check on base + queue + pull request (`merge_group`). Personal: the `pull_request` run already tests GitHub's test merge; a `push` run on the integration branch covers the remaining 2%. | 0 (two trigger lines) | Owner (ruleset); workflow file owner via CODEOWNERS |
| 3 | **Record and size checks** (file size, reserved paths, ledger schema, record ownership) | `record` 525, `size` 129, `ledger` 196, `census` | Mostly delete: no ledger, no state paths. File size: GitHub hard-limits 100 MB only; a path or size rule in a ruleset needs a private Team repository. Walk output goes to artifacts so the pressure disappears. | 0, or about 5 lines in the gate if a 1 MB cap is still wanted | Reusable workflow: owner |
| 4 | **Pin and version distribution** (submodule pin, pin move, start check, 98 moves) | `pin` 108, `start` 150, `setup` 628, shims and drift check | Process repository not writable by sessions; product calls its reusable workflow `@<sha>`. A version is one line. | 1 line | Process: owner. The line: owner via CODEOWNERS |
| 5 | **Status and next acts** | `status` 1,408, `report`, `metrics`, `measures` | `gh pr list --json ...`, `gh pr checks`, `gh run list`, the merge queue page, Deployments list; optionally a Project board | 0, or a 10-line shell alias that prints three `gh` queries | Nothing to change |
| 6 | **Wake-ups and sweep** | `sweep` 495, `triggers`, `roles` | Pull-request event subscriptions wake the session that owns the work (Claude side). `workflow_run` and `schedule` on `main` for anything periodic. Cloudflare Issues automations for product failures. | About 15 lines of YAML | Owner (`main` is owner-only) |
| 7 | **Heartbeat and watchdog** | Heartbeat file on the state branch, watcher role, idle alarm | Scheduled workflow on `main` that exits non-zero when ready work is not moving; GitHub notifies the owner of the failed run | Same 15 lines | Owner |
| 8 | **Pacing** (usage ledger, push ceiling, hooks, hourly audit; 3,523 lines deleted) | `pace` 131 remaining | No state branch; one push per turn; queue batches merges. GitHub's own published numbers as plain guidance: 6 pushes a minute per repository, 1 merge a minute, 500 content creations an hour. | 0 | Nothing to change |
| 9 | **Deploy (development)** | `deploy` 573, `deploycfg`, `walkcfg` | Actions job on `push` to the integration branch in environment `dev`, holding a development-only Cloudflare token; or Worker Previews; the walk as its last step | A workflow file calling the product's existing deploy and walk scripts | Workflow: owner via CODEOWNERS. Token scope and Access: owner in Cloudflare |
| 10 | **Release approval** | `release` 255, `process-dev-release.yml` | GitHub environment `production` with the owner as required reviewer, restricted to `main` and release tags; tag ruleset; "require deployments to succeed" on `main`; or Workers Builds from `main` | 0 | Owner |
| 11 | **State and ledger** (state branch, addresses, ledger entries, triage register, notices) | `state` 692, `ledger` 196, `triage`, `notice`, `register`, `found` | Pull request (branch, draft, labels, body), check runs, issues, Deployments. Module marks stay in the product's files. | 0 | Nothing to change; labels are session-writable by design |
| 12 | **Approvals-integrity check** (owner's website commit, fingerprint in every prompt; caused the final standstill) | `anchor`, parts of `record`, `setup`, `start` | CODEOWNERS on `CLAUDE.md` and `.claude/**` with required code-owner review on protected branches; sessions always start from the protected tip. No fingerprint, so an owner edit stops nothing. | 0 | Owner |
| 13a | **Receipt comparison** (17 reds, no catch in 1,187 runs) | Removed 9 Nov | Delete. The check run's own log and summary are the receipt. | 0 | — |
| 13b | **Revert check** (new tests must fail with the change reverted; 10 of 20 "false done" findings were false) | `testdiff` 235, `review` | No native equivalent. Either drop it, or keep the narrower trigger that earned its place: flag deleted or weakened tests. Report as a warning annotation and a review request to the owner, never as a block. | 0, or about 20 lines of `git diff --diff-filter` in the reusable gate | Owner (process repository) |

Totals under this mapping: roughly 0 to 80 lines of YAML and script, all of it either in the process repository (no session can write) or under `/.github/` in the product (no session can merge a change). Everything else is a setting.

**What no native lever covers, stated so it is not rediscovered as a "gap":**

- Starting, messaging and replacing Claude sessions. GitHub and Cloudflare can detect and notify; the act is Claude-side.
- Choosing which module to work on next. That is planning, read from the product's own files.
- Stopping a session from weakening product tests or writing on its own branch.
- Deliberate forgery of a check by a session with write access, short of Enterprise required workflows.

## 12. The five riskiest assumptions, each testable in a one-hour spike

1. **"Zero approvals plus required code-owner review" on a personal public repository does what section 1.3 needs.** Test with the session account on a scratch repository: a pull request touching only `src/` auto-merges on a green check; a pull request touching `CLAUDE.md` or `.github/workflows/x.yml` is blocked until the owner approves; the session account cannot approve, dismiss or bypass; the owner can still commit directly. Also test that a commit status named `gate` set by the session account does not satisfy the check when the source is pinned to GitHub Actions. If this fails, the fallback is a free organization and the ruleset's own "required reviewers for file patterns" rule.

2. **The merge queue behaves as documented for this workload.** In a free organization, on a non-default integration branch: `gh pr merge --auto` issued by a Claude session actually enqueues (the session's permission layer and credential allow it); groups of up to ten merge on one `merge_group` run; a failing entry is ejected and the rest proceed; the merge fires a `push` workflow on the integration branch (needed for deploy-on-merge); twenty simultaneous ready pull requests clear in under an hour with a ten-minute check and 20 concurrent jobs.

3. **A session cannot quietly replace the gate, and the new Actions policies are usable here.** On the scratch repository: confirm the reusable-workflow caller produces a stable required-check name for both `pull_request` and `merge_group`; confirm that a pull request which edits the caller or adds a second workflow reporting `gate` cannot merge without the owner; then try workflow execution protections on a personal public repository: an owner-only actor rule on the release workflow file (expected to work) and an allowlist that leaves only named workflow files runnable by the session account (unknown). Check as well whether Claude's GitHub credential can push a change under `.github/workflows/` at all.

4. **The gate can reach about ten minutes.** Take one heavy module (`control-plane`, 157 test files) and one typical one; run plan + four shards in the Playwright container on `ubuntu-24.04` with a warm npm cache and the bundle build cached. Measure wall time and the fixed overhead. If the fixed overhead alone exceeds five minutes, items 4 and 6 of section 10.3 are prerequisites, not options.

5. **Cloudflare's new walls fit a product that is installed, not hosted.** In a separate development account: `wrangler preview` of `bio-plane` on a branch with a `previews` block (own Durable Object namespace, a preview R2 bucket, members bound to their deployed copies), then the live walk against the preview URL behind Access with a service token. Separately, mint a token with Editor on two named Workers and confirm it cannot deploy to a third, cannot create a Worker, and that the product's REST deploy script still works with it. If the fleet's two-way service bindings defeat previews, fall back to a fixed pool of pre-created `p3dev-N` copies with per-Worker Editor.

A sixth item is not a spike but should be done first because it is free: ask GitHub Support why the session account was suspended on 6 Nov. Every pacing decision is otherwise a guess.

---

## Sources

GitHub documentation (read 13 Nov 2026, from the docs site and its source repository `github/docs`):
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
- https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request-with-a-merge-queue
- https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- https://docs.github.com/en/actions/reference/limits
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.github.com/en/actions/concepts/about-actions-policies
- https://docs.github.com/en/actions/how-tos/administer/control-workflow-execution
- https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits
- https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app
- https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies

GitHub changelog:
- https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/
- https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available/
- https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2

Cloudflare documentation (read 13 Nov 2026):
- https://developers.cloudflare.com/workers/previews/
- https://developers.cloudflare.com/workers/previews/resources/
- https://developers.cloudflare.com/workers/previews/test-and-debug/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
- https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/workers/observability/issues/
- https://developers.cloudflare.com/workers/observability/issues/automations/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/browser-run/
- https://developers.cloudflare.com/browser-run/limits/
- https://developers.cloudflare.com/browser-run/pricing/
- https://developers.cloudflare.com/browser-run/playwright/

Local evidence:
- `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/work/foundations.md`
- `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/work/review.txt`
- `/home/user/neobobkrause/process3` at `origin/tranche`: `tool/lib/*.mjs`, `setup/conditions.json`, `setup/DEVELOPER.md`, `notes/github-pacing.md`, `DECISIONS.md`, `shims/`
- `/home/user/neobobkrause/civicsmith-copy` at `origin/tranche`: `.github/workflows/*.yml`, `.github/scripts/module-tests.mjs`, `process/config.json`, `build/modules.json`, `CLAUDE.md`, `.claude/settings.json`, every `wrangler.jsonc`, `bio-plane/package.json`, `bio-plane/scripts/deploy.mjs`, `bio-plane/scripts/p3dev-walk-setup.mjs`, `bio-plane/src/journey-check/`
