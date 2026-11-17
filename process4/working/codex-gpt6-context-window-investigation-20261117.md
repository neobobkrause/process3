# Why published GPT-6 1.05M context differs from Codex observed windows

**17 November 2026. Status: assistant external research, not an adopted Process4 rule or an owner decision.** This note records sources and findings for independent validation. It does **not** establish the model/window of the subscription-hosted Process4 child sessions. Do not use the API merely to meet an owner's subscription-only runtime constraint.

## Short answer

The 1,050,000-token number is an **API model capability**, whereas Codex/ChatGPT Work has **product-specific context settings** and sometimes uses an account/client-specific server-delivered model catalog. OpenAI currently explicitly documents **500,000 as the default Codex/Work context for GPT-6.1 Sol**, while separately advertising its **1,050,000 API context** in the **same model page**. Codex applies a catalog maximum to requested context, a 95% usable-context factor, and an ordinarily 90%-of-raw automatic compaction threshold. Real issue reproductions show smaller runtime limits (258,400; 475,000; 828,400) and catalog-origin/cache inconsistencies. The exact reasons for every product/rollout cap and the particular hosted Process4 child capacity are not publicly established.

## Official published statements

1. https://developers.openai.com/api/docs/models/gpt-6.1-sol — 1,050,000 context; 128,000 maximum output; **500K default in Codex and ChatGPT Work**. The API page states separately that API prompts above 272K have a higher rate, but that is not the Codex default.
2. https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex and https://learn.chatgpt.com/docs/models — Codex and Work are separate product surfaces; **GPT-6.1 Sol defaults to 500,000**, availability depends on workspace/rollout. Subscription usage is not the same billing path as per-token API usage.
3. https://learn.chatgpt.com/docs/config-file/config-reference — Codex config keys `model_context_window`, `model_auto_compact_token_limit`, `model_post_turn_compact_threshold_percent`, etc. Documentation for an override does NOT guarantee that a provider/model catalog will honor its requested size.

## Verified open-source Codex mechanism

At https://github.com/openai/codex/blob/main/codex-rs/models-manager/src/model_info.rs the function `with_config_overrides` resolves an explicitly requested context as `min(requested_context_window, max_context_window)` when a catalog maximum is present. This is a **silent clamp** in the inspected code path.

At https://github.com/openai/codex/blob/main/codex-rs/protocol/src/openai_models.rs the `ModelInfo` methods `usable_context_window` and `auto_compact_token_limit` derive respectively `raw * effective_context_window_percent / 100` and `min(configured_limit, raw * 90% )` when a raw model window is known. Common catalog values report 95% usable.

An illustrative catalog entry `context_window=272000`, `max_context_window=872000`, `effective_context_window_percent=95` yields:
- No override: 258,400 usable; ordinary auto compaction 244,800.
- 500,000 override: 475,000 usable; ordinary auto compaction 450,000.
- 1,000,000 override: **clamped raw to 872,000**, 828,400 usable; compaction limited to 784,800 even if user requests 900,000.

This arithmetic is a source-grounded description of Codex client resolution, not proof of the backend model's physical maximum. The 872K catalog cap is not justified by public source; although 1,000,000 minus 128,000 equals 872,000, that numerical coincidence is **not evidence** of an output-reservation policy, particularly because API spec says 1,050,000 total.

## Public runtime reproductions (third-party issue reports, not OpenAI's confirmed root-cause statements)

- https://github.com/openai/codex/issues/47805 — GPT-6 Sol CLI, requested 1M, runtime `token_count.info.model_context_window=828400`. Changing requested to 800K yielded 760K, matching client clamp.
- https://github.com/openai/codex/issues/41325 — in a GPT-5.6 Sol case a researcher raised the *bundled* max in a rebuilt CLI, but ChatGPT-authenticated runtime still had 828,400; compatible with the **remote catalog overriding bundled settings**. Cross-model mechanism corroboration, not a direct GPT-6 production proof.
- https://github.com/openai/codex/issues/59022 — reported GPT-6.1 Sol default changed server-side around 11 Oct 2026 from 272K to 500K, with effective 258.4K to 475K.
- https://github.com/openai/codex/issues/53336 — same model, same session/process reportedly fell from 475K to 258.4K between turns, with a 500K-versus-272K catalog/cache reload investigation and controlled server catalog variations by client `originator` and account. **This does not prove the exact rollout logic**.
- https://github.com/openai/codex/issues/33593 — controlled reports of different server model catalogs keyed to client originator, written to a shared cache that can oscillate.
- https://github.com/openai/codex/issues/53584 — GPT-6 Astra reports of actual compaction near 500K *displayed* despite an internal threshold 784,800: the internal compaction counter differed materially from most recent displayed usage. This is a **distinct accounting/visibility problem**, not proof the configured threshold was 500K.

The public issue reports make the mechanics and discrepancy credible and reproducible, but their complete findings have not been independently reproduced by us in the exact Process4 hosted environment. They do not constitute an official OpenAI support resolution.

## Four different numbers must never be conflated

1. **Model API capability:** 1,050,000 total tokens.
2. **Product/catalog raw default or override maximum:** e.g. 272K, 500K, or 872K. May depend on remote model metadata, client originator, account, rollout, and cache.
3. **Usable context as reported by Codex runtime:** e.g. 258,400, 475,000, 828,400 after 95% headroom.
4. **Automatic-compaction threshold and actual counting basis:** usually 90% of selected raw window, with separate instrumentation/accounting caveats. A displayed latest-turn count does not necessarily equal the internal compaction-scope count.

The hosted native Process4 child control surface currently exposes no verified live model identifier, context numerator/denominator, compaction event or context override to the bootstrap. API/CLI documentation and issue evidence cannot substitute for that missing receipt.

## Implications and recommended policy for Process4

- The owner's explicit **GPT-6+ with verified effective >=1,000,000 tokens** requirement remains **unmet/unverified** by the available native hosted telemetry. Do not silently interpret a GPT-6 brand name or 1.05M API specification as compliance.
- Do not assume that `model_context_window=1000000` in a Codex config will be honored; verify **post-first-turn** runtime value from a supported exposed surface when possible. Do not patch client catalogs, inspect credentials, or introduce metered inference as a workaround.
- Proactively preserve and refresh bounded role sessions and force complete source reading; no reliance on model compaction for normative canon fidelity. When actual usage is unavailable, use explicitly provisional conservative task/source budgets rather than guessed percentages, and report the inability to guarantee the requested window.
- Continue independent process design and research under existing grants. Treat inability to verify the required million-token hosted session as an **acceptance blocker for claiming full owner-required Codex configuration**, not as permission to stop unrelated work or weaken the threshold.
- Request from OpenAI/support a supported capability receipt for actual hosted child `model_id`, `selected_context_window`, `usable_context_window`, `max_context_window`, `auto_compact_threshold` and an observable refresh/compaction signal, and clarification of the 500K default versus API 1.05M and the 872K catalog cap.

**Evidence limitation:** This report does not assert that current hosted children are at 272K or 500K or 872K. It establishes why those different numbers are possible and points to public real-world cases. The product's internal rollout/entitlement rules and precise back-end rationale are not disclosed in reviewed sources.
