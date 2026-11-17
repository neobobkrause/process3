# Codex subscription context windows: plan, override and usage research

17 November 2026. **Status: research evidence / assistant analysis, not governing Process4 policy or an owner's new decision.** Supplement to [GPT-6 context-window investigation](codex-gpt6-context-window-investigation-20261117.md). The owner's GPT-6+ / **verified effective >=1 million token** requirement is unchanged and remains unverified for native child sessions.

## A. Does the subscription tier affect effective context-window size?

**Official evidence:** https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex says GPT-6.1 Sol's default is **500,000 tokens in Codex and ChatGPT Work**, and model availability depends on plan, workspace settings and rollout. https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers and https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex document different allowances by plan; they do **not** give a tier-by-tier GPT-6.1 Sol context-window entitlement table.

**Inference only:** observed client/account/catalog variation makes different effective windows across deployments plausible, but no reliable official evidence establishes Plus=272K/Pro=500K, that Pro always has a larger context, or that upgrading guarantees 1M.

## B. Can a subscription session request 500K or 1M?

The **Codex CLI** config option `model_context_window` is documented: https://learn.chatgpt.com/docs/config-file/config-reference. Subscription-authenticated CLI users can request `model_context_window = 500000` or `1000000`; requests are subject to the catalog maximum and effective context factor. The public real-world reproduction https://github.com/openai/codex/issues/47805 requested 1M through ChatGPT sign-in and observed an **828,400-token effective** limit after 872K catalog cap * 95%. There is no demonstrated supported context override, compaction control or usage meter for current subscription-hosted **native Process4 child sessions**. CLI settings cannot be assumed to configure unrelated hosted children.

In a known 272K-default/872K-max/95%-usable catalog, 500K requested -> 475K usable, 800K -> 760K usable, 1M requested -> 828.4K usable. The **500K product default** is not guaranteed to share the particular 272K fallback catalog; these are illustrative/runtime-observed variants, not all user's sessions.

## C. Extra billing versus subscription allowance

**Explicit official statement:** https://developers.openai.com/api/docs/models/gpt-6.1-sol states "**Usage drawn from your subscription has no long-context surcharge**." https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex repeats no additional long-context surcharge for subscription-covered GPT-6.1 Sol. Thus asking for a larger window does **not by itself** create a long-context fee within included subscription usage.

**However** https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan and https://help.openai.com/en/articles/20001625-understanding-chatgpt-and-codex-usage-limits say usage depends on model, context, task, reasoning, tools and token processing. A larger available window by itself need not process more tokens; **actually filling and repeatedly processing longer context can exhaust included allowances sooner**. Depending on plan and usage controls, exhausted allowances can lead to waiting/reset, upgrade, or spending additional purchased credits. Do not automatically authorize credit purchases or assume the owner's subscription-funded/no-extra-cost condition permits them.

**Separate API**: https://developers.openai.com/api/docs/models/gpt-6.1-sol states API requests with >272K input tokens are billed **2x input/cache and 1.5x output for the whole request**; API calls are **separately billed**, and that surcharge cannot be imported into subscription-funded Codex claims. No per-token API inference is authorized for Process4.

## Implication

Do not confuse (1) model API total 1.05M, (2) selected Codex catalog raw window, (3) usable window and compaction threshold, (4) subscription allowance and (5) API billing. Verify actual hosted model/capacity through a supported session-specific receipt. Until then owner-mandated >=1M is **not certified**, even with Pro or a CLI request. Retain proactive refresh and canon reading protections regardless of capacity.
