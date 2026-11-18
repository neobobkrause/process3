Length: 190 lines. Last section: "5. The count".

# Seventh draft, as corrected, checked again against the design state of 18 Nov

Written by a checking session on 18 Nov 2026. It reports only what was read. It does not judge the design and proposes no additions to it. The sixth draft was not read, and the owner's typed words were not read, so no quotation in the draft was checked against its source.

Short names. "DS" is `process4/working/design_state_18nov.md`. "P0" to "P10" are the eleven files of `process4/definition/process4_definition_v7/`, by number. "L" is a line number in the file as it now stands. "The earlier check" is `draft7_check_design_state.md`.

## 1. Line counts read

Every line of each was read, in the order asked.

| File | Lines now | Lines at the earlier check |
|---|---|---|
| `design_state_18nov.md` | 143 | 143 |
| `00-index.md` | 82 | 73 |
| `01-purpose-owner-and-decisions.md` | 79 | 79 |
| `02-modules-jobs-tests-and-the-notice.md` | 102 | 100 |
| `03-tranche-rounds-walks-and-release.md` | 72 | 72 |
| `04-roles-and-sessions.md` | 132 | 122 |
| `05-reading-and-documents.md` | 60 | 53 |
| `06-rules-permissions-and-changing-the-process.md` | 69 | 67 |
| `07-harness-claude-code.md` | 43 | 41 |
| `08-harness-codex.md` | 46 | 44 |
| `09-hosting-cloudflare.md` | 27 | 22 |
| `10-open-and-unproven.md` | 90 | 87 |
| `draft7_check_design_state.md` | 152 | |

Each of the eleven parts states its own length and last section at its top, and each statement is true as counted. The largest part is 12,879 bytes (P4) and the eleven together are 75,892 bytes, under the draft's own 24,000 and 175,000.

## 2. A. Each finding of the earlier check

One line each. The number is the earlier check's own.

**Its section 3, MISSING**

1. The ledger. Corrected. P5 L36: "The owner's ledger was a worksheet and is retired."
2. Pointer to `harness_separation/`. Corrected. P5 L60: "The figures behind section 2 are in `process4/working/harness_separation/` and `process4/working/reading_measurements/RESULTS.md`."
3. `RESULTS.md` and `RERUN_PROMPT.md`. Corrected. P5 L60: "The second measurement is briefed in `process4/working/reading_measurements/RERUN_PROMPT.md`."
4. The process4 folder and branch; the Codex work. Partly corrected. P5 L58 now carries both, but as "**Claude decided:** the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository." DS L101 gives it with no mark. See B1.
5. The owner's typed words and the working Foundations. Corrected. P5 L59: "The owner's typed words are in `process4/owner_words/`. The working Foundations are `process4/evidence/foundations.md` and `process4/evidence/foundations_tranche_9nov.md`."
6. "Each such case may be studied and reported to PROCESS." Corrected. P4 L129 has the sentence word for word.
7. "It is not stated as a habit in any role's principles." Corrected. P3 L27 ends with the sentence.

**Its section 4, WRONG**

1. "Once in force". Corrected. P0 L9: "It is \"the Process4 requirements\" and is what sessions follow."
2. The reading on stops during the trial. Corrected. P4 L129: "while Process4 is on trial every such stop is reported to PROCESS; the simpler handling applies once it is beyond trial."

**Its section 5, MARK WRONG**

1. An edit to the approvals goes with a restart of ROOT. Partly corrected. Marked at P4 L110 ("**Claude decided:** an edit to the owner's approvals goes with a restart of ROOT by this way") and P6 L14 ("**Claude decided:** an edit therefore goes with a restart of ROOT"). Still unmarked in the table at P1 L22: "Start ROOT | At each start or restart of development; after each edit to his approvals; after any full stop". See B2.
2. The size of a role's starting text. Corrected. P5 L30: "**Claude decided:** the size of a role's starting text is a rule, not a refusal among the tool's tests."
3. Length and last section at the top. Corrected. P5 L11: "**Claude decided:** each governing text says at its top how long it is and what its last section is."
4. Install and update on a development account, in P9. Corrected. P9 L15: "Both are run on a development account before a release is offered (a reading; part 3, section 6)".
5. The three lane rulings under a Reading. Corrected. P4 L38 "The owner's rulings:" now stands over L40 to L42, and the Reading at L44 covers only "the rest of this section".
6. Messages not stored; the small fixed set of records. Partly corrected. P4 L116: "**Claude decided:** it is saved in the sender's pull request, in the repository, or in a record of the shared state; the message itself is not stored." The list of words still gives the other half unmarked, P0 L73: "**Shared state:** the small fixed set of records every role works from (part 4)." See B3.
7. Who archives a session. Corrected. P4 L92: "**Claude decided:** the session that started a session archives it; where the starter is gone, ROOT does."
8. Standing notes say what ends them. Corrected. P4 L64 now stands above "**Claude decided** the rest of this section" (L66).

