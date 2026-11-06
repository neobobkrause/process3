# Records that carry a condition or can go stale (R13)

Bob, 6 Nov, about 17:00Z: "Go with option 2, fix it in the tool, not just for this case, but fix process3 to anticipate and address these kinds of situations." Recorded state carries a checkable end condition; the tool ends it when the condition holds; stale state is found and cleared by the process, not by hand (Foundations, Bob's, 6 Nov). The code: `tool/lib/ends.mjs` (conditions), `tool/lib/expire.mjs` (stale records found and ended), `tool/lib/hold.mjs` (holds).

| Record (state branch unless said) | Its end condition | The tool can check it | How it ends |
|---|---|---|---|
| Hold (`holds/holds.jsonl`) | its PRs land (`--prs`), a condition (`--when`), or its time (`--until`); words alone are refused | yes | the tool writes its end row, by `process3`, naming the condition, after any act that writes, at layer open and at the sweep; status shows it holding nothing at once |
| Hold from before conditions (free text) | "until layer <n> closes / opens", read from its words where plain | yes, when plain | as above, the end row marked read from its words; words that say something follows ("after it", "then", "pauses") are not read and are reported by id until their `--until` time |
| Starts owed (`flow/owed.json`) | a start made after it | yes | paid by `job start --ready` (already) |
| Reschedule (`layerflow/<n>/reschedule`) | the user's land holds the provider's land | yes | answered by the land (already, `outstanding`) |
| Layer events (`layerflow/<n>`) | open ends when the layer merges | yes | `layer merge` writes merged (already) |
| Layer close (`layers/closed.jsonl`) | none: a fact | — | — |
| Lane seat (`lanes/sessions.jsonl`) | its session is archived | yes, with list_sessions | the sweep (which reads list_sessions) writes its end row, by `process3`; a session the list does not hold is unknown, never gone |
| Lane ask (`lanes/asks.jsonl`) | a recorded decision | yes | `lane ask --record` (already); one whose lane is no longer configured is reported |
| Triage owed (`notices/triage/owed`) | the triage recorded | yes | `notice triage` (already) |
| Role address (`addresses/<role>.json`) | its session archived | yes, with list_sessions | reported: a role's next session is named by handover or `address`, which the sweep's own steps start |
| Coordinator id (`process/config.json`) | its session archived | yes, with list_sessions | reported: the config changes by pull request |
| BLOCKED mark (ledger entry) | a person's ruling | no | reported with its age (status, already) |
| Deferral at a layer close (`layers/closed.jsonl` deferred) | its module's next job | yes | the job's start carries it (already) |
| Merger lease, in flight, plain queue (`merger/`) | their expiry time | yes | time-limited (already); the train is being removed |

Seen on the copy, 6 Nov: hold-19 to hold-22 ("until layer 6 closes … ends when the coordinator says") end by `layer_closed:6`, read from their words. hold-18 ("until layer 6 closes start only layer 6 work; after it product work pauses for the layer-branch pin") is not read: its words say something follows the close, so it holds until its time, 7 Nov 00:15Z, and is reported. hold-23 and hold-24 name no condition the tool reads; they hold until their time, 7 Nov 03:08Z and 03:49Z.
