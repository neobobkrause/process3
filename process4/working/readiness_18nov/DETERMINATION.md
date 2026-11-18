# Is the Process4 design ready to build the process from?

Length: 94 lines. Last section: "6. What this determination rests on".

Written by Claude on 18 Nov 2026, on Bob's word: "determine whether the process4 design has advanced to the point where it's a load-bearing design that meets all stated requirements and can thus be used as the basis of producing the process4 process."

## 1. The answer

**No, not yet.** The design is the sixth draft as amended by the design state. Read that way, it meets most of what Bob has typed, and contradicts none of it. But it is not one document, it leaves twelve things open that building on Claude Code cannot go without, and most of what it depends on has never been shown to work.

This is a finding about the state of the design. It is not a forecast of whether Process4 will work.

## 2. The four measures used

Claude's reading of "load-bearing design that meets all stated requirements":

1. Every requirement Bob has stated is met by a stated part of the design.
2. Nothing a builder or a session needs is left open.
3. Each thing the design depends on is proven, or named as unproven with what happens if it fails.
4. It is one statement: a reader can tell, for every part, what the rule is.

## 3. What was found

**Measure 1, the stated requirements: mostly met, none contradicted.** Bob's typed words of 14 to 17 Nov hold 99 requirements that still stand.

| | Found | Met | Met in part | Not met | Contradicted | Cannot tell |
|---|---|---|---|---|---|---|
| 14 and 15 Nov | 59 | 54 | 5 | 0 | 0 | 0 |
| 16 and 17 Nov | 40 | 17 | 21 | 0 | 0 | 2 |

- 19 of the 21 are met only by naming a Codex shortcoming. The heaviest: "avoid compaction entirely" on Codex, where a refresh at a fill level cannot be triggered and nothing signals a compaction.
- The design state says the design names each known weakness of AI sessions, its sign and what the session then does. Neither file holds that list.
- "any change to either a provider's domain or range necessitates that its users be retested": the rule is there; how a told job picks its tests is owed.
- Bob's words of 18 Nov were not checked as his words. They are not in `owner_words/`; the design state gives them in Claude's words.

**Measure 2, what is left open: fails.** 73 open items: 12 block building on Claude Code, 27 block the Codex side only, 34 can wait. The twelve:

1. What the shared state holds and what on GitHub carries it.
2. Branches, where Bob's approvals live, and the order of his acts.
3. How a walking session makes a walk, and whether its browser can reach the development site.
4. Changes that are not a job's: who writes them, what test run they get, how they merge.
5. When a round's jobs are done.
6. How ARCH's session makes the deployment in the time a session has, and who can read the deploy token.
7. The watcher's takeover, and how ROOT, which has no parent, is refreshed.
8. What an "area" of a partial walk is.
9. Which copy a job's tests run against.
10. How a notified job picks its tests.
11. Loops with no end.
12. Who decides an interface between two modules.

**Measure 3, what is proven: fails.** 71 things the design depends on: 17 proven, 10 ruled, 40 unproven, 4 shown to fail.

- The 17 were proven in Process3, on Claude Code, with Process3's tool. Process4 has never run, and its tool is not built.
- Unproven and leaned on most: the tool; the shared state and a successor starting from it; a ROOT started with a plain prompt acting on Bob's newest approvals; merges by the new tool passing the permission checker; walks made by sessions; a walk ending without flaws; a deployment made from a session inside a round.
- Shown to fail: rules held by text alone drifted in Process3 and still hold most of the design; an account switch lost work on 5 Nov; on Codex, a role as a session of its own, and one chat reaching another's children.
- Of the earlier audits' findings, 14 separate matters still stand, and 19 of the 22 feasibility findings are not fully answered. The gravest not listed above: changes in several modules that can only pass together have no route.

**Measure 4, one statement: fails.**

- There is no design document. The sixth draft names Civicsmith, Cloudflare and Claude Code, which the design state says the design document must not, and it is 93,937 bytes against the provisional 24,000.
- Of the sixth draft's 168 parts, 66 stand, 86 are changed by the design state, 7 are removed and 9 are unclear.
- The design state pulls against itself in places. A tranche merged "with its flaws named, with no release from it" against "Any tranche that has ended can be released". Messages "not stored as files" against "saved before the message is sent". A refreshed role "asks its parent" where ROOT has none.
- Eight of its rules are readings Bob has not confirmed.

## 4. What only Bob can settle

Each of these needs to be put to him in full, with its context and options. They are listed here, not asked here.

- When a tranche ends, now that walks are partial and no full walk is made by default.
- Whether a release can follow a tranche that was merged with flaws named.
- What a release is as an act of the process, and who publishes it.
- An urgent fix while a tranche is open.
- The eight unconfirmed readings, the four figures among them.
- Whether "GPT-6 or later" still stands, and what "options A and C" were.
- The Codex shortcomings, from his OpenAI account.

## 5. What would make it ready

In this order, as Claude sees it:

1. Bob's rulings on section 4.
2. Design work on the twelve open items and the matters that still stand from the audits.
3. Measurements of what can be measured before building: a session's browser reaching the development site; a deployment from a session in the time it has; a plain-started ROOT acting on the newest approvals; the reading figures, by the second measurement.
4. One design document written from the result, in parts under the single-text maximum, naming no product and no hosting provider.
5. This determination made again against that document.

## 6. What this determination rests on

- Six workers each read the sixth draft (597 lines) and the design state (143 lines) in full, and the other files named in their reports. Their reports are the other five files in this folder.
- The session that wrote this read the design state in full and did not read the sixth draft.
- The classes "blocks building", "can wait", "proven" and the rest are the workers' judgments. Each file states the rule it used.
- No "proven" was checked against its source record.
- Not checked: Bob's words of 18 Nov as his words; his Foundations and ledger; the appendices to the drafts.
- Five of the workers' six files are over the provisional 24,000 bytes for a single text. Only `requirements_part1.md` is under it. `coherence.md` is 48,427 bytes.
