# Experimental protocol: Codex context capacity, complete reading and compaction avoidance

**Status:** Executable research specification, **not** a passed test, adopted Process4 policy, or permission expansion. Owner clarification: [compaction-avoidance direction](../owner_words/bob_words_17nov_compaction_avoidance.md). Research foundation: [context-fidelity study](codex-context-study-20261117/REPORT.md), [model-capacity discrepancy](codex-gpt6-context-window-investigation-20261117.md), [subscriptions](codex-subscription-context-pricing-20261117.md).

## Question and hard experimental boundaries

Can Process4 **reliably detect or conservatively preclude** contexts in which Codex might silently compact, truncate authoritative reading, or lose canon fidelity, while achieving useful, source-correct work for a reasonable token/time investment? What **actual context size** can one request and verify with an already authorized **subscription**, and on which actual execution surface?

Run only on disposable canon and probes, not CivicSmith2. Avoid metered API calls, paid infrastructure, credential inspection, auth retries, patched client catalogs and unapproved settings changes. Do not modify the installed Claude Code implementation or standing grants. No forced-compaction experiment in a session holding product authority. If experimental compaction cannot be observed safely, label it NOT TESTED rather than simulating a native event.

## Surfaces: never conflate

- **S1: Subscription-authenticated Codex CLI**, only if an already supported, authorized, functional login exists. Inspect read-only `/status` or supported app-server usage telemetry in a **fresh disposable session**. Never bootstrap a nested CLI with inaccessible/inherited credentials or perform re-login. Existing read-only CLI help/schema inspection alone is insufficient evidence.
- **S2: Native subscription-hosted Process4 child**, started with supported native collaboration/continuation tools in a disposable tree. Check actual child model ID, context denominator/numerator, compaction events and whether an **effective** per-child context override is supported. Do **not** send text `/compact` or `model_context_window=...` and claim that it changed the native runtime.
- **S3: Official published specs and pinned Codex source catalog**, used only to explain options/caps, not to certify S1 or S2.

S1 success does **not** establish S2 support. S2 without a context meter is INSTRUMENTATION UNKNOWN, not PASS. Explicitly report if hosted configuration must be changed by the owner, and whether the change affects only future sessions.

## Phase 0 — capability/usage receipts before any load

1. Identify running model from **actual runtime response**, not prompt self-identification. Record client/runtime version and subscription authentication surface without reading credentials; record provider model-catalog origin/refresh if supported.
2. Obtain actual session `selected/raw_context_window`, `max_context_window`, `usable_context_window`, `current-context-used`, `auto_compact_threshold`, `compaction_count/events` and whether values are live or stale. Record a missing field explicitly.
3. Obtain a supported session-specific indication of input/tool-history size or token usage; do **not** equate all-time token usage with active context occupancy.
4. Record the account's included usage meter **only where available without asking for secrets**; do not fabricate billing costs.

**Gate:** If effective context and compaction state are not observable, the agent cannot certify a percentage-based pre-compaction guarantee. Continue only with bounded disposable investigation of safe controls and declare production compaction avoidance **UNPROVEN**; do not run risky saturation.

## Phase 1 — test larger-window requests (isolated fresh disposable sessions)

For S1, where a supported config override is genuinely available, create otherwise equivalent new sessions with:
- **control:** no explicit `model_context_window` override;
- **500K requested**, and
- **1M requested**.

Keep the same available model, reasoning effort, minimal bounded test and subscription login. Use supported session-only `-c model_context_window=...` or equivalent ephemeral config. Do not modify system/global settings. Read session status **after first real inference** and, if supported, the actual model catalog chosen at that point. Record whether request is accepted, rejected, or silently clamped; distinguish raw versus usable; verify the compaction threshold separately.

For S2, repeat only **if a documented native control actually exists**. Otherwise mark REQUEST CONTROL UNAVAILABLE and separately report which future API/platform interface is needed. Never infer S2 from S1.

Where the 500K request resolves to 475K usable, state the 95% headroom explicitly; when 1M resolves to 828.4K, state the catalog cap. Neither implies 1M effective. No session should be filled up to its cap just to prove its configuration.

