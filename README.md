# process3
The Process3 tool and its workflows. Built in Phase 1 of the Process3 Build Plan.

- `tool/p3.mjs`: the tool, one program run from a pinned clone (`node .process/tool/p3.mjs <command>`). No dependencies.
- `setup/conditions.json`: the setup a product needs before a job starts, one entry per condition (what, why, value, who sets it, how it is read or that it is confirmed once on the onboarding page).
- `setup/DEVELOPER.md`: the steps only the repository's owner can take, each with why, the clicks on github.com, how BOB confirms it, and the setup-list entry it sets.
- `schema/ledger-entry.schema.json`: the ledger entry (REC-9). A product keeps one file per entry in `process/ledger/<id>.json`.
- `.github/workflows/ci.yml`: this repository's own check: the tool's tests and the record check.
- `shims/`: the workflows a product carries: `process-gate.yml` (the required check "gate": the gate and the record check on every pull request, at the base's process pin, on a read-only token; then job "post", which runs no product code, posts the gate comment from the run's gate-row artifact). If job post fails to post, the required check stays green; that is accepted, because merge refuses a job without a verified gate row (review of PR 13). A base whose pin predates the two-job gate takes a legacy path for that run: the gate reads and posts no comment, so a ready job pull request goes red with "no receipt" (it fails closed); a product therefore moves its gate workflow and its pin in one plain pull request.
- `shims/process-record.yml`: the record check on every push.

## Commands

Run from a product checkout with the pinned clone at `.process/`: `node .process/tool/p3.mjs <command>`.

| command | who | does |
|---|---|---|
| `status [--role job --module <id>]` | anyone | entries, branches, PRs, gate, flags (an attempt over its budget among them), each live attempt's time and cost, whether the open check is due, reading set with sizes |
| `job start <id> --coordinator <session>` | BOB | branch, WORKING, START, draft PR; prints the create_session call, then the subscribe_pr_activity call for the PR |
| `job start <id> --reopen "<what>"` | BOB | a new attempt on a COMPLETE module whose last attempt merged; the START says what it must do |
| `test <id>` | job | installs the module's stale lock files (GAT-5), then runs the module's own suite |
| `job complete <id> --not-verified "..."` | job | checks and suite, COMPLETE, push, receipt, ready; resumable |
| `block <id> --reason "..."` | job | BLOCKED with a reason |
| `merge <pr> --reviewed "..." --rounds <n>` or `--no-review "..."`, optionally `--decision "..."` | BOB | up to the tranche, merge row (with its review rounds), gate on that tip, merge |
| `merge <pr> --plain --reviewed "..." --rounds <n>` or `--no-review "..."`, optionally `--decision "..."` | BOB | any pull request that is not a job's (pin moves, metrics rows, config): into the tranche or a working branch, or the tranche into main; every required check green on the head; a merge commit pinned to it; no merge row. A change to `process_repo` or `tranche` in `process/config.json` needs Bob's word, except the tranche into main carrying the value the owner's own website commit (or website merge) set on the tranche, and onboarding a tranche with no process config (process3's own address; as the tranche's name, only the branch it onboards), which also sets `approvals.owner` to the repository's owner |
| `setup check` | BOB | reads the product's setup against `setup/conditions.json`, read-only; exit 1 when a condition is missing; `job start` runs it first |
| `metrics add <id> ...`, `metrics open-check --outcome pass\|stopped ...`, `metrics report` | BOB | measured figures; the open check's row, with the Claude Code version it ran on; the two health metrics |
| `ledger check`, `record-check`, `gate [--no-post]`, `gate --post <gate.json> --pr <n>` | CI | the checks the workflows run; the gate comment |

## The loop guard

