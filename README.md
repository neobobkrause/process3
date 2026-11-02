# process3
The Process3 tool and its workflows. Built in Phase 1 of the Process3 Build Plan.

- `tool/p3.mjs`: the tool, one program run from a pinned clone (`node .process/tool/p3.mjs <command>`). No dependencies.
- `schema/ledger-entry.schema.json`: the ledger entry (REC-9). A product keeps one file per entry in `process/ledger/<id>.json`.
- `.github/workflows/ci.yml`: this repository's own check: the tool's tests and the record check.
- `shims/`: the workflows a product carries: `process-gate.yml` (the required check "gate": the gate and the record check on every pull request, at the base's process pin) and `process-record.yml` (the record check on every push).

## Commands

Run from a product checkout with the pinned clone at `.process/`: `node .process/tool/p3.mjs <command>`.

| command | who | does |
|---|---|---|
| `status [--role job --module <id>]` | anyone | entries, branches, PRs, gate, flags, reading set with sizes |
| `job start <id> --coordinator <session>` | BOB | branch, WORKING, START, draft PR; prints the create_session call |
| `job start <id> --reopen "<what>"` | BOB | a new attempt on a COMPLETE module whose last attempt merged; the START says what it must do |
| `test <id>` | job | the module's own suite |
| `job complete <id> --not-verified "..."` | job | checks and suite, COMPLETE, push, receipt, ready; resumable |
| `block <id> --reason "..."` | job | BLOCKED with a reason |
| `merge <pr> --reviewed "..."` or `--no-review "..."` | BOB | up to the tranche, merge row, gate on that tip, merge |
| `merge <pr> --plain --reviewed "..."` or `--no-review "..."` | BOB | any pull request that is not a job's (pin moves, metrics rows, config): into the tranche or a working branch, or the tranche into main; every required check green on the head; a merge commit pinned to it; no merge row |
| `metrics add <id> ...`, `metrics report` | BOB | measured figures; the two health metrics |
| `ledger check`, `record-check`, `gate` | CI | the checks the workflows run |

## Known limits

The tool's checks hold against mistakes (a session editing settings, touching another module, resolving a merge with an old copy, merging red or stale, moving the pin somewhere unreleased) and against outsiders' pull requests from forks. They do not chase a session that deliberately attacks them: deliberate attacks by a session with Write access are held by GitHub's walls (rulesets, required checks, permissions), not by the tool. So these are left alone: approval text carried into CLAUDE.md through an `@import` of another file; code outside the guarded paths that a hook or a workflow runs; process3's `ci.yml` running the head's code before its record step (the required record check runs from main); and local actions a workflow uses from the repository itself.
