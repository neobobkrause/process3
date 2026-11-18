# Codex shortcomings to fill

Length: 54 lines. Last section: "Things Codex has that the design does not yet use".

Written by Claude on 18 Nov 2026, from the harness separation work in `process4/working/harness_separation/`. Bob's instruction: "Where there are shortcoming in the Codex spec, just note those shortcomings so that my work using the OpenAI account can fill those in."

Each line below is something the Process4 design needs that no file in this repository shows for Codex. They are gaps in what is known or built. None is a finding that Codex cannot do it. Detail and sources are in `harness_separation/01_neutral_terms.md` and `harness_separation/02_rules_one_harness_keeps.md`.

## What holds a rule

- What carries Bob's standing approvals on Codex. On Claude Code it is CLAUDE.md.
- What carries the list of forbidden commands. On Claude Code it is settings.json.
- What stands in for the permission checker when work runs with nobody watching. On Claude Code it is Auto mode.
- The Codex grants study and proposal that Bob asked for on 16 and 17 Nov. No result is in this repository.

## Sessions

- Whether a role can be a session of its own that Bob can open. As tried on 17 Nov, every role was a child inside one chat that Bob opened, and starting a separately listed session from a hosted session was blocked.
- With roles as children of one chat: how "Bob starts ROOT", "at most three levels deep", "ROOT starts the watcher" and "Bob speaks to ARCH, lanes and PROCESS" are carried.
- Whether a job that is itself a child can start a helper of its own.
- How a model and effort are passed to a session that another session starts.
- Whether Codex has limits like the ones Claude Code's rules were built on: how long one thing can run, how many sessions can be live, and whether a session started by a scheduled wake can start others.

## Messages and wakes

- Whether a plain message wakes an idle child. A follow-up task to a child in the same chat does.
- How one chat reaches another chat's children. A second chat could not.
- Whether a scheduled wake reaches a child or only the chat Bob opened.
- How a running child is interrupted.
- How Bob is notified when he is away.

## Context

- A reading of how full a hosted session's context is, or a signal that it has compacted. Without one, a refresh at a stated fill level cannot be triggered, and only "at a natural pause in its work" can operate.
- The window a hosted session actually has. The documents give 272,000 and 500,000 tokens for the same model; neither was observed.
- The limit on instruction files on the hosted surface. The documented default is a 32 KiB budget shared by all of them.
- Measured maximums. The repository holds sizes shown to work once, on filler text. It holds no size at which reading was shown to fail, and nothing measured for a role's starting text or for the fill level.

## Secrets, accounts and state

- Where a secret value such as a deploy token is kept, and which sessions can read it.
- Which GitHub account a Codex session acts as.
- Where the shared state lives. The Codex trial keeps it in a local file; the sixth draft keeps it on GitHub. Bob told Codex to be careful about using GitHub as a communications channel.
- How a finished session is archived. It is documented, but the tools available in the trial had no way to do it.

## Not checkable from this repository

- The Codex trial's own code and evidence are in the trial repository (process3-probes), not here.
- The Codex register says Bob approved the layout with ROOT as a child of the chat he opened. His five files of Codex words do not hold those words.

## Things Codex has that the design does not yet use

- Renewing the sign-in about every 30 days, as an act of Bob's.
- Grouping sessions in a project (not verified).
