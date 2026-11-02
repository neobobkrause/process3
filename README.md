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
| `status [--role job --module <id>]` | anyone | entries, branches, PRs, gate, flags, reading set with sizes |
| `job start <id> --coordinator <session>` | BOB | branch, WORKING, START, draft PR; prints the create_session call, then the subscribe_pr_activity call for the PR |
| `job start <id> --reopen "<what>"` | BOB | a new attempt on a COMPLETE module whose last attempt merged; the START says what it must do |
| `test <id>` | job | installs the module's stale lock files (GAT-5), then runs the module's own suite |
| `job complete <id> --not-verified "..."` | job | checks and suite, COMPLETE, push, receipt, ready; resumable |
| `block <id> --reason "..."` | job | BLOCKED with a reason |
| `merge <pr> --reviewed "..."` or `--no-review "..."` | BOB | up to the tranche, merge row, gate on that tip, merge |
| `merge <pr> --plain --reviewed "..."` or `--no-review "..."` | BOB | any pull request that is not a job's (pin moves, metrics rows, config): into the tranche or a working branch, or the tranche into main; every required check green on the head; a merge commit pinned to it; no merge row. A change to `process_repo` or `tranche` in `process/config.json` needs Bob's word, except the tranche into main carrying the value the owner's own website commit (or website merge) set on the tranche, and onboarding a tranche with no process config (process3's own address; as the tranche's name, only the branch it onboards), which also sets `approvals.owner` to the repository's owner |
| `setup check` | BOB | reads the product's setup against `setup/conditions.json`, read-only; exit 1 when a condition is missing; `job start` runs it first |
| `metrics add <id> ...`, `metrics report` | BOB | measured figures; the two health metrics |
| `ledger check`, `record-check`, `gate [--no-post]`, `gate --post <gate.json> --pr <n>` | CI | the checks the workflows run; the gate comment |

## Development deployments

A development deployment is removed with `wrangler delete`. The product binds no Workers KV, so the deploy token carries no KV scope (`setup/conditions.json`, `deploy-token`), and `wrangler delete` may then exit with an error about Workers KV after the delete itself succeeded. Count that follow-up error as success only after confirming the script is gone: a read of `accounts/{account}/workers/scripts/{name}` answers 404 (or the script is absent from the account's list of scripts). Any other error, or a script still there, is a failed removal.

## Onboarding

Onboarding is the plain pull request into the tranche that adds `process/config.json` while the tranche has none. It sets `approvals.owner` to the repository's owner as GitHub has it (`GET /repos/{repo}`: `owner.login`); `merge --plain` refuses an onboarding pull request that does not, and while the base has no config the checks judge by that owner. Afterwards only the owner's own website commit changes it. A repository an organization owns has no person there to name, so onboarding refuses it until Bob names the approving person.

A change to the approvals block, a merge whose sides hold different blocks included, is accepted only when it leaves the newest block the owner set through GitHub's website on the tranche or main (an edit, a website merge, or a removal), or is the owner's own website commit. So such a merge needs GitHub to answer the record check's lookups, and a product whose block was never set by an owner website commit has every such merge refused until the owner sets it once on the website. It may also name the tranche (`"tranche"`), but only as the branch it onboards.

## Known limits

The tool's checks hold against mistakes (a session editing settings, touching another module, resolving a merge with an old copy, merging red or stale, moving the pin somewhere unreleased) and against outsiders' pull requests from forks. They do not chase a session that deliberately attacks them: deliberate attacks by a session with Write access are held by GitHub's walls (rulesets, required checks, permissions), not by the tool. So these are left alone: approval text carried into CLAUDE.md through an `@import` of another file; code outside the guarded paths that a hook or a workflow runs; process3's `ci.yml` running the head's code before its record step (the required record check runs from main); and local actions a workflow uses from the repository itself.