**Its section 6, notes on rules counted as carried**

- DS L18, every other check has ended. Not corrected; the draft is unchanged in substance. P6 L35: "holds none of the checks the process before this one had that could stop work", said of the tool only. P2 L60 now adds "Only these two refusals stand; no other is built into module tests." See B6.
- DS L21, a notified job runs only the related tests. Partly corrected. P2 L74 now names the conflict in an Open line: "If it cannot, the whole module's tests run there as for any job, which the ruling above does not allow for." See B8.
- DS L39, two reasons for the Codex maximums. Not corrected. P5 L10 still gives one: "because Codex context windows are in effect the more constrained." See B7.
- DS L50, the form of a question. Partly corrected. "and what it gives and costs" is gone. P1 L48 still adds "once": "A question is put to him inline, once, in one form". See B9.
- DS L59, the walks' documents. Not corrected. P3 L33 still adds "named in the process config. The UX lane owns them." Listed in section 4.
- DS L86, "within the product's principles". Corrected. P4 L41 gives the ruling in DS's words, and the added words are now at P4 L50 under the Reading.
- DS L81, "ARCH is long-lived". Not corrected. Still no line says it. See B5.

**Its section 7, the design state's rules for the document itself**

- Names no product. Still true. No product name is in any part.
- Parts 1 to 6 name no hosting provider. Still true.
- A harness named in part 5 where no figure is given. Partly corrected. P5 L25 ("where a harness shows no fill level (part 8)") and P5 L39 ("Where one harness's side of the design is not yet known") no longer name one. P5 L58, a new line, does: "The Codex work is on that same branch." See B10.
- The mark "Claude decided" names one harness's AI. Not corrected; unchanged. DS uses the same mark.
- "Compaction" in no table. Corrected. P0 L77 explains it, P7 L22 and P8 L23 are rows for it.
- Terms with no row in a harness table. Partly corrected. P7 L23 and P8 L24 are now rows for "The time a session can run one thing". Still no row in P7 for the model and effort passed on, the depth of sessions (P7 L36, outside the table), planned replacement, or the shared state. Still no row in P8 for the standing page and a lane's design pages, or for grouping (P8 L40, outside the table). See B10.
- "Seventh draft" in the title, and lines that tell of past events. Not corrected; unchanged (P0 L1; P5 L19 to L22; P6 L8; P7 L32 to L43; P9 L26; P10 L42, L48, L50, L90).
- Length and last section true for each part. Still true (section 1 above).
- Each part under the single-text maximum and the eleven under the set maximum. Still true.

**Its section 8, the draft against itself**

1. Archiving by the watcher. Corrected. P4 L92: "where the starter is gone, ROOT does"; at P4 L102 the watcher has by then written itself in as ROOT.
2. One writer for each record. Partly corrected. P4 L68: "Each record has one role that writes it"; the roles record's writer is now ROOT (L72). The standing notes are still written by the coordinator (L76) and removed by the tool (L64), and the lanes record's writer is "The starter of the lane" (L73), which is ARCH or PROCESS.
3. Depth. Corrected. P4 L29: "Under a ROOT the owner started, roles sit at most three levels deep ... A takeover by the watcher adds a level".
4. A test run on every pull request. Corrected. P2 L100: "needs no module tests"; P2 L101: "The required test run reports on every pull request, and passes at once when no module's code or tests changed."
5. The owner's approvals reaching the tranche branch. Corrected. P6 L23: "The tranche branch takes a session's change only by pull request ... The owner commits his approvals and forbidden commands himself."
6. What a notified job runs. Partly corrected. P2 L74 states the conflict openly and does not remove it.
7. Who starts lanes. Corrected. P4 L26: "PROCESS | Its own lanes (a reading; part 6, section 8)"; P4 L90: "The parent of a product's lane is ARCH."
8. What a role is. Corrected. P4 section 1 is now "The roles, and the sessions that hold no standing role"; P0 L51: "A job, a walking session and a worker hold no standing role."
9. One decision record or two. Corrected. P5 L49: "ARCH's technical decisions are written in a second record in the product's repository"; P2 L9: "the product's two decision records".
10. Where a blocker is recorded. Corrected. P4 L77, the round record: "which are finished or blocked and why".
11. What the trial asks of the owner. Corrected. P10 L55: "session starts, one edit to his approvals, one stop, and three short marked instructions."
12. "Each item is also marked where it belongs". Corrected. P10 L5: "Most items are also marked where they belong in parts 1 to 9. This part gathers them and adds what belongs to no one part."

