Length: @@ lines. Last section: "8. What this part could not source".

# Background, part 1: why Process4 exists, the owner and the AI

This part gives the reasons and the evidence behind the design's part 1. It states no rule. The rules are in `process4/definition/process4_definition_v7/01-purpose-owner-and-decisions.md`.

## 1. The process before this one, and how it ended

Process4 replaces Process3, which built one product from 3 to 9 Nov 2026. What its record shows, and where each figure is written:

| What happened | Figure | Where it is recorded |
|---|---|---|
| The one tranche never closed | "The tranche never closed, so no tranche report was written" | `working/k_evidence.md`, line 221; the owner's words below |
| No walk of either kind finished without flaws | None | The sixth draft, `definition/process4_definition_v6.md`, lines 13 and 275, marked measured there |
| No version was released | None | `evidence/review.txt`, line 325: "There was no released version" |
| The process's bookkeeping outgrew the product's work | 12,881 of 18,295 commits (70 percent) were on the branch that held the process's own records | `evidence/product_side.md`, lines 23 and 70 |
| Sessions changed the process as they went | 270 of 296 merges into the process's working branch were made by the sessions' accounts, 26 by the owner | `working/enforcement_levers.md`, line 31 |
| Those changes kept adding checks | A review counted 123 of 302 merges (41 percent) as adding a check, a gate, a refusal or a hold. A later check of a sample of 118 called that "roughly right", and counted by script that 132 of 294 merges (45 percent) raised the number of places where the tool could fail a job | `evidence/verify_numbers.md`, section 6 |
| The rate did not fall when the owner told sessions to stop | 41 percent before and after his instruction of 5 Nov | `working/trial_plan_facts.md`, line 253. That file says the table behind the count is lost |
| The product was moved to a changed process again and again | 116 times from 1 to 9 Nov | `evidence/product_side.md`, lines 30 and 82 |

The owner's own account, typed on 14 Nov (`owner_words/bob_words_14nov_b.md`): "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish."

That is his judgment of the cause. The record supports the growth. It does not prove that growth was the only cause. An audit of the sixth draft found other reasons a walk failed in Process3 that would come back in a process that does not grow: the walker's own machinery, the data on the deployment, and a browser that died (`working/audit2_corruption.md`, line 118). So whether a process that adds no tests can finish a tranche is unknown. Nothing has measured it.

## 2. Why the purpose is stated as one output

The design gives Process4 one output (design part 1, section 1). The wording comes from the owner's Foundations for Process3, which a session recomposed from his own document on 5 Nov. As `evidence/foundations_tranche_9nov.md`, line 32, has it: "Nothing else is output: a rule, a record, a check or a test has value only as far as it serves that, and one that does not is wrong." That file is a session's export of his document, not his typed words.

The reason is the table above. In Process3 the records and checks became most of the work. Further counts say the same:

- 105 of 508 merges into the product changed nothing but the process's job records (`evidence/audit_A.md`, line 58, citing `evidence/product_side.md`, section 2).
- A session's audit of 1,187 test runs on 207 job pull requests, from 3 to 5 Nov, found 113 failed (9.5 percent), and that "74% went green with no change to job code or tests" (`working/k_evidence.md`, line 41). The audit document itself is not in the repository; the figures come through the coordinator's log.

## 3. Why technical matters are the AI's and the product is the owner's

The owner set this himself. His working rules for sessions, typed on 14 Nov and kept in `owner_words/bob_words_14nov_b.md`, include:

- "Decide technical matters yourself and tell me what you decided. Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation."
- "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen. I have not read your working files."
- "Do not assure me that something will work. Say what is proven and what is not."

He repeated the first on the same day, answering a list of open technical points in the fourth draft (`owner_words/bob_words_14nov_c.md`): "Many of the questions asked in section M of v4 are technical and highly detailed. You're better qualified than I am to answer many of these questions."

