# Codex Process4: context-fidelity research handoff

**Status:** Research outline and source-navigation aid, **not** a completed empirical study or owner-approved process definition. Read the verbatim 17 November owner direction at `../owner_words/bob_words_17nov_codex_context.md` first.

## Exact public repositories and branches

- Process4 research: https://github.com/neobobkrause/process3/tree/process4/process4
  - Sixth draft: https://github.com/neobobkrause/process3/blob/process4/process4/definition/process4_definition_v6.md
  - Earlier evidence: https://github.com/neobobkrause/process3/tree/process4/process4/evidence
- CivicSmith2: **believeinoakland/civicsmith2**, not neobobkrause/civicsmith2.
  - Canon registry: https://github.com/believeinoakland/civicsmith2/blob/tranche/requirements/README.md
  - Module requirements conventions: https://github.com/believeinoakland/civicsmith2/blob/tranche/build/requirements/README.md
- Earlier process principles: https://github.com/neobobkrause/neoprocess/blob/main/PROCESS-DESIGN.md
  - Session/reading sets: https://github.com/neobobkrause/neoprocess/blob/main/SESSIONS.md
- Native Codex implementation: https://github.com/neobobkrause/process3-probes/tree/codex/p4-grants-broker-20261116/bootstrap

`process4` is a **branch/folder of neobobkrause/process3**, not a separate repository. Avoid rewriting 404s into a conclusion that the source is unavailable. These repositories are public; if one GitHub connector lacks a repository installation, distinguish connector authorization failure from public existence and try supported read-only public GitHub/HTTPS access. Do not request another private token or broader grants to read public material.

## Research responsibilities

1. Verify the actual GPT-6-or-later model and **effective >=1M context window** exposed by the subscription-hosted native sessions. Published API model limits are not proof of hosted capacity.
2. Measure where required documents can be truncated: `AGENTS.md` auto-loading budget, tool-output limits, skills/catalog limits, read transports and token/context metrics.
3. Demonstrate **complete reading, never scanning** with bounded, enumerated reading sets; record file revisions, expected and delivered byte/line counts, and any unobserved portions. A successful command exit is not evidence that complete text entered context.
4. Investigate automatic compaction timing and whether an early, deliberate refresh can avoid ever reaching compaction. The owner prefers **proactive session refresh, not compaction as the normal strategy**.
5. Compare fresh-session recovery, context compaction, and targeted workers using an intentionally hierarchical canon with exceptions, superseded historical text, and decisions at different authority levels. Score actual canon compliance, not claimed understanding.
6. Study existing Process4 limits on handoff length, rulebooks, modules, and worker briefs before adding new constructs. Workers may hold delegated **material decision authority**, not just extract facts; their decisions need provenance, scope and applicable governing context.
7. Evaluate a canon-authority map that identifies source precedence and scope without becoming a substitute summary for full reading.
8. Verify inactive chat archive, transcript retrieval and unarchive, and separately test support for native subagents. Completed short-scope workers do **not** need to stay alive after assignment completion.

## Source vs platform evidence

The assistant-generated standalone Markdown research report in the originating chat, named `process4_context_fidelity_research.md`, is not automatically present in an independent session's workspace. The owner can attach it if necessary. Do not claim to have read it unless supplied.

OpenAI documentation starting points (verify current contents):
- https://developers.openai.com/api/docs/models
- https://learn.chatgpt.com/docs/config-file/config-reference
- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://learn.chatgpt.com/docs/hooks
- https://learn.chatgpt.com/docs/developer-commands
- https://learn.chatgpt.com/docs/agent-configuration/subagents

All output belongs to experimental process research, not product development: do not change CivicSmith2, `main`, owner grants or any existing Claude Code runtime/configuration.