- The thin cross-reference. Corrected. P6 L38: "a tranche runs on that one version from open to close."
- Terms not in the list of words. Partly corrected. P0 L63 to L82 now explain most. Still not in the list: interface listing; a role's starting text; the development account; secret values; production key; the trial repository; the tranche branch and the main branch; the module list; the ranking page; the background document; the conversion plan; natural pause; the one way back; standing notes; the account after each round; a marked message; directing session and parent; language reader.
- Its list of rules not in the design state. Not a fault to correct. The list as it now stands is in section 4 below.

Tally of A: 46 lines. Corrected 27. Partly corrected 8. Not corrected 6. Four were "true" before and are still true. One is the list carried to section 4.

## 3. B. Problems found, rule by rule

DS sections 0 to 15 were gone through line by line. Only problems are listed. Most serious first.

**B1. A ruling of the owner's stated as "Claude decided".**
DS section 11, L101, no mark: "The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The Codex work is on that same branch."
Draft P5 section 7, L58: "**Claude decided:** the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The Codex work is on that same branch."
Kind: wrong mark. By P0 L22 the owner "can overrule any" such decision, so the draft makes his own ruling look like one of the AI's.

**B2. A notified job's tests: the draft states an outcome it says the ruling does not allow.**
DS section 1, L21: "A notified job checks only the changed parts and runs only the tests that relate to them." DS section 15, L139, owes only "A design for how a notified job picks the tests that relate to a changed entry."
Draft P2 section 7, L73, carries the rule. L74, "**Open (a session, by design work):**", adds a second question DS does not have, "whether the required run on its pull request can be held to those tests", and then: "If it cannot, the whole module's tests run there as for any job, which the ruling above does not allow for."
Kind: contradiction, named by the draft itself and left open with "a session", not with the owner. P10 L23 repeats it as design work.

**B3. "Every other check has ended" is said of the tool only, and two refusals are kept with no mark.**
DS section 1, L18: "Every other check Process3 had that could stop work has ended."
Draft P6 section 5, L35: the tool "holds none of the checks the process before this one had that could stop work." No line says it of the process as a whole. P2 section 6, L53, has "no further test phases, gates or reviews".
Draft P2 section 6, L59 and L60, with no mark: "Module tests include a check that the module's declared uses match its imports" and "the tool may refuse a structured comment that disagrees with the module's code, and may refuse the module's code where it disagrees with a provider's stated interface ... Only these two refusals stand".
Kind: stated more narrowly than DS; and two things that can stop a job's work, stated as the owner's, which DS does not name. Whether they were checks "Process3 had" could not be told from the files read.

**B4. Two of the four values called a ruling where DS has a Reading.**
DS section 3, L43: "Reading: \"these current values\" are the four put to him: ... a role's starting text, 4,096 bytes and at most ten rules; the fill level, 40 percent."
Draft P5 section 2, L15, marks the four correctly: "**Reading:** these four are the values he meant." The table under it then says, L21: "A ruling carried from the process before this one, where it held. Not measured", and L22: "The owner's ruling. Not measured".
Kind: wrong mark inside the table; the two cells are also in no line of DS.

**B5. A "Claude decided" rule still unmarked in one place.**
DS section 1, L19: "Claude decided, from that ruling: ... An edit to his approvals goes with a restart of ROOT by the one way back".
Draft P1 section 3, L22, the table of the owner's acts, no mark: "Start ROOT | At each start or restart of development; after each edit to his approvals; after any full stop".
Kind: wrong mark. Marked correctly at P4 L110 and P6 L14.

**B6. A "Claude decided" rule still unmarked in the list of words.**
DS section 13, L118: "Claude decided: the shared state is a small fixed set of records, each rewritten in place".
Draft P0 section 5, L73, no mark: "**Shared state:** the small fixed set of records every role works from (part 4)."
Kind: wrong mark. Marked correctly at P4 L66 to L68.