And on 15 Nov (`owner_words/bob_words_15nov_main.md`): "You're talking as I know everything you know and have been following every session has said in detail. I have not. If there things I need to know, please walk me through them in an organized fashion using words and providing context so that I understand what's being said."

Process3's record shows what the other way cost. An audit counted 22 waits for the owner. In 12 of them work was possible while the sessions waited, and 16 ended only when he acted (`evidence/audit_D_central.md`, line 444). One question that sessions treated as his waited about nine hours on 5 Nov; the audit's judgment was that "it was a technical decision within his design" (the same file, lines 55 and 160; the chain of events is in `evidence/causal_forensics.md`, line 189).

What is not known: how often a session under Process4 will take a product question for a technical one. Nothing measures it.

## 4. Why work is meant to go on without him

The owner's words to the Codex session of 16 and 17 Nov (`owner_words/bob_words_16_17nov_codex_development.md`, which is a selection of extracts made by an assistant, not a full transcript):

- "Only bring problems to me when they're the proper level of issues that I need to be involved with."
- "Why have you stopped? (That's a real question.)"
- "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?"

From Process3: with no event to prompt it, the directing session once noticed a finished job after 194 minutes (measured 2 Nov; `evidence/foundations.md`, line 128). The design answers with a message at each completion and a slot refilled in the same turn (design part 2, section 3). Whether that holds is unproven; the trial rehearses it (design part 10, section 4, item 3).

## 5. The owner's acts

The list of his acts is in design part 1, section 3. Three things lie behind it.

**He enters no commands.** The record of 13 Nov, as the fourth draft quotes it (`definition/process4_definition_v4.md`, line 50; a session's record, not his typed words): "You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules." On 14 Nov he answered "agreed" to the fourth draft's twelfth proposal, headed "Three acts of yours beyond settings changes" (`owner_words/bob_words_14nov_c.md`). This writer read only that proposal's heading, not its text.

**Some acts can only be his.** Why each start-up act cannot be a session's is in part 9 of this background, with its source.

**Two entries in the design's list are Claude's, not his.** The design marks as "Claude decided" that he starts ROOT after each edit to his approvals and when the harness's limit on depth is near. The evidence behind the first is in part 9 of this background (each of his five edits in Process3 stopped every long-lived session). The second follows from the watcher's takeover (part 5 of this background).

One act has no carrier named: connecting an AI account to the development deployment before an external walk of journeys that use AI. Design part 9, section 3, lists what carries it as not known. The owner's related words, answering the fifth draft on 14 Nov (`owner_words/bob_words_14nov_c.md`): "A tranche can end without an AI enabled run". Whether a tranche can end with such a journey unwalked is listed as open with him (design part 10, section 1, item 9).

Where his approvals live, and the wording he would commit, were still owed when the earlier form of this background was written. Both are now in the design: where they live is marked "Claude decided", and the wording is marked open with the owner (design part 6, section 2). The grounds are in part 9 of this background.

## 6. How problems are handled

The design's working principles (design part 1, section 6) come from two places.

The first is the owner's direction of 2 Nov for Process3, as his Foundations record it (`evidence/foundations_tranche_9nov.md`, line 44; a session's record of his direction): "caution is a cost, paid only against a measured failure or your word", "a workaround for the moment is not a fix", and that every problem is an architecture bug corrected "by rewriting the line it belongs to, never by appending".

