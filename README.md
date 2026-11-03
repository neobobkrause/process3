# process3
The Process3 tool and its workflows. Built in Phase 1 of the Process3 Build Plan.

- `tool/p3.mjs`: the tool, one program run from a pinned clone (`node .process/tool/p3.mjs <command>`). No dependencies.
- `setup/conditions.json`: the setup a product needs before a job starts, one entry per condition (what, why, value, who sets it, how it is read or that it is confirmed once on the onboarding page).
- `setup/DEVELOPER.md`: the steps only the repository's owner can take, each with why, the clicks on github.com, how BOB confirms it, and the setup-list entry it sets.
- `schema/ledger-entry.schema.json`: the ledger entry (REC-9). A product keeps one file per entry in `process/ledger/<id>.json`.
- `.github/workflows/ci.yml`: this repository's own check: the tool's tests and the record check.
- `shims/`: the workflows a product carries: `process-gate.yml` (the required check "gate": the gate and the record check on every pull request, at the base's process pin, on a read-only token; then job "post", which runs no product code, posts the gate comment from the run's gate-row artifact). If job post fails to post, the required check stays green; that is accepted, because merge refuses a job without a verified gate row (review of PR 13). A base whose pin predates the two-job gate takes a legacy path for that run: the gate reads and posts no comment, so a ready job pull request goes red with "no receipt" (it fails closed); a product therefore moves its gate workflow and its pin in one plain pull request.
- `shims/process-record.yml`: the record check on every push.
- `shims/hooks/one-act.mjs`: the one-act hook, a PreToolUse hook on Bash that a product's settings file names (see The one-act hook).

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
| `start check [--branch <name>]` | every session | its first command: fetches the branch it started from (default the tranche), compares HEAD and the approvals block of the approvals file with that branch's tip, prints both SHAs; exit 1 when either differs, and the session then acts on nothing, sends both SHAs to its starter and ends |
| `metrics add <id> ...`, `metrics report` | BOB | measured figures; the two health metrics |
| `metrics refusal --session <s> --act "<act>" --depth <n> [--module <id>]` | BOB | one refusal a session reported, in `process/metrics/refusals.bob.jsonl`; `status` counts refusals per session (these rows and `metrics add --refusal`) and prints REFRESH for a session with 10 or more, long before auto mode's 20 |
| `ledger check`, `record-check`, `gate [--no-post]`, `gate --post <gate.json> --pr <n>` | CI | the checks the workflows run; the gate comment |

A moved base is retried, never forced. `merge` and `merge --plain` meet GitHub's "Base branch was modified" by fetching the base, confirming the pull request still has the head and base that were checked, and trying again, at most 3 times in all; any other refusal stops at once. A push to the state branch uses `pushRetry` (`tool/lib/util.mjs`): on git's fetch-first rejection it fetches the branch, merges it with a merge commit (a conflict stops it, nothing pushed) and pushes again, at most 3 times in all. The tool has no state-branch push yet; its other pushes go to a job's own branch, where a branch that moved must stop the command, not be merged into.

## The one-act hook

One act per command: a judged act chained with another command gives the judge one blob to decide. `shims/hooks/one-act.mjs` refuses, with exit 2 and the one line "run this act as its own command" on stderr, a Bash command that joins an outward act (`git push`; the tool's `merge`, `job start` and `job complete`; `gh`; `wrangler` `deploy`, `delete`, `secret`, `r2` and `containers`) to anything else by `&&`, `||`, `;`, a pipe, `&` or a new line, or that runs one inside another command (`$(...)`, backticks, a subshell or process substitution with other commands, `bash -c` or `eval` with other commands). Quoted text and here-document bodies are not commands, so a commit message or a pull request body may say anything. Everything else exits 0. It judges no text, records nothing and holds no turn.

The owner names it once in the product's `.claude/settings.json`, in the owner's one-time onboarding commit through GitHub's website (sessions never edit `.claude/`), running it from the pinned clone:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.process/shims/hooks/one-act.mjs\"" }] }
    ]
  }
}
```

Process3 itself names it the same way with the path `shims/hooks/one-act.mjs`.

## Coordinator guidance

- Run each outward act as its own command, never chained; the one-act hook holds this where a settings file names it.
- Run `start check` first in every session; if it fails, act on nothing, send both SHAs to the starter and end.
- Record every refusal a session reports with `metrics refusal`; when `status` prints REFRESH for a session, start a fresh one to replace it.

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

Known limits of the one-act hook and the start check, each needing a session acting on purpose or outside the tool:
- The hook matches the command's shape, not its effect: an act behind a shell function, an alias, a variable (`$CMD`), a script file, `xargs` given the act's name in a variable, or a program that pushes for itself (an npm script, `git` with an alias for push) passes. It holds the mistake of chaining, not a session set on hiding an act.
- A command the shell itself would not parse (an unclosed quote) is let through; the shell refuses it.
- `start check` compares the approvals block in the checkout's file with the tip's, as the session loaded it from disk at its start; a session that edits the file after its start check is held by the record check, not by this.
