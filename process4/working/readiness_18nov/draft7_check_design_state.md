# Seventh draft checked against the design state of 18 Nov

Length: 152 lines. Last section: "8. The draft against itself".

Written by a checking session on 18 Nov 2026. It reports only what was read. It does not judge the owner's decisions and proposes nothing new.

Short names used below. "DS" is `process4/working/design_state_18nov.md`. "P0" to "P10" are the eleven files of `process4/definition/process4_definition_v7/`, by their number (P0 is `00-index.md`). "L" is a line number.

## 1. What was read

Every line of each, in full.

| File | Lines |
|---|---|
| `design_state_18nov.md` | 143 |
| `00-index.md` | 73 |
| `01-purpose-owner-and-decisions.md` | 79 |
| `02-modules-jobs-tests-and-the-notice.md` | 100 |
| `03-tranche-rounds-walks-and-release.md` | 72 |
| `04-roles-and-sessions.md` | 122 |
| `05-reading-and-documents.md` | 53 |
| `06-rules-permissions-and-changing-the-process.md` | 67 |
| `07-harness-claude-code.md` | 41 |
| `08-harness-codex.md` | 44 |
| `09-hosting-cloudflare.md` | 22 |
| `10-open-and-unproven.md` | 87 |

The sixth draft was not read. So DS L64 ("stands as the sixth draft has it") was checked only as far as: the draft has the report (P3 L53).

## 2. The count

DS sections 1 to 14 were split into 185 single rules. A bullet with several sentences is several rules. The nine things DS L96 leaves out were each counted as one rule, carried when the draft does not hold the thing.

| DS section | Rules | Carried | Missing | Wrong | Mark wrong |
|---|---|---|---|---|---|
| 1 Testing | 14 | 12 | 0 | 0 | 2 |
| 2 Documents | 20 | 18 | 1 | 1 | 0 |
| 3 Reading in full | 19 | 16 | 2 | 0 | 1 |
| 4 Decisions | 13 | 13 | 0 | 0 | 0 |
| 5 Tranche, rounds, walks | 21 | 21 | 0 | 0 | 0 |
| 6 Release | 5 | 4 | 0 | 0 | 1 |
| 7 Work and requirements | 4 | 4 | 0 | 0 | 0 |
| 8 Sessions and roles | 17 | 14 | 0 | 0 | 3 |
| 9 What holds a rule | 5 | 5 | 0 | 0 | 0 |
| 10 Left out | 11 | 11 | 0 | 0 | 0 |
| 11 Where things are | 4 | 0 | 4 | 0 | 0 |
| 12 Working principles | 8 | 8 | 0 | 0 | 0 |
| 13 From 14 to 17 Nov | 16 | 14 | 0 | 0 | 2 |
| 14 Decided from ideas | 28 | 24 | 2 | 1 | 1 |
| Total | 185 | 164 | 9 | 2 | 10 |

DS sections 0 and 15 were read and not counted.

## 3. MISSING

The 9 rules are in 7 findings.

