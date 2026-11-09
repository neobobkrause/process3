# Account switch runbook

For the coordinator, or ROOT, when Bob moves Process3 to another Claude account. A Claude account holds scheduled tasks, live job, lane and role sessions, message deliveries, the cloud environment, the connectors and the claude.ai documents. Git holds none of these. This runbook writes the first five down in git on the old account and restarts from git on the new one, in an order that cannot race the tranche. It also tests the rest well before the switch (Bob, 6 Nov: "anticipate or test for issues related to account switching now"). Why: the switch of 5 Nov cost 94 minutes at 0 of 20 live jobs (notes/account-switch-review.md on start/coordinator-4nov). The canary and the measured times are in notes/account-switch-canary.md.

## 0. Before it is needed: rehearse and preflight

1. `switch out --dry-run` takes the same files as a real switch out (1.1 below). It writes `switch/dry-run/manifest-<time>.json` on the state branch, never `switch/manifest.json`, and prints the stop acts prefixed "do none of them". It stops nothing. Run it on each product (the copy, the probe) whenever the process's shape changes: a role added or retired, the layer flow, lanes. Then read what it names.
2. `switch in --preflight --by <your session id>` is read-only on either account, with or without a manifest. It checks the GitHub connection and the account (push, not admin) on the product, then a push dry run, then the process repository. It prints the session checks that only a session's own tools can make. It exits 1 if a check fails.
3. Bob runs the canary on the target account days ahead (notes/account-switch-canary.md). What fails there is fixed then, not during the switch.

## 1. Old account: switch out

1. Save list_triggers with `enabled: true` and limit 100, every page, as one JSON file. Save list_sessions, newest first, as another. One page stands when it reaches back as far as the record needs: the tool applies status's rule and names the cursor if it does not.
2. From each product checkout at the tranche (the copy, then the probe): `node .process/tool/p3.mjs switch out --tasks <tasks file> --sessions <sessions file> --by <your session id>`. It writes `switch/manifest.json` on the state branch and nothing else. The manifest holds:
   - each enabled task, with its schedule, prompt and role. The role is one of a role's name, the coordinator, `lane <name>`, `fresh` (a new-session-per-fire task that runs the process's tool), or `not the process`: a task bound to no session that never names the process, such as Bob's alpha-pipeline-runner, which is listed and never touched;
   - each live job of this product (its ledger or a job branch on its origin), with its session, branch, pull request and state;
   - the role addresses;
   - the open layers (layer flow);
   - the lane seats and their open asks;
   - the unanswered messages;
   - every old session id it names.
3. Do the stop acts it prints, in their order, each its own call:
   1. each job pushes its work in progress and ends;
   2. each process task is switched off with update_trigger, never deleted;
   3. each lane (the triage seat among them) pushes its folder's work and ends;
   4. BOB, ROOT and the watcher end their turns.
4. Tell Bob it is done, with the manifest's commit.

## 2. Bob, between the accounts

Each step is tested ahead by the canary. The owner of each item is in the inventory (notes/account-switch-canary.md).

1. On the new Claude account, connect GitHub (claude.ai, Settings, Connectors) signed in as the process's GitHub account, the collaborator (push, not admin), never the repositories' owner.
2. Install the Claude GitHub App for each product's repository, process3 and process3-probes.
3. Recreate each product's cloud environment: its network, its setup script, its variables and the network secret for api.cloudflare.com, with the values only Bob holds. Connect Google Drive.
4. Give the new account edit access to the process documents (the Foundations, the Ledger map, the lanes' design artifacts). Until then the new account can only read them.
5. Add the new account to the standing approvals in CLAUDE.md if their wording needs it, by his own commit.
6. Start the new coordinator session with one repository attached.

## 3. New account: switch in, its first act

1. Save list_sessions as JSON. From each product checkout at the tranche, before any push or start: `node .process/tool/p3.mjs switch in --sessions <file> --by <your session id>`. It records the old account's sessions in `switch/retired.json`, so R13's session_gone ends what was bound to them (lane seats, holds) at ROOT's next sweep. The new account's list_sessions never lists those sessions.
2. If it refuses, each failed check names who fixes it; most are Bob's (the GitHub connection, the account, the GitHub App). Tell Bob those words, wait, and run it again. Never push before it passes. If only the approvals changed, and the change is Bob's own for the new account, run it again with `--approvals <the tip's hash it printed>` on his word. Then run the session checks it prints, and send Bob any failure with its fix.
3. Once it passes, do its acts in order, each its own command:
   - (a) The coordinator's id merged into process/config.json, on each product and on the probe.
   - (b) `switch quiet`, until it exits 0.
   - (c) ROOT, then from ROOT: the handover for BOB and `start watcher --replace`, with the old ids.
   - (d) The tasks, bound to the new sessions: the hourly flow check, the survival reads, BOB's and the builders' check-ins, and each `fresh` task as one again. ROOT's sweep and the watcher's daily task are made by their own starts. A task bound to a lane waits for (h).
   - (e) BOB restarts every recorded job, the release path first.
   - (f) In the layer flow, `layer jobs <n>` for each open layer, (the pin move syncs each open layer itself, PD-23). Without it, BOB's `status --role bob`, then each `job start` its `jobs to start` lists.
   - (g) Messages to BOB stay in the record: `status --role bob` lists them by id, and their text is on the state branch. The others are delivered to the new sessions.
   - (h) Each lane with a seat (the triage seat too): `lane start <lane>`, with `--replace <old id>` only if it says the seat is still held (ROOT's sweep usually ends it first); then `--record <new id>`, its open asks, and the tasks bound to it.
4. Old sessions cannot be messaged or archived from the new account. Bob archives them on the old account once the new ones run, and deletes the switched-off tasks there.

## 5. If the process's GitHub account is suspended: the reopen route

Problem class C6 (the process's GitHub account, 6 Nov): GitHub hides every pull request a suspended account opened, with its comments and reviews, from everyone. Its branches, commits, tags and the state branch's rows stay. The switch above moves the Claude account. This route moves the GitHub account and recovers what it held.

1. Bob connects the new GitHub account (2.1, 2.2). No session pushes before `switch in --preflight` passes on it.
2. Each job whose pull request is hidden: its branch on origin holds its work. The coordinator first opens a new pull request from the same head branch (`job complete` needs an open one). Then the job's session (BOB restarts it if it ended) runs `job complete` again, which posts the receipt there, and the gate reads it.
3. Take in by branch name, never by a hidden PR's number. `job start --reopen` can call an attempt abandoned when its merge PR is hidden: check the branch against the tranche before giving it a new branch.
4. A layer retest whose receipt was on a hidden PR refuses: the job is re-run.
5. Lead times and the take-in carry read hidden PRs as unmeasured or empty. Note it in the layer report; nothing is lost from the state rows.
6. Open layer, tranche and pin-move PRs: open a new one from each one's branch, with the same title and body (a hidden PR cannot be reopened).

The full list of tool reads a hidden PR affects is in notes/github-pacing.md ("Risk: GitHub hides every pull request").

Prevention for the class: what the process needs to know about a pull request is recorded in git (the state rows, the land row and the gate run's artifact: C13), never only in the pull request's comments. Then a hidden pull request costs a reopen, not the record.
