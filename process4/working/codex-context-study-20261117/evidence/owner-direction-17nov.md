# Owner direction: Codex Process4 context fidelity (17 November 2026)

**Status:** Verbatim owner direction from conversation, not an adopted rewrite of the sixth draft. This material is authoritative as the owner's words for the Codex context-fidelity investigation. It does not modify the existing Claude Code implementation, grants or Process4 adoption status.

## Owner's direct statement (verbatim)

> Given the documented context windows sizes, process4 should be designed and always run in GPT-6 or later models having context windows of 1m tokens or more.
>
> My Claude experience confirms that incomplete reading (scanning) to be a very significant danger that must be mitigated. The OpenAI limits and capacities you're describing are similar in scale to Claude's. As I've already mentioned, process4 has constructs meant to mitigate these and other context related dangers. So it's essential that Codex-based process4 utilize these process4 constructs.
>
> What I found in Claude, and is probably the case in ChatGPT, is that there's no reliable means of controlling the conditions that degrade context fidelity. As such, process4 defines specific limits on things like session handoff document sizes, session refresh requirements that rigorously eleminate the need for compaction, limits on the size and complexity of process4's principals of operation, the use of highly targeted and structured subagents to do research and complete tasks for the benefit of parents without clogging the parents' context window, and so on.
>
> I'm open to the addition of a canon authority map. The model must not mistake a local implementation decision for permission to violate a higher-level principle.
>
> I agree with your recommendation of using options A and C, along with other tactics already inherent in the process4 design like its session refresh strategy and others. It's worth mentioning that the charters of subagents often focuses on reading large document sets, but these workers are also sometimes tasked with making material decisions based on information they gather.
>
> I agree that a dedicated Process4 experiment should be run in a dedicated context-fidelity research session, separate from the ongoing development bootstrap, with a bounded experimental mandate, as you describe. I've started that session.
>
> I also agree that it's not necessarily the case that Codex needs exactly the same context rules as Claude. We need to investigate and fully consider the Codex environment as unique from that of Claude and develop a load-bearing understanding and strategy for it.

## Source pointers (not substitutes for reading)

- Process4 definition (sixth **draft**, not in force): `process4/definition/process4_definition_v6.md` in this repository's `process4` branch.
- Owner's earlier words and evidence: `process4/owner_words/`, `process4/evidence/` in this branch.
- Process principles and historical reading/refresh rules: `neobobkrause/neoprocess`, `PROCESS-DESIGN.md` and `SESSIONS.md`, branch `main`.
- Product canon registry (read-only): `believeinoakland/civicsmith2`, branch `tranche`, `requirements/README.md`.
- A separate ChatGPT-produced research report has been generated in the originating conversation as `process4_context_fidelity_research.md`. It was **not** automatically attached to the independent research session or committed with this owner-direction file. Treat its conclusions as research groundwork, not owner rulings.

## Preservation boundary

This captures only the verbatim owner message above, not all conversations or unpublished research. Additional owner decisions, implementation outcomes, and validation should be recorded separately with clear provenance. No authority to modify CivicSmith2 or the Claude Code implementation is implied.
