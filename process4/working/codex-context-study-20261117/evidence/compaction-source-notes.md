# Public harness compaction source notes

Scope: whole-file inspection of `compact_remote_v2_installation.rs` (330 lines, read in two bounded chunks) and `compact_token_budget.rs` (76 lines, one chunk), supplied as public OpenAI harness commit `595f497f15a3e3239a62f6b99cf61067df00f0d0`. No claim this commit matches the native deployment. These are source observations, not execution measurements.

## V2 replacement and context reconstruction

The installer passes prompt input, prompt metadata, and compaction output into `build_v2_compacted_history`, together with feature settings, an enabled/disabled retained-image budget, and an audio snapshot (`compact_remote_v2_installation.rs:212–223`). Thus replacement is constructed from multiple inputs, not visibly just an appended summary. The exact messages/images/audio retained are determined by the called builder, whose implementation is outside these two files. The returned retained-image count is recorded after successful installation (`:295`).

Prepared-prefix installation builds initial context against the candidate's cutoff world state, splits prefix updates, merges world-state updates, and supplies the resulting context, prefix, model information, and world-state reset section IDs to `replace_compacted_history` (`:225–254`). This is explicit context reconstruction/reinjection at the call site. The file header says the replacement primitive validates prepared prefixes before mutation (`:3`); that validation implementation and the precise preservation of the live suffix are outside these files. The comment at `:54–55` explicitly recognizes that a live suffix can leave an adopted prefix over budget.

Foreground installation instead calls `build_compaction_replacement_history` with the replacement step context, world state, and compacted history, then installs its returned history and world-state baseline plus turn-context item (`:256–284`). This establishes a reconstruction and replacement path; it does not expose the helper's exact reinjected instructions, their priority, or their placement. Installation metadata includes window IDs, compaction response ID, compaction model hash and reviewer hash (`:263–272`). Successful installation records relevant analytics, optionally records input/replacement trace histories, recomputes token usage, and completes the compaction item (`:286–312`).

## Branches and fallback

- A prepared candidate whose model slug or compaction hash differs is rejected before proceeding (`compact_remote_v2_installation.rs:92–97`). A successfully installed candidate returns immediately when the replacement context is below its token limit; otherwise it attempts the foreground path once. Rejection with `CompactionFallback::Skip` returns false; otherwise foreground is attempted (`:30–76`). The explicit Skip branch applies to rejection, not to a successful-but-still-over-budget installation.
- Foreground calls `run_remote_compact_v2_attempt`; an error may retry using the replacement/current model only if `should_retry_with_current_model` permits it (`:133–172`). Fallback success is used; a terminal fallback error is returned, while a nonterminal fallback error returns the original error (`:173–194`). The retry predicate itself is outside these files.
- A false installation result returns false before successful-install analytics and completion (`:286–312`). At the outer level, foreground errors propagate even if a prefix was installed earlier (`:73–76`). These files do not establish rollback behavior.
- Legacy guardian mode resolves the continuing turn's reviewer using captured current model information and returns its compaction hash; other cases return none (`:315–330`).

## Token-budget branch

Manual and inline automatic entry points share a lifecycle and differ in the trigger they pass (`compact_token_budget.rs:16–40`). Comments explicitly say this branch skips model/server summarization and installs a fresh context window. The implementation runs pre-hooks, aborts on a stopped pre-hook, starts a compaction item, calls `start_new_context_window` with step context and world state without a remote request, completes the item, then runs post-hooks and may abort on a stopped post-hook (`:48–75`). A stopped post-hook occurs after the reset/completion calls. The contents of that fresh window and what it retains/reinjects require inspecting `start_new_context_window`; this file alone does not show them.

## Limits

These two files cannot establish deployed ChatGPT/Codex behavior, actual branch selection or feature flags, compaction trigger thresholds, server summarization semantics or prompts, summary accuracy, exact text retained/reinjected, external file preservation, retrieval behavior, context-window size, billing, observed latency, or whether any native compaction occurred in this study. Their helpers and tests were not inspected in this followup. A `ContextCompaction` lifecycle item alone does not prove model summarization: the token-budget branch emits the same lifecycle while explicitly skipping it. The earlier lossy-handoff fixture remains a simulation, not a native compaction experiment.