The second is the review session of 18 Nov, where, as the design state records (`working/design_state_18nov.md`, section 12, in Claude's words), he ruled that every problem is either an architecture bug or an implementation error. No file of his typed words holds that ruling: `process4/owner_words/` ends at 17 Nov. What each of the two terms means, and how an architecture bug is corrected, the design marks as a reading he has not confirmed.

Where that principle sat in Process3 is measured (`evidence/verify_numbers.md`, section 7). From 3 Nov the sentence opened the starting text of the roles that built the product. It was in nothing that the coordinator, or the sessions that built the process's tool, were told to load, and those were the sessions that made the process changes. None of the coordinator's 26 handover notes cited it, and 3 lines of its 1,302-line log did. So the principle was written down, and was absent where the decisions to add checks were made.

## 7. The known weaknesses of AI sessions

The design lists nine weaknesses, each with a sign and a response (design part 1, section 7). The design marks the list "Claude decided". The approach is the owner's. His words of 17 Nov (`owner_words/bob_words_17nov_compaction_avoidance.md`):

> Process4 is architected around the reality that every all software, even AIs, have shortcomings that must be mitigated. Whereas I often see software trying to "recover" from shortcomings, I find that the most effective means of mitigation is to avoid situations when the shortcomings become a factor. But a fundamental requirement of this approach is to identify (or sense), either at runtime or when coding, when the shortcoming is about to come into play.

What is recorded for each weakness, and what is not:

| Weakness in the design's list | What is recorded | Where | Not known |
|---|---|---|---|
| A full context loses what was read | The owner, of Claude: "If it's context window exceeded 75% it would "garbage collect"". In Process3, sessions were refreshed 5 to 23 points past the level the tool printed | `owner_words/bob_words_16_17nov_codex_development.md`; `working/process3_limits_18nov.md`, section 6 | No record measures what a compaction did to the work that followed |
| A long text is scanned, not read | The owner: "Claude would silently scan documents rather than read them in full". In Process3 "one worker given 108 modules judged only part of them". In the first measurement of 18 Nov, 3 of 128 scored readers searched for answers in place of reading, and all 3 scored full marks | The same owner file; `working/process3_limits_18nov.md`, section 4; `working/reading_measurements/RESULTS.md`, sections 3, 4 and 6 | The size at which this begins. Part 6 of this background |
| A claim is made that was not checked | On 8 Nov Process3's stored report of the internal walk had all 238 steps marked ok with 63 failures listed | Sixth draft, line 275 | How often |
| Conversation is taken as a decision | Lines the owner had not typed reached the drafts as his. Part 7 of this background | Fourth draft, lines 44 to 46 | How often |
| Caution grows the process | The 41 percent of section 1. Process3's own governing texts held 209 sentences that call for a check and 8 that call for restraint | `evidence/causal_forensics.md`, line 339 | Whether a rule in text stops it. In Process3 text did not |
| A refusal is worked around | A session that wrote the owner's relayed approvals into a loaded file was refused 2 of 2. No count of harm done by rewording a refused act was found | `evidence/permissions_inventory.md`, as cited in `working/design_work_18nov/owner_acts_and_approvals.md`, section 2 | Whether rewording did harm in Process3 |
| A successor acts from memory it does not have | In the Codex study of 17 Nov, a helper answering from a short, misleading handover alone got 2 of 16 right; after reloading the sources, 15 of 16 by exact match. The owner, of a long-running session: "we need to be realistic about the risks of continuing to rely on compacted sessions" | `working/harness_separation/03_codex_maximums_figures.md`, section 4; `owner_words/bob_words_17nov_fresh_context_and_process_self_development.md` | One made-up set of documents, one run. Nothing measured on Claude Code |
| The same correction fails again and again | The owner's note of 31 Oct on the rule for a restarted job, as his ledger records it: "the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail". On 2 Nov one session ran four review rounds over two hours and 26 dollars before he asked | `evidence/ledger_lines.md`, line 705; `evidence/foundations_tranche_9nov.md`, line 207 | No count of repeated corrections was found. The figure "two" was taken from research, not measured here (`evidence/ledger_lines.md`, lines 701 to 703) |
| Work stops with nothing calling for it | The 194 minutes of section 4, and the owner's "Why have you stopped?" | Section 4 | How often under Process4 |

## 8. What this part could not source

- The owner's typed words of 18 Nov. His rulings of that day are known only through `working/design_state_18nov.md`, which is written in Claude's words.
- The text of the fourth draft's twelfth proposal, which this writer did not read beyond its heading.
- The evidence table behind "41 percent before and after his instruction of 5 Nov", which `working/trial_plan_facts.md` says is lost.
