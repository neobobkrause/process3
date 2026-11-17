# Owner direction: preventing Codex context-fidelity failures (17 November 2026)

**Status:** Exact owner wording followed by separately identified assistant analysis. Later, more specific clarification supersedes the older assumption that a verified one-million-token context window is the fundamental acceptance condition. No governing Process4 definition or Claude Code implementation is changed by preserving these words.

## Direct owner statement — verbatim

> Process4 is architected around the reality that every all software, even AIs, have shortcomings that must be mitigated. Whereas I often see software trying to "recover" from shortcomings, I find that the most effective means of mitigation is to avoid situations when the shortcomings become a factor. But a fundamental requirement of this approach is to identify (or sense), either at runtime or when coding, when the shortcoming is about to come into play. If a Codex-based process4 is even a possibility requires that we be able to avoid compaction entirely, because any work that happens after an unrecognized compaction could cause (silent) damage that difficult/impossible to recover from.
>
> In that light, process4 sessions don't require 1m tokens. What they require is sufficient token to perform enough useful - and correct! - work to justify the investment of time and tokens, all while protecting development from damage caused by things like document scanning, compaction, and other context management shortcomings. That is our challenge.
>
> This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more. What we need to do rigorously while we're exploring a Codex-based process4 version is identify those conditions and limits that will provide the assurances we need to productive work at a reasonable investment of time and tokens.
>
> We should set up a test to confirm those aspects of Codex related to contexts that we don't yet have, like our ability to obtain larger context windows upon request, etc.

## Assistant's implementation reading — not owner words

- The earlier absolute >=1,000,000-token requirement is superseded by a **sufficient verified context for useful, correct work**, with robust avoidance of unrecognized compaction and incomplete reading.
- **No production-authoritative work may knowingly continue after compaction or when the system cannot reliably tell whether its refresh-before-compaction operating discipline holds.** How this is enforceable with limited native hosted telemetry is a critical research question, not already solved.
- A 40% context threshold is the confirmed conservative refresh policy/direction from the owner's text; investigate role-specific early checkpoint lead time and whether 40% of a measured resolved window guarantees time to complete a bounded handoff before any compaction trigger. Never infer percent from cumulative billing tokens.
- Session replacement does not absolve the need for complete canonical reading, source version checks, and protection against truncated tool outputs.
- Efficiency is an explicit criterion: useful/correct work completed, source/decision compliance, session setup/refresh overhead, model/tool usage and ongoing state growth. A huge window with unknown telemetry is not automatically better.
- The first experiment should use disposable, source-grounded fixtures; it should determine supported context selection and runtime receipts across subscription-authenticated CLI and **native hosted child** surfaces without pretending those are the same thing.
- Continue only within subscription-funded tools and existing grants. Do not silently force compaction in any session holding authoritative product state, and do not modify CivicSmith2.