**B7. "ARCH is long-lived" is not stated.**
DS section 8, L81, no mark: "ARCH is long-lived."
Draft: no line says it. The nearest are P0 L52 (what a long-lived role is, naming none), P4 L90 ("The parent of ARCH, the coordinator and PROCESS is ROOT", under refresh) and P4 L93, which is marked: "**Reading:** a role such as ARCH lasts, while its sessions are refreshed often."
Kind: missing as a plain statement; the only line that names ARCH as lasting is a Reading, where DS L81 is a ruling. (DS L127 does mark that other sentence as a Reading, and the draft carries that correctly.)

**B8. Why the Codex maximums are used, and what the figures are.**
DS section 3, L39: "The Codex maximums are used, because they rest on real measurements and Codex context windows are in effect more constrained than Claude Code's." And of the figures in `harness_separation/`: "they are sizes shown to work, and none is a size at which reading was shown to fail."
Draft P5 section 1, L10: "The Codex maximums are used on both harnesses, because Codex context windows are in effect the more constrained." P5 section 2, L24: "None of the four is a size at which reading was shown to fail on Codex."
Kind: stated differently. The first reason is dropped from the rule (the table at L19 and L20 says "shown to work on Codex"). DS's sentence about the measured figures is said of all four values, two of which the draft itself calls "Not measured", and "on Codex" is added.

**B9. The harness tables do not carry every harness-dependent term.**
DS section 2, L33: "Harness-neutral terms in the body of the design, with a table for each harness (Claude Code, Codex) saying which construct carries each term."
Draft: parts 1 to 6 use these with no row in P7's table: the model and effort passed on (P4 L33), the limit on depth (P4 L105), planned replacement, the shared state. No row in P8's table: the standing page and a lane's design pages, grouping. Also P0 L12 says a harness is named in parts 1 to 6 "only in part 5, where a figure comes from one"; P5 L58 names Codex where no figure is given (DS L101 names it too).
Kind: the rule is partly kept.

**B10. A word added to the form of a question.**
DS section 4, L50: "A question is put to Bob inline, in one form: a title, the question, ..."
Draft P1 section 5, L48: "A question is put to him inline, once, in one form".
Kind: a word added to the owner's rule, with no mark.

**Notes that are not counted as problems.**

