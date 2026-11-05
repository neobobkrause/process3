# Account switch runbook

For the coordinator, or ROOT, when Bob moves Process3 to another Claude account. Scheduled tasks, live job sessions and message deliveries belong to a Claude account; git does not. This runbook writes the first down in git on the old account and restarts from git on the new one, in an order that cannot race the tranche. Why: the switch of 5 Nov cost 94 minutes at 0 of 20 live jobs (notes/account-switch-review.md on start/coordinator-4nov).

## 1. Old account: switch out

1. Save list_triggers (every page, limit 100) and list_sessions (every page, archived ones included) as JSON files.
2. From a product checkout at the tranche: `node .process/tool/p3.mjs switch out --tasks <tasks file> --sessions <sessions file> --by <your session id>`. It writes `switch/manifest.json` on the state branch (each enabled task with its schedule, prompt and role; each live job with its module, session, branch, pull request and state; the role addresses; the unanswered messages) and nothing else.
3. Do the stop acts it prints, in its order, each its own call: the MERGER stops its train and runs `merge train release --session <its id>` (the lease is free at once, not in 15 minutes); each job pushes its work in progress and ends; each task is switched off with update_trigger, never deleted; BOB, ROOT and the watcher end their turns.
4. Tell Bob it is done, with the manifest's commit.

## 2. Bob, between the accounts

1. On the new Claude account, connect GitHub (claude.ai, Settings, Connectors) signed in as the collaborator account (push, not admin), never the repositories' owner.
2. Install the Claude GitHub App on each repository of the process for that account.
3. Add the new account to the standing approvals in CLAUDE.md if their wording needs it, by his own website commit.
4. Start the new coordinator session with one repository attached.

## 3. New account: switch in, its first act

1. Save list_sessions as JSON. From a product checkout at the tranche, before any push or start: `node .process/tool/p3.mjs switch in --sessions <file> --by <your session id>`.
2. If it refuses, each failed check names who fixes it (most are Bob's: the GitHub connection, the account, the GitHub App). Tell Bob those words, wait, and run it again. Never push before it passes. If only the approvals changed and the change is Bob's own for the new account, run it again with `--approvals <the tip's hash it printed>` on his word.
3. Once it passes, do its acts (a) to (g), in order, each its own command: (a) the coordinator's id merged; (b) `switch quiet` until it exits 0; (c) ROOT, then ROOT's handover for BOB, `start merger --replace` and `start watcher --replace` with the old ids; (d) the tasks, bound to the new sessions; (e) BOB restarts every recorded job, release path first; (f) `job start --ready`; (g) the unanswered messages delivered to the new sessions.
4. Old sessions cannot be messaged or archived from the new account: Bob archives them, and deletes the switched-off tasks, on the old account once the new ones run.
