# process3
The Process3 tool and its workflows. Built in Phase 1 of the Process3 Build Plan.

- `tool/p3.mjs`: the tool, one program run from a pinned clone (`node .process/tool/p3.mjs <command>`). No dependencies.
- `setup/conditions.json`: the setup a product needs before a job starts, one entry per condition (what, why, value, who sets it, how it is read or that it is confirmed once on the onboarding page).
- `setup/DEVELOPER.md`: the steps only the repository's owner can take, each with why, the clicks on github.com, how BOB confirms it, and the setup-list entry it sets.
- `schema/ledger-entry.schema.json`: the ledger entry (REC-9). A product keeps one file per entry in `process/ledger/<id>.json`.
- `.github/workflows/ci.yml`: this repository's own check: the tool's tests and the record check.
- `shims/`: the workflows a product carries: `process-gate.yml` (the required check "gate": the gate and the record check on every pull request, at the base's process pin, on a read-only token; then job "post", which runs no product code, posts the gate comment from the run's gate-row artifact). If job post fails to post, the required check stays green; that is accepted, because merge refuses a job without a verified gate row (review of PR 13). A base whose pin predates the two-job gate takes a legacy path for that run: the gate reads and posts no comment and `process-record.yml` (the record check on every push).

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
| `merge <pr> --plain --reviewed "..."` or `--no-review "..."` | BOB | any pull request that is not a job's (pin moves, metrics rows, config): into the tranche or a working branch, or the tranche into main; every required check green on the head; a merge commit pinned to it; no merge row |
| `setup check` | BOB | reads the product's setup against `setup/conditions.json`, read-only; exit 1 when a condition is missing; `job start` runs it first |
| `metrics add <id> ...`, `metrics report` | BOB | measured figures; the two health metrics |
| `ledger check`, `record-check`, `gate [--no-post]`, `gate --post <gate.json> --pr <n>` | CI | the checks the workflows run; the gate comment |