- DS section 15 lists what is owed. Three things owed there appear in the draft as done by "Claude decided": the watcher's takeover (P4 section 6, also marked Unproven), where the approvals live (P6 L17, with the owner's acts left Open at L18), and the technical matters of DS L142. Two items of DS L142 were not found in the draft, as settled or as open: "the notification's two smaller open parts" and "loops with no end" (P4 L127 bounds a job's corrections; no other loop is spoken of).
- DS L133: "PROCESS answers a finding that needs a deliberate attack with \"no change\"". P6 L39 adds "against the tool". DS's bullet is about the tool.
- DS L43 quotes the owner's words on the provisional values. The draft does not quote them; it says "on the owner's word" (P5 L15).
- DS L26 names the product whose facts go to a conversion plan. The draft says "that product's conversion plan" (P0 L11), which keeps the rule that the document names no product.
- Every other rule of DS sections 1 to 14 was found in the draft in the same meaning and with the same mark. All nine things DS L96 leaves out are absent from the draft.

## 4. Stated as the owner's, and in no line of the design state

Rules the draft states with no mark that are in no line of DS. Listed only. They may come from the sixth draft, which was not read.

- P0: L54 (one ordered list of modules; a module uses only modules before it; also P2 L7); L58 (eight slots, counted across the account; also P2 L47, L48); L61 and L62 (the owner's words on each walk); L66 (the owner's example of a mechanical edit); L67 (a development deployment "holds no secrets and keeps no permanent record"; also P9 L12).
- P1: L7 and L8 (what Process4 is for; its one output); L22 to L30 (the table of the owner's acts, other than what B5 names); L40 (no session writes its own summary of his words as his); L47 (a quotation: "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen."); L49 (no technical question is brought to him); L53 (the one message when completely blocked; the named blocker); L60, last sentence ("No worker is briefed to review another session's work"); L76 (three refusals in a row stop the session).
- P2: L8 (every code file has one owner module); L14 (permanent numbers; met or not yet met); L21 to L28 (the life of a job); L30 and L31 (the owner's words on a job's tests and on module A and module B); L32 and L33; L54 ("A test runs only when there is a fully informed reason to run it"); L55; L56 (the quotation "must be complete yet fast and efficient"); L57 (the structured comments and the tool can inform module tests); L58 (every requirement tested at the module's interface); L59 and L60 (see B3); L61, first two sentences; L62 (tests run in two parts); L67 to L72 other than what DS L21 holds (the notice: the owner's words on domain and range, how a change is found, who is told, a module with no comments yet); L100 (a lane's folder needs no module tests; "Design documents do not need testing").
- P3: L8 (the main branch never moves while a tranche runs); L9 (one fixed version of the process for a tranche); L10; L17 (each flaw is work in the next round, "not the next tranche"); L33 (the folder "named in the process config"; "The UX lane owns them", which P4 L53 gives under the Reading header); L38 ("ARCH starts them"); L50 (the tranche merges as a whole by pull request, and none of the tests runs on it); L53 (what the tranche report holds; DS L64 says only that it stands as the sixth draft has it); L59 (ARCH prepares the release; no session publishes without approval).
- P4: L7 (ROOT's hourly wake; it decides nothing about the product); L9 (the coordinator's duties: holds or approves one merge, puts a module first, changes the slot number, stops work); L10 (ARCH's duties and what it never does); L29 to L31 (three levels; no session starts its own replacement; one repository only; the newest commit; unattended mode; instructions that name every act); L33 (the owner's words on model and effort); L62 (what belongs to one job stays in its pull request); L81 (sessions name roles, not addresses); L90, first two sentences (who is whose parent); L91 (ARCH replaces a job that fills up or dies); L128; L130; L131; L132 other than the sentence DS L134 holds (how a stop on his word travels).
- P5: L7 ("A session acts only on what it has read in full or measured"); L21 and L22 (see B4); L32 ("Nothing is refused for size", wider than DS L41's "Nothing refuses a job or a merge").
- P6: L7 and L8 (three things hold a rule; the rest is held by text); L13 (he commits his approvals himself, on GitHub's website; no session writes, edits or relays them); L14, first sentence (a session loads the approvals only when it starts); L22 to L24 (what the forbidden commands take away; the second GitHub account; keeping to GitHub's limits); L28 to L30 (the three working rules; DS L109 has "never retried elsewhere" only); L34 (the list of what the tool does); L37 (the AI builds the tool before anything is in force); L38 (a fixed version and a read-only copy); L44; L45, last sentence; L47; L53 (the owner's words on PROCESS, in full); L57 and L58 (no new test, gate, review or stop; "no change" always among the options, with two quotations); L60; L61, last sentence ("The coordinator can talk to it").
- P7: L19 ("The product's `CLAUDE.md` stays under thirty lines").
- P8: L36 ("The owner's requirement that compaction be avoided entirely on Codex"); L42 (renewing the sign-in, "which the owner expects Codex to need and the process to support cleanly").
- P9: L14 (the owner's caution about external walkers, in his words).
- P10: L17 (which Codex model the process is to use, as a question for the owner); L55 and L56 (what the trial is; that it "can break a claim" and "cannot prove one").

## 5. The count

- Rules checked: the same 185 single rules the earlier check counted in DS sections 1 to 14, each looked for again in the draft as it now stands. DS sections 0 and 15 were read and are not counted.
- Earlier findings re-examined (A): 46. Corrected 27. Partly corrected 8. Not corrected 6. Still true 4. Carried as a list 1.
- Of the earlier check's 21 counted faults against the design state (9 missing, 2 wrong, 10 mark wrong): 18 are corrected; 3 remain in part (B1, B5, B6).
- Problems found now (B): 10. Wrong mark 4 (B1, B4, B5, B6). Contradiction 1 (B2). Stated differently or more narrowly 3 (B3, B8, B10). Missing 1 (B7). A rule for the document itself partly kept 1 (B9).
- Rules found in the draft in the same meaning and with the same mark: 175 of 185. The ten not so found are: DS L101 (two rules, B1); DS L19, one rule (B5); DS L118, one rule (B6); DS L43, two of the four values (B4); DS L81 (B7); DS L18 (B3); DS L39, the reason (B8); DS L50 (B10). B2 and B9 are faults in the draft against rules it does carry.
- Lines listed in section 4 as stated with no mark and not in the design state: about 75 lines across ten parts.
