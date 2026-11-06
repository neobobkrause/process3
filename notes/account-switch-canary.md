# Account switch: inventory, canary and downtime (R16, 6 Nov)

Bob, 6 Nov: "the last account switch didn't go well at all. So I wonder if there's a way to anticipate or test for issues related to account switching now so that we're ready when the time comes." The runbook is rulebooks/account-switch.md.

## What the old account holds that git does not

All tests were run on 6 Nov from a builder session on the current account (creator 3a2e701f…).

| Item | Test now | Result 6 Nov | Switch step | Who |
|---|---|---|---|---|
| Scheduled tasks | list_triggers, enabled only | 7 enabled: the hourly flow check, the Phase 1 and 2 survival reads (all three the coordinator's), BOB's layer 9 check-in, sweep (ROOT), watcher; plus Bob's alpha-pipeline-runner, which is not the process's | Switch out step 3 switches them off; switch in (d) recreates them | Coordinator; alpha-pipeline-runner is Bob's |
| Role, job and lane sessions | `switch out --dry-run` on the copy | MERGER, BOB, ROOT and the watcher; 8 live jobs; 3 lane seats (investigation, publication, ux) and 1 open ask; layer 9 open; 16 old sessions named | Switch out stop acts; switch in (c), (e), (f), (h); `switch/retired.json` ends their seats | Coordinator, ROOT, BOB |
| Unanswered messages | The same dry run | 211 in all. 201 are to BOB: 147 MERGER refusals and job reports back to 3 Nov | Switch in (g): those to BOB stay in the record for `status --role bob`; about 10 others are resent | Coordinator |
| GitHub identity | `switch in --preflight` on the copy, the probe and process3 | ok: acting as civicsmith; push true, admin false on all three; push dry run ok | Bob connects GitHub as civicsmith on the new account | Bob |
| Claude GitHub App | The same preflight (its push dry run) | ok on this account | Bob installs it for the three repositories | Bob |
| Cloud environment | get_environment | BioDefault (personal): unrestricted network; walk-certificate setup script; 1 network secret (api.cloudflare.com); variables BIO_*, CF_*, CLOUDFLARE_*, GITHUB_TOKEN, JOURNEY_*. A personal environment does not move with the account | Bob recreates it with the values only he holds | Bob |
| Cloudflare | GET api.cloudflare.com/client/v4/user/tokens/verify | 200 | Bob: the Cloudflare connector or the environment's network secret | Bob |
| Google Drive | list_recent_files | ok; the files are owned by neobobkrause@neologic.com | Bob connects Drive on the new account | Bob |
| claude.ai documents | Docs read and update | Read and write ok on this account (P24 and P25 written 6 Nov). The documents belong to this account and are shared by link for viewing, so the new account can read them but not yet write. Only the canary can test that | Bob gives the new account edit access, or the coordinator re-creates the documents on the new account from the last read | Bob |
| Docker Hub, GHCR, Cloudflare account resources | None needed | They are reached by the repositories' workflows and the account token, not by the Claude account | Nothing | — |

## Canary: Bob, on the target account, days ahead

1. Sign in to the target Claude account. Connect GitHub (claude.ai, Settings, Connectors) as **civicsmith**, never as neobobkrause.
2. Install the Claude GitHub App for civicsmith-copy, process3 and process3-probes.
3. Recreate the cloud environment BioDefault (network, setup script, variables, the api.cloudflare.com network secret), and connect Google Drive and Cloudflare.
4. Share the Foundations and the Ledger map (and the lanes' design artifacts) with the target account with edit access. Open each one there.
5. Start ONE session on the target account, on civicsmith-copy, in that environment, with this prompt:

   > Read-only canary for the account switch. Change nothing: no push, no session, no task, no document edit beyond the one comment below. Run `git fetch origin tranche && git checkout -q --detach FETCH_HEAD && git submodule update --init .process`, then `node .process/tool/p3.mjs switch in --preflight --by <your session id>`. Then run each session check it prints with your own tools; for the documents, create a comment "switch canary <date>" on the Foundations and delete it. Send the coordinator (`node .process/tool/p3.mjs address coordinator`) every line, ok or failed with its words, then end your turn.

6. The coordinator reads the report and sends Bob each failure with its fix. Run the canary again after any fix.

## Rehearsal, measured 6 Nov (this account)

| Step | Where | Time |
|---|---|---|
| `switch out --dry-run` | the probe | 5.1 s |
| `switch out --dry-run` | the copy (8 jobs, 3 lanes, layer 9, 211 messages) | 41.6 s |
| `switch in --preflight` | the probe / the copy | 2.5 s / 3.2 s |
| A lane session started and recorded | the copy, 5 starts on 6 Nov | 27 s to 2 min 23 s (median 48 s) |
| A job restarted | the copy, 3 restarts 17:22–17:24 | 20 s to 1 min 22 s apart |

The rehearsal found five defects, and each is fixed in this change:

- the manifest kept every task's prompt empty, because list_triggers keeps it under derived_state;
- a task that starts a fresh session each time was not marked as one;
- Bob's own task would have been switched off;
- the probe's manifest listed the copy's 8 jobs, because the account holds every product's sessions;
- switch out demanded every page of 1,800+ sessions, about 5 min.

A sixth defect is also fixed: switch in would have resent 211 messages one by one.

The real switch out and the role restarts on the probe were not run. The probe has no role sessions to restart, and starting them on the copy costs usage at "allowed_warning". The coordinator can order a live rehearsal on the probe.

## Downtime estimate

Downtime runs from the stop acts to jobs working again on the new account. The figures assume the canary passed, so Bob's step 2 is only the switch itself.

| Phase | Likely | Late |
|---|---|---|
| Lists saved, switch out (42 s), stop acts and job pushes | 12 min | 20 min |
| Bob between the accounts (canaried: connect, start the coordinator) | 10 min | 40 min (the environment's values re-entered, App or sharing missed) |
| Switch in and session checks | 3 min | 10 min |
| (a) The coordinator's id: one gate run per product | 15 min | 25 min |
| (b) Quiet tranche | 2 min | 5 min |
| (c) ROOT, BOB, the watcher, the MERGER (serial, about 1–2.5 min each) | 6 min | 12 min |
| (d)–(h) Tasks, 8 jobs, 3 lanes, about 10 messages (BOB and the coordinator in parallel) | 10 min | 20 min |
| **Total** | **about 1 h** | **about 2¼ h** |

The late figure is dominated by the uncanaried account settings, which the canary removes. The next largest cost is (a)'s gate run. 5 Nov's switch took 94 min with no job working at its end.