1. DS L28: "Bob's ledger was a worksheet and is retired." Nowhere in the draft. (It is a statement about a document that is gone; the draft's own rule of carrying no history may be why.)
2. DS L39: the figures found so far are in `process4/working/harness_separation/`. The draft gives no pointer to them. P5 L19 to L22 give figures with no source file.
3. DS L43: the first measurement's results are in `process4/working/reading_measurements/RESULTS.md` and the second is briefed in `reading_measurements/RERUN_PROMPT.md`. Neither file is named in the draft. P5 L15 and P7 L30 speak of the two measurements without saying where they are.
4. DS L101 (two rules): the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository; the Codex work is on that same branch. Nowhere in the draft.
5. DS L102 (two rules): the owner's typed words are in `process4/owner_words/`; the working Foundations are `process4/evidence/foundations.md` and `process4/evidence/foundations_tranche_9nov.md`. Nowhere in the draft. P0 L10 and P5 L46 say his exact words are kept, and P5 L36 names the Foundations, with no place for either.
6. DS L126: "Each such case may be studied and reported to PROCESS." The sentence is not in P4 L119, which carries the rest of that rule. See also WRONG 2.
7. DS L131, last sentence of the Reading: "It is not stated as a habit in any role's principles." P3 L27 carries the Reading as far as "it is part of what ARCH names for a round's walks" and stops.

## 4. WRONG

1. DS L27: "The design document is 'the Process4 requirements' and is what sessions follow." P0 L9: "Once in force it is 'the Process4 requirements': what every session follows." The draft adds "Once in force". By DS L34 and P0 L17 the design is used on trial before it is in force. P5 L36 carries the rule without the added words ("is what sessions follow"), so P0 L9 and P5 L36 also differ from each other.
2. DS L126, the Reading: "while Process4 is on trial every such stop is reported to PROCESS; the simpler handling applies once it is beyond trial." P4 L119: "while Process4 is on trial every such stop is reported to PROCESS; once it is in force only those that may need a change are." In DS the simpler handling is that the session is woken or replaced and the case "may be studied and reported". The draft turns "may be reported" into "only those that may need a change are" reported.

## 5. MARK WRONG

The 10 rules are in 8 findings. P0 L27 says: "A rule with no mark is the owner's ruling, or follows from one directly."

1. DS L19 marks "Claude decided": an edit to the approvals goes with a restart of ROOT by the one way back. The draft states it with no mark at P4 L100 (first sentence; the "Claude decided" there covers only what the edit does to a running round), at P6 L14, and in the table at P1 L22.
2. DS L19 marks "Claude decided": the size of a role's starting text is not a refusal among the tool's tests. P5 L30 states it with no mark.
3. DS L42 marks "Claude's addition": each governing text says at its top how long it is and what its last section is. P5 L11 states it with no mark.
4. DS L69 marks "Reading": the install and update run on a development account. P3 L58 marks it correctly. P9 L15 states it again with no mark: "Both are run on a development account before a release is offered."
5. DS L86 states as the owner's rulings, with no mark (three rules): a lane decides design in its area; ARCH decides whether and when a design is built and whether it can be built as given; a design ARCH cannot build goes back to the lane. In the draft these stand only at P4 L43, under P4 L37: "**Reading:** the owner has ruled on lanes in part and has not confirmed each rule below one by one." P10 L16 then lists "the lane rules he has not confirmed one by one" as open with him. The same header covers P4 L40 (ARCH starts the lanes, DS L85) and P4 L45 (design pages, DS L49), though those two are also stated without a mark elsewhere (P4 L10, P4 L25, P1 L43).
6. DS L118 marks "Claude decided": messages are not stored as files; the shared state is a small fixed set of records. P4 L56 to L58 mark it correctly. P4 L106 states again with no mark: "The message itself is not stored." P0 L67 gives the "small fixed set of records" with no mark.
7. DS L119 marks "Claude decided": the session that started a session archives it. P4 L82 states it with no mark.
8. DS L132 states as the owner's ruling: every kind of standing note says what ends it, and the tool removes the note when that comes true. P4 L71 carries the words, under P4 L56: "**Claude decided** the rest of this section."

## 6. Notes on rules counted as carried

- DS L18, "Every other check Process3 had that could stop work has ended": the draft says it of the tool only (P6 L35, "holds none of the checks the process before this one had that could stop work") and says "no further test phases, gates or reviews" at P2 L53. Counted as carried. P2 L57 and P2 L58 keep two checks inside module tests, one of which "the tool may refuse"; they are in section 8 below as not in the design state.
- DS L21, a notified job "runs only the tests that relate to them": carried at P2 L71. P2 L72 then offers, as one of two possible answers to an open question, that "the whole module's tests run as for any job". See section 7.
- DS L39, why the Codex maximums are used: DS gives two reasons ("they rest on real measurements" and the more constrained windows). P5 L10 gives the second only. The first shows in the table at P5 L19 and L20.
- DS L50, the form of a question: P1 L48 adds "once" and "and what it gives and costs" to the owner's list.
- DS L59: P3 L33 adds "named in the process config" and "The UX lane owns them."
- DS L86: P4 L43 adds "within the product's principles".
- DS L81, "ARCH is long-lived": no line says it in those words. Carried by P0 L50 ("A role lasts; its sessions are replaced", with ARCH in the list) and the Reading at P4 L83.

## 7. The design state's rules for the design document itself

**Names no product (DS L26).** True. No product name was found in any of the eleven files.

**Parts 1 to 6 name no hosting provider (DS L31).** True. Cloudflare is named only in P0 L12 and L42 and in P9. Parts 1 to 6 do name GitHub throughout, as where the code is kept (first at P1 L7).

**Parts 1 to 6 use harness-neutral terms (DS L33).** Mostly. What was found:

- P5 names a harness on six lines: Codex at L10, L19, L20, L24, L25, L38; Claude Code at L19 and L20; "his OpenAI account" at L38. P0 L12 allows this "only in part 5, where a figure comes from one". L25 and L38 name Codex where no figure is given. DS L39 and DS L32 themselves name Codex in the rules those lines carry.
- The mark "Claude decided" names one harness's AI and is used in parts 1 to 6 on 22 lines (first at P1 L67). P0 L22 explains it as "a technical decision made by the AI". DS uses the same mark.
- "Compaction" is used at P4 L119 and is not a row in either harness table. P8 L22 and L34 speak of it.
- Terms of parts 1 to 6 that depend on the harness and have no row in the P7 table: the model and effort passed on (P4 L32); the limit on depth (P4 L95; P7 gives it at L34, outside the table); the time a session can run one thing (P3 L39); planned replacement; the shared state. P8 has rows for four of these (L23, L26, L28, L29) and none for the time limit. P8 has no row for the owner's standing page and a lane's design pages, or for grouping (grouping is at P8 L38, outside the table).

**Carries no history of how the design got to its present state (DS L29).** No line tells how the design changed between drafts. What was found:

- P0 L1 calls itself "seventh draft".
- These lines tell of past events in the process before this one or in measurements. P0 L10 says "The reasons and the evidence are in the background document." P5 L19 to L22 (what each figure rests on; "A ruling carried from the process before this one, where it held"); P6 L8 ("Rules held by text alone drifted in the process before this one"); P6 L35; P7 L30 to L34, L38, L41; P9 L21 ("took 60 and 64 minutes"); P10 L42, L48, L50, L87.

**Each part says at its top how long it is and what its last section is, and both are true (DS L42).** True for all eleven. Lines counted: 73, 79, 100, 72, 122, 53, 67, 41, 44, 22, 87, each as stated. Last section headings, each as stated: P0 "5. Words used" (L45); P1 "7. Known weaknesses of AI sessions" (L65); P2 "9. Changes that are not a job's" (L95); P3 "8. Support beyond the process" (L69); P4 "10. When something goes wrong" (L115); P5 "6. Each product's ranking page" (L50); P6 "8. Process4 develops itself" (L64); P7 "3. Not proven on Claude Code" (L36); P8 "3. What the owner fills" (L42); P9 "2. Not known" (L18); P10 "6. Risks with no trial" (L81).

P0 L13 says each part is under the single-text maximum and the eleven together under the set maximum. True against P5's figures: the largest part is 11,901 bytes against 24,000, and the eleven are 70,370 bytes against 175,000.

## 8. The draft against itself

**Two places that say different things about one matter.**

1. Archiving. P4 L82: "The session that started a session archives it." P4 L92: the watcher "archives the old ROOT session", which the watcher did not start.
2. Writers of the shared state. P4 L58: "Each record has one writer." The roles record's writer is "the starter of that role" (P4 L62), which is several sessions, and at P4 L92 the watcher "writes itself into the roles record as ROOT". The standing notes are written by the coordinator (P4 L65) and removed by the tool (P4 L71).
3. Depth. P4 L28: "Roles sit at most three levels deep." P4 L95: "Each takeover leaves the new ROOT one level deeper than the one before."
4. A test run on every pull request. P2 L98: a lane's folder change "merges without a test run". P2 L99: "The required test run reports on every pull request". P6 L23: the tranche branch "takes a change only by pull request with its required test run passing".
5. How the owner's approvals reach the tranche branch. P6 L17 puts them on the tranche branch, and P4 L100 and P2 L100 have the owner commit them. P6 L23 says the tranche branch takes a change only by pull request with its test run passing. No line says which applies to his commit.
6. What a notified job runs. P2 L71: it "runs only the tests that relate to them". P2 L72 leaves open "which tests then run on its pull request", with the whole module's tests as one answer. P2 L54 says module tests run when the job marks its pull request ready.
7. Who starts lanes. P6 L66 (Reading): PROCESS starts its own lanes. The table at P4 L21 to L26 gives PROCESS nothing to start, and P4 L80 says "The parent of a lane is ARCH."
8. What a role is. P0 L50 lists six roles: ROOT, the watcher, the coordinator, ARCH, a lane, PROCESS. P4 section 1, "The roles", lists nine, adding a job, a walking session and a worker (P4 L13 to L15).
9. The product's decision record. P4 L9 has the coordinator keep "the product's record" of the owner's decisions. P4 L10 and P5 L48 have ARCH write in "the product's decision record, apart from the owner's". P2 L9 names one file, "the product's decision record". P5 L44 says "Each record has one writer." It is not said whether these are one file or two.
10. A blocked job or module. P1 L53, P2 L33 and P4 L117 each say a blocker is recorded. The table of records at P4 L60 to L68 has no record that holds it.
11. What the trial asks of the owner. P10 L55: "session starts, one edit to his approvals, and one stop." P10 L65 also rehearses, on his word, a held merge, a module put first and a new slot number.
12. P10 L5: "Each item is also marked where it belongs in parts 1 to 9." Not marked where they belong: P10 L42 (a walk ending without flaws); L45 (the tranche branch merging into the main branch, P3 L50); L47 (a stop, a held merge, a module put first, a new slot number, P4 L122 and P4 L9); L49 (an edit to the approvals with a restart, P4 L100); L50 (the notice in a running process, P2 section 7); L29 (the written procedures as open work, P3 section 8); L30 (the conversion plan); L17 (which Codex model to use). The other way, P6 L62 is marked Unproven and is not in P10 section 3.

**Cross-references.** About 60 were checked, every "part N" and "section N" in the eleven files. All point to a section that holds the matter. One is thin: P3 L9 sends "one fixed version of the process from open to close" to part 6, where P6 L37 says a product names one fixed version and does not say "from open to close".

**Terms used and not explained in the list of words (P0 L47 to L73).**

- Named in the list only inside another entry, and explained in part 4 alone: ROOT, the watcher, the coordinator, ARCH, PROCESS (P0 L50); the UX lane.
- Not in the list at all: walking session; journey; the Screens document; the notice; structured comment; interface listing; governing text; the single-text maximum and the set maximum; a role's starting text and starting instructions; the standing page; scheduled wake; unattended mode; the deploy token; the development account; hosting provider; secret values; production key; the trial repository; the tranche branch and the main branch; the module list; the record of decisions; the ranking page; the background document; the conversion plan; handover; long-lived role; natural pause; full stop; the one way back; standing notes; the account after each round; the mark and a marked message; directing session and parent; archive; compaction; language reader.

**Not in the design state.** Rules the draft states with no mark, so as the owner's or following directly from one, that are in no line of DS sections 1 to 14. They are listed without judging them; some may come from the sixth draft, which was not read.

- P0: L52 (one ordered list of modules; a module uses only modules before it; also P2 L7); L56 (eight slots, counted across the account; also P2 L47, L48); L59 and L60 (the owner's words on each walk); L63 (the owner's example of a mechanical edit).
- P1: L7 and L8 (what Process4 is for, its one output); L22 to L30 (the table of the owner's acts, among them connecting the harness to GitHub, entering the deploy token, changing a GitHub or hosting setting, and connecting an AI account to the development deployment); L40 (no session writes its own summary of his words as his); L47 ("Nothing that points to something he has not seen"); L49 (no technical question is brought to him; DS L11 says the AI decides technical matters and reports them); L53 (the one message when completely blocked; the named blocker); L60 ("No worker is briefed to review another session's work").
- P2: L8 (every code file has one owner module); L14 (permanent numbers; met or not yet met); L21 to L28 (the life of a job: ready without waiting for the modules it uses; earliest in module order first; a draft pull request; merged with no review and no act of the owner's; the slot refilled in the same turn); L30 and L31 (the owner's words on a job's tests and on module A and module B); L32 and L33; L54; L56 (every requirement tested at the module's interface); L57 (the check that declared uses match imports); L58 (what the tool may refuse inside module tests); L59 (tests and walk steps are product work; none may serve the process); L60 (tests run in two parts); L65 to L70 (the notice: the owner's words on domain and range, how a change is found, who is told, a module with no comments yet); L98 (a lane's folder merges without a test run).
- P3: L8 (the main branch never moves while a tranche runs); L9 (one fixed version of the process for a tranche); L10; L17 (each flaw is work in the next round, "not the next tranche"); L50 (the tranche merges as a whole by pull request, and none of the tests runs on it); L53 (what the tranche report holds); L59 (ARCH prepares the release; no session publishes without approval).
- P4: L7 (ROOT's hourly wake; it decides nothing about the product); L9 (the coordinator holds or approves one merge, puts a module first, changes the slot number, stops work); L10 (ARCH's list of duties and what it never does); L28 to L30 (three levels; no session starts its own replacement; one repository only; the newest commit; starting instructions that name every act); L32 (the owner's words on model and effort); L39 to L47 other than L43 (the lane rules, under the Reading header); L53; L70 (sessions name roles, not addresses); L79 to L81 (the handover is rewritten before asking; who is whose parent; ARCH replaces a job); L120 to L122 (the fault, the complete block, and how a stop on his word travels).
- P5: L7 ("A session acts only on what it has read in full or measured"); L21 (the starting-text figure as "a ruling carried from the process before this one"); L22 (the 40 percent as "the owner's ruling"; DS L43 gives all four values as a Reading of his words, and P5 L15 marks them so); L48.
- P6: L7 and L8 (three things hold a rule; the rest is held by text); L13 (he commits his approvals himself; no session writes, edits or relays them); L14, first sentence (a session loads the approvals only when it starts); L22 to L24 (what the forbidden commands take away; the second GitHub account; keeping to GitHub's limits); L28 to L30 (the three working rules; DS L109 has "never retried elsewhere" only); L34 (the list of what the tool does); L37 (a fixed version and a read-only copy); L43 and L46; L52 (the owner's words on PROCESS, in full); L56 and L57 (no new test, gate, review or stop; "no change" always among the options, with two quotations); L59; L60 ("The coordinator can talk to it").
- P7: L19 ("The product's `CLAUDE.md` stays under thirty lines").
- P8: L34 ("The owner's requirement that compaction be avoided entirely on Codex"); L40 (renewing the sign-in, "which the owner expects Codex to need and the process to support cleanly").
- P9: L14 (the owner's caution about external walkers, in his words).
- P10: L17 (which Codex model the process is to use, as a question for the owner); L55 and L56 (what the trial is, and that it "can break a claim" and "cannot prove one").