## Phase 2 — early warning and refresh without compaction

On isolated **measured** disposable sessions only:
1. Establish baseline current context and token change for bounded realistic work: initial read set, 1 task, N structured research workers, one parent decision and exact source confirmations.
2. Measure **increments**, not merely totals, including tool-output truncation. Note whether reported usage is a last-turn, conversation-scope, or compaction-scope counter.
3. At an observed **<=30% of the effective resolved window**, initiate checkpoint/handoff preparation for work expected to approach 40%. Refresh the parent at or before the owner's **40% guardrail**, with allowance for one whole bounded handoff and the largest expected response before threshold. Never execute a step projected to exceed that guardrail.
4. Compare before/after exact owner instructions, canon-scoped decisions, unfinished questions, pending messages, generation ownership, measured context, productivity and overhead.
5. Reject as NOT CERTIFIED any experiment where the chosen meter is absent, compaction occurs, the effective threshold shifts without detection, or a materially binding source is incompletely read.

For S2 with **no usage meter**, do not pretend to verify 30/40%. A conservative per-turn/source byte budget is a provisional damage-limiting device, **not** proof of never compacting; report this limitation openly.

## Phase 3 — full-read and fidelity controls

Reuse the independently stored, source-pinned hierarchical canon fixture from the prior research, add an unseen nontrivial task and a delegated **decision** worker with a strictly defined choice set and governing exceptions. The reader must report source revision, complete file/section coverage, expected vs delivered bytes/lines, truncation warnings and skipped segments. If tool output truncates, fail the read and re-read in bounded contiguous portions; do not silently accept a beginning/end excerpt. Require correct binding decisions and explicit abstention where source is unknown. Include an invalid higher-authority override trap and conflicting historical text.

Compare (i) fresh full-read, (ii) bounded targeted-worker packet with correct scope/references, and (iii) proactive fresh-session restoration. **Do not add a new product test stage**; these are runtime/process experiments on disposable canon.

## Phase 4 — productivity and cost

Report per surface/configuration:
- Work items and authority-sensitive decisions **correctly completed**; omission/conflict counts.
- Fresh-session startup, reading, delegation, execution and handoff latency; context headroom at checkpoints; failures/retries.
- Actual usage/credits if the subscription provides them; otherwise use explicitly **proxy** tool/token counts and avoid claiming billed cost.
- Time and token burden of rereading sources, handoffs and worker delegation; any remote Git state growth.
- The actual reduction in parent context ingress using workers and bounded evidence packets, without calling that reduction total inference savings.

Predeclare candidate success criteria based on measured results; do not invent thresholds after seeing outcomes. Aim to find the **smallest proven sufficient window** for repeatable correct work rather than maximizing the window.

## Acceptance and decision

**Pass** for a given surface requires: actual model/capacity/meter receipts, safe/observable 40%-or-earlier refresh and role continuity, no compaction before completed handoff, verified full-reading, clean authority-sensitive answers, and acceptable measured task productivity. State the exact window/model/surface for every PASS.

**Qualified/partial:** larger request works only in CLI, or source fidelity works but hosted child usage/compaction state unavailable. This is valuable evidence **but cannot certify production avoidance of silent compaction**.

**Fail/blocked:** no supported way to detect/preclude compaction or preserve required authority for a target native role; stop claiming readiness for that role, preserve evidence and investigate supported alternate runtime management. Do not weaken owner guardrails or introduce metered inference without approval.

## Reporting and repository discipline

Write one compact report plus raw machine-readable evidence for actual observations, with `OBSERVED`, `DOCUMENTED`, `INFERRED`, `NOT TESTED` separated. Pin tool/client/model/catalog versions and source commits. Integrate substantive findings once in `neobobkrause/process3` on `process4`; proof-specific implementation may use authorized `process3-probes` branches. No routine message/ACK/heartbeat Git traffic. Preserve the original Claude process and owner wording unchanged.

Suggested independent experimental role: **Codex context-limit/refresh probe worker**. The existing research session's completed scope need not be kept alive; create a fresh bounded worker or instruct the bootstrap's ARCH/PROCESS to commission it under established controls.