No session runs past its budget or loops unnoticed (the Foundations' sixth running-unattended condition; build I, 3 Nov).

- Budget per attempt. `budgets` in the tool's config (`DEFAULTS` in `tool/lib/util.mjs`) is one table, a budget per role in elapsed minutes and US dollars: today `job` 180 minutes and $40, `coordinator` 480 minutes and $120. A product's `process/config.json` may change a role's figures (`"budgets": {"job": {"minutes": 120}}`); a figure set to `null` is not budgeted. An attempt's elapsed time runs from its start row to its complete row, or to now while it runs. Its cost is BOB's measured figure (`metrics add --cost-usd`), else the one `job complete` read from the job's session record (Claude Code's transcript for `CLAUDE_CODE_SESSION_ID`), else `unmeasured`: a cloud session's transcript states tokens but no cost today, so the cost of a job attempt is unmeasured until BOB records it. `job complete` writes `elapsed_minutes`, `cost_usd`, `tokens` and the session record's version and minutes into the complete row. `status` shows each live attempt's figures and flags one past either budget.
- The review-round limit, held by `merge`. Round 1 is the two fresh reviews; round 2 is the one fix pass and its confirming re-review of the fix. A reviewed merge states its rounds (`--rounds 1` or `--rounds 2`) and records them: in the merge row for a job, in the merge commit's message for a plain merge. A third round or more is refused unless the command names the decision that allowed it (`--decision "<who decided, and why>"`), which is recorded with the rounds. A merge with `--no-review` has no rounds. The rounds are as the command states them: the tool cannot see reviews run by subagents, so a count stated wrongly on purpose is held by the record it leaves, not by the tool.
- The open check reruns at each Claude Code version change. `metrics open-check` writes BOB's row to `process/metrics/open-check.bob.jsonl` with the Claude Code version (`claude --version`, else the session record, else `unmeasured`); `status` says the open check is due when no row is recorded, the version here differs from the last row's, the version cannot be read, or the last run did not pass.

## The coordinator

BOB, the coordinator, takes the acts a round needs that are not a job's: starting job sessions, merging through `merge`, deploying, releasing and acting on a live site. Two rules for those acts:

- One act per command, never chained. Each judged act (a git push, a merge, a gh call, a session start, a deploy) is its own shell command, with no `&&`, `||`, `;`, pipe or second line joining it to anything else.
- Deploy duties follow the rule under Development deployments below: `wrangler delete`'s error about Workers KV counts as success only once the script is confirmed gone.

## Development deployments

A development deployment is removed with `wrangler delete`. The product binds no Workers KV, so the deploy token carries no KV scope (`setup/conditions.json`, `deploy-token`), and `wrangler delete` may then exit with an error about Workers KV after the delete itself succeeded. Count that follow-up error as success only after confirming the script is gone: a read of `accounts/{account}/workers/scripts/{name}` answers 404 (or the script is absent from the account's list of scripts). Any other error, or a script still there, is a failed removal.

## Onboarding

Onboarding is the plain pull request into the tranche that adds `process/config.json` while the tranche has none. It sets `approvals.owner` to the repository's owner as GitHub has it (`GET /repos/{repo}`: `owner.login`); `merge --plain` refuses an onboarding pull request that does not, and while the base has no config the checks judge by that owner. Afterwards only the owner's own website commit changes it. A repository an organization owns has no person there to name, so the default owner (`neobobkrause`) holds, and onboarding writes that. Onboarding may also name the tranche (`"tranche"`), but only as the branch it onboards: a pull request into a branch with no config whose head names that very branch as the tranche onboards it under that name.

A change to the approvals block, a merge whose sides hold different blocks included, is accepted only when it leaves the newest block the owner set through GitHub's website among its own ancestors (an edit, a website merge, or a removal), or is the owner's own website commit; and either must be no older than the newest block the owner set on the base, so an old owner draft is a restore however it arrives. The setup check is stricter on purpose: the tranche's block must be the newest the owner set on the tranche or main, so an owner's website edit on main alone reads missing, and stops job starts, until main is merged into the tranche. So such a merge needs GitHub to answer the record check's lookups, and a product whose block was never set by an owner website commit has every such merge refused until the owner sets it once on the website.

## Known limits

The tool's checks hold against mistakes (a session editing settings, touching another module, resolving a merge with an old copy, merging red or stale, moving the pin somewhere unreleased) and against outsiders' pull requests from forks. They do not chase a session that deliberately attacks them: deliberate attacks by a session with Write access are held by GitHub's walls (rulesets, required checks, permissions), not by the tool. So these are left alone: approval text carried into CLAUDE.md through an `@import` of another file; code outside the guarded paths that a hook or a workflow runs; process3's `ci.yml` running the head's code before its record step (the required record check runs from main); and local actions a workflow uses from the repository itself. The same holds for the newest-block rule: a commit made through GitHub's API with the owner's own token looks like the owner's website commit, so sessions must never hold the owner's token, and the sessions' own account must never own the product (onboarding and the setup check refuse it). Not yet probed: whether a commit a session authors with the owner's public email, then rewritten and signed by GitHub (a rebase merge, or a rebase "update branch"), reads as the owner's website commit; until it is, the approvals rest on GitHub's walls there too.

Known limits of the newest-approvals rule, each needing a session acting on purpose:
- A pull request whose head is an owner branch holding only the owner's website commits counts as the owner's own pull request whoever opened it, so a session could land an owner draft the owner abandoned, if it is newer than every block on the tranche and main.
- While main has no config, a branch literally named `tranche` is not asked for a ruleset naming it when the product's real tranche has another name; main's own required checks still hold it.
- Once the owner has removed the approvals block, a session could replace the approvals file with a symbolic link (its block reads as empty, the newest) and carry approval text in through the linked file, as with an `@import`.
