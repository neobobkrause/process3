# Owner-created front-door cross-tree messaging test

**Status:** Owner-provided experimental result, recorded 17 November 2026. The original tester's direct tool transcript was not fetched here; observations below are sourced from the owner's pasted test report. Not an owner-approved change to Process4 architecture.

## Reported observed attempt

- Sender: an independent owner-created Codex chat.
- Intended target: existing Process4 logical PROCESS at native handle `/root/p4_root_g3/p4_process_g3`, belonging to a **different** owner console/agent tree.
- Attempted mechanism: `collaboration.followup_task` with the exact agreed read-only marker probe.
- Exact returned error: `live agent path /root/p4_root_g3/p4_process_g3 not found`.
- Outcome: no message delivery, processing acknowledgement, marker reply, idle wake, or second exchange.
- Other observation: app tools could inspect the other console by thread ID but exposed no sender operation from this independent chat. Another Dot test's transcript mentioned `cloud_threads.send_message`, but that tool was unavailable here and its cross-tree scope is unproved.

The previous standing bootstrap console **did** route an owner question to PROCESS in its own native tree; evidence: `neobobkrause/process3-probes` branch `codex/p4-grants-broker-20261116`, `bootstrap/native/INTERACTIVE-SESSIONS.md` and `bootstrap/evidence/interactive-sessions/actual-interactivity.json`.

## Interpretation and implications

- Native collaboration handles are **tree-scoped in the tested sender context**, so a manually created independent front door cannot simply use the earlier bootstrap's native agent path. This does not show whether that exact instance is still live in its original tree, or prove no platform-level cross-thread messaging interface could ever exist.
- Existing first-class-session creation research reached decision C for currently exposed subscription-hosted tools; the Dot pilot did not yield the intended native Codex task. A separate owner-created front door is **not a demonstrated workaround**.
- Avoid recurring tests with the same tool surfaces, speculative login/credential repairs, metered Agents API, or high-frequency GitHub relay. Existing implementation and evidence remain valuable but do not satisfy independent first-class owner-visible roles.
- Reopen the architectural feasibility issue only on **new supported capability evidence** (e.g., officially exposed same-account cloud thread creation and by-ID add-turn available to hosted agents, or a tested Dot/other first-party route that both appears in the ordinary Codex session list and supports cross-session messaging).
- An owner decision to accept a single-console/subagent UI architecture would be a **change of essential UX requirement**, not a passing result for the original specification.

**References:** https://github.com/neobobkrause/process3/blob/process4/process4/working/codex-first-class-feasibility-20261117.md and https://github.com/neobobkrause/process3/blob/process4/process4/working/dot-versus-owner-front-door-feasibility-20261117.md.
