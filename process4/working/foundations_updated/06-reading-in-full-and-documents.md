# Process4 Foundations, part 6: Reading in full, and the documents

Length: 91 lines. Last section: "Where the work is kept".

## Why reading in full is a design matter

A session acts only on what it has read in full or measured.

The danger is a quiet one. Given a text or a set of texts that is too large, a session may scan it and not read it, and say nothing. It then works from a partial picture of the product's founding documents and of its own rules. Bob names this as a very significant danger that must be mitigated. His words are in `process4/owner_words/bob_words_17nov_codex_context.md` and `bob_words_16_17nov_codex_development.md`.

Nothing can ensure a full reading. So the design keeps texts small enough that a full reading reliably results. This follows Bob's general approach in `bob_words_17nov_compaction_avoidance.md`: the best mitigation of a shortcoming is to stay out of the situation where it comes into play.

## The measured maximum

Every text a session must read in full is kept below a measured maximum size. So is every set of texts that is read together.

The Codex maximums are used. They rest on real measurements, and Codex context windows are in effect more constrained than Claude Code's. Writer's reading: a size that is safe in the tighter harness is taken as safe in both.

The values are not yet settled, and are owed (part 10). The figures found so far are in `process4/working/harness_separation/`. They are sizes shown to work. None is a size at which reading was shown to fail. The values are settled first from the limits that Process3's own rules set. If those do not settle them, credible tests measure the thresholds.

The maximums are chosen by one yardstick, which also sets the fill level at which a role is refreshed (part 5). After a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level. Bob's words on this are in `bob_words_17nov_compaction_avoidance.md`.

Measured in Process3: a guide for sessions that had no size limit grew from 8 KB to 134 KB.

Each governing text says at its top how long it is and what its last section is. This is Claude's addition. Writer's reading: it lets a reader know whether it reached the end.

## Role principles and requirements files

Each role has its own principles. They are concise, sufficient for the role to be performed correctly, and unambiguously clear. There is one short rulebook for each role, of at most ten rules.

Whenever a role's principles are changed, every effort is made to keep them short enough to be read in full and not scanned. Where that cannot be done, the matter comes to Bob to find a solution. Claude's reading, not yet confirmed by Bob: PROCESS brings it to him.

A module's requirements file is kept under the maximum, as a rule ARCH applies. When a file nears it, ARCH splits the module into two real modules. Nothing refuses a job or a merge.

Writer's reading: the same rule covers what a job reads together, which is its module's requirements, its module's code, and what its providers publish.

Claude Code: the product's CLAUDE.md, the instruction file every session loads, stays under thirty lines.

Codex: the limit on the instruction files a hosted session loads is not yet known. See `process4/working/codex_shortcomings_to_fill.md`.

## The ranking of a product's governing texts

Each product has one short page that ranks its kinds of governing text: mission, principles, standards, requirements, design decisions. ARCH keeps the page, and every role reads it.

A lower kind never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH.

## The two documents

Process4 has two documents.

- The design document defines the Process4 design. It is "the Process4 requirements", and it is what sessions follow. It names no product.
- The background document gives the background and context. These parts are that document. They are Bob's Foundations, brought up to date with the design.

A product's own facts, and the steps to move it onto Process4, go to a separate conversion plan for that product.

The design document is written in plain words, with no reference codes. Bob has not read the sessions' working files, and he asks to be spoken to in words he understands (`bob_words_14nov_b.md`).

## The record of decisions

Bob's decisions about the Process4 design are kept in the repository.

- The record is ordered by subject. Each entry states the rule as it now stands.
- A decision that changes an entry rewrites it in place. A rewritten entry is shown to Bob once before it stands.
- Bob's exact dated words are kept, and never edited. They are in `process4/owner_words/`.
- The design document is brought up to date in the same step as the record. It carries none of the history of how the design reached its present state.

Bob's latest statement replaces any earlier one. His older words are never set against his newer ones.

Writer's reading: a reader who needs the rule reads one entry and gets the rule. A reader who needs to know what Bob said reads his words. Neither has to work through a history to find where things stand.

## Words that fit either harness

The body of the design uses words that fit either harness. A table for each harness, Claude Code and Codex, says which construct of that harness carries each term. Anything specific to Claude Code, such as CLAUDE.md and settings.json, is marked as specific to Claude Code.

Bob's direction is that Codex is to be studied as an environment of its own, not assumed to be the same as Claude's (`bob_words_17nov_codex_context.md`). He also asked for confirmation that the Codex work does not overwrite the support for Claude Code (`bob_words_16_17nov_codex_development.md`). Each harness's own files are kept apart in the process's repository, and a change for one harness never alters the other's.

The terms these parts use, with their Claude Code constructs, are listed in part 9.

Where the Codex side of the design is not yet known or not yet built, the design notes the shortcoming plainly. It is left for Bob's work on the OpenAI account to fill. The list is `process4/working/codex_shortcomings_to_fill.md`. In these parts a line that begins "Codex:" marks such a place.

## Words that fit any hosting

The body of the design names no hosting provider. Whatever depends on where a product is hosted and released is stated in neutral terms. That covers the development site, deploying, the deploy token, the hosting account's limits, and installing and updating.

A table for each hosting provider says what carries each term. Cloudflare is the first. Support for other hosting is not built now. The design is written so that it can be added.

These parts keep to the same rule. They speak of the product's hosting account, and name no provider outside this section.

## Where the work is kept

The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The Codex work is on that same branch. Bob has approved adding all information about the Process4 work to that repository, which is public (`bob_words_14nov_c.md`).
