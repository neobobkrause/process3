# Audit of the Process4 definition (second draft) against the Keep and Drop Ledger

14 Nov 2026. Audited: the MAIN TEXT of `/home/user/handoff/process4_definition_v2.md` (sections A to K), not the appendix. Against: the 159 ledger lines (`ledger_lines.md`), the current store (`/home/user/work/ledger_store/decisions/`), the 288-row table (`process4_disposition.tsv` and `.md`), `ledger_map.md`, the session's record of Bob's decisions of 13 and 14 Nov (`assessment_doc.txt`, lines 16 to 102), `live_docs.md`, `foundations.md` and `DECISIONS.md`.

Nothing was changed in any repository or store. No session was started.

## 0. The first thing to say

The definition would not be read the same way by two sessions, because one sentence carries a third of the ledger. Section G says "so 208 stand", and 34 of Bob's 151 kept or modified lines appear nowhere else in the main text. Among the lines that "stand as written" are several that Process3 held by a check that could stop work, while section D says "exactly three tests, and no others, ever". The main text does not say which of those checks stay. In Process3 a session rebuilt a check Bob had removed by citing kept ledger lines (measured, finding 1). That is the worst finding. The second is that the document breaks its own rule on whose words count (finding 2).

## 1. Counts

151 lines kept or modified (119 kept, 32 modified). One primary class per line; a line can also carry a part-finding, shown in the table in section 6.

| Class | Lines |
| --- | --- |
| (a) honoured, stated or clearly carried in the main text | 68 |
| (a, by the blanket only) not stated anywhere in the main text; covered only by "so 208 stand" in section G and by the appendix | 34 |
| (b) purpose kept, way changed by a decision of Bob's of 13 or 14 Nov (as a session recorded it) | 4 |
| (b) purpose kept, way changed by a decision of Claude's of 14 Nov, declared | 8 |
| (b) way changed from nowhere | 2 (JOB-14, MNT-8), plus 5 part-changes inside other lines (P7, PLT-5, SES-8, GAP-1, PLN-6) |
| (c) ended, declared, decider Bob (as a session recorded it) | 11 |
| (c) ended, declared, decider Claude | 11 |
| (d) silently dropped, whole line | 5 (P18, REC-11, SES-16, TXT-4, MSG-5) |
| (d) silently dropped, a named part of the line | 7 primary (PLT-9, P7, SES-14, SES-15, P21, GAP-2, GAP-12), plus parts inside 8 other lines (ARC-4, P12, MNT-4, SHM-1, GAP-6, PLN-6, P17, SES-8) |
| (e) contradicted | 1 primary (REQ-7), plus 3 part-contradictions (PLT-5, TXT-1, GAP-11) |
| (f) additions that no line or decision asks for | 7 (section 4) |
| Attribution faults | 6 that matter, 7 minor (findings 2 and 14) |
| The eight dropped lines | none comes back outright; one is echoed in section J (finding 18) |

How the 34 "blanket only" lines were judged: the main text says they stand, so they are not counted as dropped. But a reader of the main text alone cannot find them. They are: PLT-8, ENF-1, ENF-2, ENF-3, REC-5, REC-6, ARC-3, ARC-5, REQ-4, JOB-3, JOB-8, JOB-11, GAT-5, SES-4, SES-5, SES-7, SES-10, SES-13, SES-17, TXT-5, TXT-7, MSG-3, MSG-6, MNT-3, MNT-7, MNT-9, MNT-10, MNT-11, SHM-2, SHM-3, SHM-4, SHM-5, GAP-9, GAP-11.

## 2. Findings on kept lines, worst first

Evidence is marked: MEASURED (in the record, with file), PLATFORM (a platform fact or document), REASONING (mine only).

### Finding 1. Checks that could stop work are among the lines that "stand as written", and the main text does not say which stay

1. Counter-argument: The definition says there are three tests and no others, and in the same breath says 208 of your lines stand as written. Several of those lines are, or were held by, a check that stops work. A session can cite a "kept" line to rebuild its check, exactly as happened before.
2. Sentences attacked: D "Process4 has exactly three tests, and no others, ever." G "Of your 288 requirement lines, the audit kept 198 as written. Your decisions of 13–14 Nov settle ten more as kept, so 208 stand." F "Unchanged from Process3: all of the above, and merging through the merge tool." F "The main and tranche branches take changes only by pull request with the tests passing."
3. The lines, each with what the main text does:

| Line | Line's text (the part concerned) | Main text |
| --- | --- | --- |
| PLT-9 (kept) | "Every credential is gathered once before a product's first tranche and checked at every tranche open; a missing grant stops a tranche from opening, never a step midway." | I 2: "*Claude decided:* end the every-job form ... Keep the list of settings." I 12: "Let the check go with item 2." The check when a tranche opens is neither kept nor ended. |
| MNT-4 (kept) | "every session verifies the pin once at start and says so" | G keeps "One fixed version per tranche". The start-up verification is not mentioned. |
| SHM-1 (kept) | "Nothing else, and a check fails on drift." | K technical point 14: "the short fixed set your documents list." The drift check is not mentioned. |
| GAP-6 (kept; the map holds it by "record check; start check") | "Bob's standing approvals ... are the one policy" | F: "No session writes, edits or relays it, because the checker refuses that." I 5 ends "the check" on oversized files, which in Process3 was the same record check that also guarded the approvals block and `.claude/`. The main text does not say whether that guard stays. |
| ARC-4 (modified, Bob's own words) | "The architecture, ownership, format and coverage checks run only against the job's module in its gate" | D test one names only the uses check. K point 1 ends the ownership check. The format and coverage checks are not mentioned. |
| P12 (kept) | "the close merges main into the tranche (never a rebase) and re-runs the checks" | C: "The tranche branch merges into the main branch as a whole". F says the main branch takes changes "with the tests passing", but none of the three tests runs on the tranche's pull request. |
| JOB-5 (kept) | "A job's completion runs locally only checks that take seconds" | Not mentioned. |
| ARC-3, JOB-8 (kept) | "A test asserts on a text's key, never on its words"; "A job never commits a generated artifact." | Not mentioned. The session's record of 13 Nov lists both as ended with the three-tests decision ("artifact regeneration (GAT-4, JOB-8), tests asserting on text keys as a separate check (ARC-3)"); H names three lines only, so these two are counted among the 208. |

4. Evidence. MEASURED: "the receipt comparison restored under ten hours after the owner-driven removal (PR 177 → 185), by a session citing ledger lines" (`change_sample.md` line 211). MEASURED: "Without the record check nothing in git stops a session's pull request from changing the approvals or the deny list" (`permissions_inventory.md` line 415). The disposition document lists 121 such rows and says "both readings are given and neither is chosen" (`process4_disposition.md` section 5). REASONING: that a Process4 session would do the same.
5. How bad: silently corrupts the result (regrowth of checks), or stops a tranche (PLT-9, if a session builds it as a refusal).
6. Proposed correction (wording only; it declares, it adds nothing). After "so 208 stand" in G, add: "Where Process3 held one of these lines by a check that could stop work, the check stays only if this document names it. Named: the start-up check on your approvals (section I, item 11). For each of the following, this document must say 'stays' or 'ends', and who decided: the check of your credentials when a tranche opens; the check of the process version at a session's start; the check on the files a product receives; the format and coverage checks beside a module's tests; the re-run of checks when a tranche closes; the seconds-long checks when a job completes; the guard in git on your approvals and settings file." For ARC-3 and JOB-8 add to H: "A session's record of 13 Nov also lists as ended the check on text keys and the rule against committing built files; the rules stay as text, nothing checks them." Replace F's sentence with: "The tranche branch takes a job's change only by pull request with that module's tests passing. The main branch takes the tranche as a whole, after a round with no failures." If any of the listed checks is to stay, the answer is not mine to give; I found no remedy that does not either end a kept check or keep a fourth one.

### Finding 2. The document breaks its own rule on whose words are Bob's (attribution, systemic)

1. Counter-argument: Section B says a session never records its summary of what you said as yours. Every "you decided" about 13 and 14 Nov in this document is exactly that: a session's summary. The caution at the top admits it and then the text goes on writing "you decided".
2. Sentences attacked and their sources:

| # | Main-text sentence | Source found | Kind of source |
| --- | --- | --- | --- |
| 2a | B: "Only words you wrote yourself count as your word. A session never records its own decision, or its summary of what you said, as yours." against H: "*Why:* you decided there are no layers." and H: "*Why:* your decision." (review) and G: "Your decisions of 13–14 Nov settle ten more as kept" and H: "Fifteen lines end by your decisions" | `assessment_doc.txt` lines 21 to 101. `live_docs.md` A1: "Every one of its 925 text runs carries the same writing-session id ... So nothing in it was typed by Bob." | A session's record. No typed words of Bob's exist for any decision of 13 or 14 Nov. |
| 2b | H: "*Why:* on 13 Nov you confirmed these end with "three tests and no others, ever"." (the revert check JOB-12, the second run GAT-8, built files GAT-4) | The session's sentence "Kept Ledger lines this decision ends: the revert check (JOB-12), the gate on the merged result before merging (GAT-8) ..." (line 26). The quoted phrase joins two of the session's sentences ("three tests and no others"; "No other test is necessary, ever"). | A session's wording, in quotation marks as Bob's. No act of confirming is recorded. The same sentence stood in the first draft, whose appendix still listed all three as open points for Bob. Bob's stored ledger answer keeps all three, and a 6 Nov keep answer of his was cited to restore JOB-12 (`change_sample.md` row 185). |
| 2c | C: "You made this walk optional." | Session's sentence: "An optional multi-session deploy-and-external-walk runs after that." (line 25) | A session's record. |
| 2d | H: "Parts of kept lines end too: ... reviewing as a use for workers" under the heading "Fifteen lines end by your decisions", and B: a worker "never reviews another session's work" | Session's record of 14 Nov: "fresh-reviewer review is unnecessary and ends." The question put to him named INT-2 and INT-7 only. SES-18 keeps "a read-only reviewer" as a worker use. | A session's record, stretched by Claude to a line it did not name. |
| 2e | H: "Parts of kept lines end too: ... the name "BOB"; and a session writing down "a word you give in chat" as yours." and B: "It is never called "BOB"" | `assessment_doc.txt` line 307 ("The architecture role is called ARCH below, not BOB") and line 312 ("Your word is only what your own GitHub account wrote"), both in the session's own, now withdrawn, proposal; restated as "D10" in `process4_disposition.md` line 17. Neither appears in any "Decided by you" passage. | Claude's proposal, listed under Bob's decisions. The brief for this audit gives the second as a fixed decision of Bob's, so he may have said it in a conversation I cannot read; in the files it is a session's text. |
| 2f | G: "Another 45 keep their purpose, with the way of doing it set by your decisions or still open." | Section K, "Technical points, decided by Claude", sets the way for REC-1, PLN-4, PLN-5, SES-2, SES-3, MNT-1, MNT-5 and SHM-1. | Claude's decisions written as Bob's. This breaks the promise "Nothing Claude decided is written here as yours." |

3. Evidence: MEASURED (the files named). In Process3, "Of 218 attributions to you, 64 were your traceable words ... 48 were a session's own decision written as yours" (`assessment_doc.txt` line 351).
4. How bad: misleads Bob, and hands every later session a set of "your decisions" that no words of his support.
5. Proposed correction (wording only). Replace the caution in the opening with a rule the text then keeps: "Nothing below dated 13 or 14 Nov is in your own words. Each such decision is written as 'a session's record of 13 Nov has you deciding ...'. It becomes your word when you write it." Then: H "Layers": "*Why:* a session's record of 13 Nov has you deciding there are no layers." H "Three checks": "*Why:* a session's record of 13 Nov lists these as ended by your decision on three tests. Your ledger still shows all three as kept." Remove the quotation marks. C: "A session's record of 13 Nov calls this walk optional." H "Parts of kept lines": move "reviewing as a use for workers", "the name BOB" and "a session writing down a word you give in chat as yours" out from under "your decisions" and mark each "Claude decided" unless Bob's own words are produced. G: "with the way of doing it set by your decisions, decided by Claude (section K), or not stated here".

### Finding 3. Nothing prepares the next round or tranche (P18, silently dropped)

1. Counter-argument: Your principle that the architecture session gets the next stage ready while this one runs is gone, and nothing says where a tranche's work comes from when it opens.
2. Line: P18 (kept, 3 Nov): "The process is a pipeline: while a tranche runs, BOB prepares what the next round or tranche needs (its plan, the next modules' requirements drafted and reviewed, anything a later stage needs), so it opens the moment this one closes, without touching main, a running job's module or the requirements it reads."
3. Main text: B, ARCH: "It starts jobs, merges them, passes notices between modules, and decides every technical matter of the product." C: "What it finds is the first work of the next tranche." Nothing else.
4. Evidence: MEASURED: "gaps of 11.4, 8.7, 7.6 and 6.3 hours between code-carrying landings on 7 and 8 Nov" (disposition row P18, from `product_side.md` §7).
5. How bad: costs time at every tranche boundary; stops a tranche from starting if no module has work marked.
6. Proposed correction: add to B, ARCH: "While a tranche runs it prepares what the next round or tranche needs, so that it opens the moment this one closes, without touching the main branch, a running job's module or the requirements that job reads." (This restores the line. "Reviewed" is left out because review has ended.)

### Finding 4. "No requirement goes untested" is not carried (P7, part silently dropped)

1. Counter-argument: On 3 Nov you kept "no requirement goes untested, which was lost". It is lost again: the main text never says a module's tests must cover every requirement.
2. Line: P7 (modified, 3 Nov; note is the session's suggestion, accepted): "every requirement is tested at the interface and proven met". Note: "Keep no requirement goes untested, which was lost (JOB-12 only checks that tests are not inert)."
3. Main text: D test one: "*Runs:* that module's tests, never another module's, including a check that the uses the module declares match what its code imports." D mentions only as a measured fact that tests "name the requirement they prove".
4. Evidence: MEASURED: the Process3 form ("a named test per struck mark") "was loosened at 22 hours and removed with the receipt on 9 Nov" (disposition row P7). REASONING: without the sentence, "tests pass" can mean no test exists for a requirement marked met.
5. How bad: silently corrupts the result.
6. Proposed correction: add to D test one or to G, "Modules and requirements": "Every requirement of a module is tested at the module's interface by that module's own tests; a requirement is marked met only with the test that proves it. This is a rule for the job. Nothing outside test one checks it." No new check is proposed; if the rule needs one to hold, that is an unanswered counter-argument.

### Finding 5. Every word told to the coordinator is "followed" (REQ-7, contradicted)

1. Counter-argument: Your ledger says only words you explicitly mark become decisions. The definition says the coordinator passes on whatever you tell it and it is followed. That is the road back to every utterance becoming a rule.
2. Line: REQ-7 (kept): "Only explicitly marked words of yours become decisions; a ruling lives only until the requirement it refines is rewritten to absorb it, then it is deleted."
3. Main text: B: "It passes your words on exactly as written, with the date, and they are followed. ... Nothing special is built for any of these; your word is enough." The B table: "Tell the coordinator things in conversation | Whenever you choose".
4. Evidence: MEASURED: the session's record of 13 Nov names as an interruption "every utterance of yours being turned into a new rule until the rules overflow" (`assessment_doc.txt` line 58); "of the lists carried as the owner's across earlier handoffs, 14 of 21 items were found on 5 Nov to be mechanisms" (disposition row MSG-2).
5. How bad: silently corrupts the result (rules regrow from conversation).
6. Proposed correction: in B: "It passes on, exactly as written and with the date, the words you mark as a decision or an instruction, and those are followed. Anything else you say to it is conversation and changes nothing. A decision that refines a requirement lasts only until the requirement is rewritten to absorb it." Also change H's "a session writing down "a word you give in chat" as yours" to "a session writing down its own summary of what you said as yours", so that H does not forbid what K technical point 5 requires.

### Finding 6. How a question or blocker that is yours reaches you is missing, and "CAN RUN" has become "runs"

1. Counter-argument: Your lines say a blocker only you can clear reaches you while other work goes on, and that what is yours comes to you explained, with options and a recommendation. The definition tells you only when everything has stopped, and names no session that brings you a question of yours.
2. Lines: GAP-1 (modified, Bob's own capitals): "A tranche CAN RUN from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him." P17 (modified): "BOB brings him only what is his, rendered and explained, with options and a recommendation." SES-15 (modified; the note is the coordinator's wording, re-saved 14 Nov): "toward Bob it always explains each decision of his with context, options and a recommendation." P21 (modified): "a question that is Bob's becomes his decision and a design before anything is built."
3. Main text: A: "Process4 is the way AI sessions build a software product for you in a GitHub repository while nobody watches." E: "**The process is completely blocked.** Only then does it wait for you ... In every other case the stop is recorded as a named blocker and other work goes on." B: the coordinator "decides nothing about the product and never brings you a technical question."
4. What changed and from where: "CAN RUN" to "runs" comes from the session's record of 13 Nov ("The process runs unattended"); the disposition table says so itself ("D2 restates "can run" as "runs""). "Reaches him" to "wait for you only when completely blocked" comes from the same record, which speaks of waiting, not of telling. The loss of "options and a recommendation" and of "a design before anything is built" comes from nowhere.
5. Evidence: MEASURED for the wording (store, GAP-1, 2026-11-03T17:28:09Z: ""runs" changed to "CAN RUN"", `live_docs.md` A2). REASONING for the effect: blockers that are his pile up unseen until nothing else can move.
6. How bad: costs Bob time; misleads Bob about what he will be told.
7. Proposed correction: A: "... in a GitHub repository, and can do so with nobody watching." E, last sentence: "In every other case the stop is recorded as a named blocker and other work goes on. If only you can clear it, the coordinator tells you at once in one plain message, with the context, the options and a recommendation; nothing waits for your answer except the work that depends on it." B, coordinator: "A question that is yours is put to you once, explained, with options and a recommendation, and what depends on it is not built until you answer."

### Finding 7. The fresh session after two failed corrections: your reason is cut (JOB-14, changed from nowhere)

1. Counter-argument: You wrote that the restarted session should understand why the corrections were needed so that it can foresee the rest and stop failing. The definition keeps the brief and drops the purpose.
2. Line: JOB-14 (modified; Bob's own words, 31 Oct): "As suggested (keep) but the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail."
3. Main text: E: "After two failed corrections ARCH replaces the session with a fresh one, whose brief says what was corrected and why."
4. Evidence: MEASURED: the Foundations carried it whole: "the new session's brief states what was corrected and why, so it can anticipate the remaining corrections instead of repeating the failure (JOB-14, your note)" (`foundations.md` line 137). The second draft cut the last clause. No decision is recorded.
5. How bad: costs time (a third and fourth failure), minor in wording.
6. Proposed correction: "After two failed corrections ARCH replaces the session with a fresh one. Its brief says that corrections were made and what they were. The fresh session works out why they were needed, so that it can foresee every other correction the module needs and does not go on failing."

### Finding 8. The change across many modules: "while no job runs" has gone, and nobody is named to make it (P7, part changed from nowhere)

1. Counter-argument: Your line had this pass made by a helper in the architecture session while no job runs. Under slots that refill at once there is never a moment when no job runs, and the definition does not say who writes the many modules' files.
2. Line: P7: "A no-judgment change across many modules is one mechanical pass by a worker in BOB's session while no job runs, with one full test run before it is committed."
3. Main text: C: "A change that touches many modules in the same trivial way, needing no judgment, can be made in one pass. Some such changes are so trivial that module tests need not be rerun." B: a job "writes only its own module's files". J12 admits "The first never had a procedure."
4. From where: the "one full test run" ends by Bob's decision as a session recorded it (13 Nov: "The cross-module mechanical pass is preserved. Some mechanical changes are so trivial that module tests need not be rerun."), and H says so. "By a worker in ARCH's session" and "while no job runs" are dropped with no decision.
5. Evidence: REASONING (collision with open jobs' branches).
6. How bad: stops a tranche or corrupts open jobs' work when first used.
7. Proposed correction: C: "... can be made in one pass, by a helper inside ARCH's session, as your documents say. Your documents add 'while no job runs'; with slots refilled at once that moment does not arise by itself, and how the pass meets open jobs is not yet decided (section J, item 12)."

### Finding 9. Who starts ROOT's standby session (PLT-5, contradicted in part)

1. Counter-argument: Your ledger note says the standby is started beside ROOT by whoever starts ROOT, so that no session starts its own successor. In Process4 you start ROOT. Either the standby is one more act of yours, or ROOT starts the session that replaces it.
2. Line: PLT-5 (modified; note re-saved 14 Nov): "no session starts its own successor; depth stays at most 3 (coordinator, ROOT, BOB, job) ... The watcher is started beside ROOT by whoever starts ROOT."
3. Main text: B: "Sessions are at most three levels deep, and none starts its own replacement." K technical point 4: "For ROOT, keep Process3's standby session, woken once a day, which takes over, so that replacing ROOT is not an act of yours." B table: "There are no others".
4. Evidence: MEASURED: Foundations line 102: "Nothing starts its own successor: the watcher already exists, was started beside ROOT rather than by it". From 5 Nov ROOT started it (`roles_root_coordinator.md` line 28). Each takeover "put ROOT one level down" (same file, line 244) and "a takeover is a bridge only" (line 343), so an ARCH started after a takeover, and its jobs, sit a level deeper than B allows. That file's own conclusion left the watcher out of the Process4 set.
5. How bad: stops a restart after the first takeover (depth), or adds an owner act.
6. Proposed correction: K technical point 4 must say one of: "ROOT starts the standby. This departs from your ledger note, which has it started by whoever starts ROOT; Claude decided, so that it is not an act of yours. After a takeover jobs sit one level deeper, which is unproven (section J)." or "There is no standby. If ROOT dies you start a new ROOT (the act already on your list)." The second removes a mechanism and matches the B table.

### Finding 10. Three measurements you asked for are neither kept nor ended (SES-16, TXT-4, part of SES-15)

1. Counter-argument: Three times you wrote "I'm skeptical, but let's measure" or "let's try". The definition settles each matter without the measurement and without saying so.
2. Lines: SES-16 (modified; "I'm skeptical, but let's" is Bob's): "I'm skeptical, but let's measure on the first tranche, comparing tokens per wake against the handoff cost already paid." TXT-4 (modified; "I'm skeptical, but let's try to" is Bob's): "let's try to apply TXT-2 to the principles too; most roles need two or three of them." SES-15 (note re-saved 14 Nov): "Routing share measured after the first layer."
3. Main text: K technical point 4 decides how ARCH is replaced; I 8 ends the per-line test that TXT-4 was to apply; nothing mentions the three measurements.
4. Evidence: PLATFORM: "A task's fresh session cannot start sessions or send messages", 0 of 3, 2 Nov (disposition §6 row 19), which rules out the stateless form. MEASURED: neither measurement was ever taken (`ledger_map.md`, SES-16 Gap).
5. How bad: minor in effect; misleads Bob by silence.
6. Proposed correction: add to section I one item: "Three measurements your ledger asked for. A stateless architecture session against a handed-over one: cannot run, because a session started by an alarm cannot start sessions (0 of 3). Trimming the principles each role loads by the per-line test: the test ends at item 8. The share of ARCH's work that is routing: never taken. *Claude decided:* all three end unmeasured."

### Finding 11. The tranche report loses three things your lines put in it (GAP-12, PLN-6, parts silently dropped)

1. Counter-argument: The report in the definition leaves out the architecture session's idle time, the deferrals with their reasons and the work left, and gains a new item nobody asked for (addition A3).
2. Lines: GAP-12 (kept): "A tranche's report also states BOB's idle time while work was ready and the minutes of Bob's it took." PLN-6 (kept): "elapsed time, work finished, deferrals with reasons, work left, cost, and the share of cost that was process overhead."
3. Main text: G: "A tranche report: time, work done, cost, overhead, and the minutes it took of yours."
4. Evidence: MEASURED: "GAP-12 is the only stated measure of D1 and D2" (disposition §5E). MEASURED against the Process3 mechanism: "the idle alarm misfired for 2 h 22 min" (disposition row P19).
5. How bad: misleads Bob (the one number that shows whether the slots were kept full is gone).
6. Proposed correction: G: "A tranche report: time, work done, work left, anything deferred and why, cost, overhead, the time ARCH stood idle while work was ready, and the minutes it took of yours. Where a figure cannot be read it says 'unmeasured'." Or declare: "Claude decided: idle time is not reported, because the alarm that measured it misfired."

### Finding 12. Your own option to call for whole-product checks ends without being named (ARC-4, GAT-7, P11)

1. Counter-argument: In your own words the whole-product checks run "before a release or when I ask for one". The definition tells you two of your powers stay and does not tell you this third one ends.
2. Lines: ARC-4 (Bob's own words, 31 Oct): "... and over the whole product before a release or when I ask for one." GAT-7 (kept): "The full product regression runs only at a release or on your word". P11 (kept): "the full regression runs only at release or on Bob's word."
3. Main text: H: "**The full regression and whole-product checks before a release** (three lines, two of which also asked for layer checks). *Why:* the internal walk replaces them." Opening: "Two of your powers that the first draft proposed to end now stay."
4. From where: the session's record of 13 Nov ("No other test is necessary, ever. The internal walk replaces the full regression."). So it is a (c) by Bob's decision as recorded; the fault is that the ended power is not named.
5. How bad: misleads Bob.
6. Proposed correction: add to that bullet in H: "This also ends your own option, in your words of 31 Oct, to have them run "when I ask for one". If you meant to keep the option, say so."

### Finding 13. Design lanes are named once and defined nowhere (SES-14, P21, parts silently dropped); section F puts a second question to you

1. Counter-argument: Lanes are in your approvals and in two of your lines, in part in your own words. The definition gives them nine words in a list and no place among the sessions, yet your approvals let a lane's pull request merge with no tests run.
2. Lines: SES-14 (modified; "and design responsibility" and the last sentence are Bob's): "a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile. The lifecycle of a lane includes refreshes that BOB manages to keep the session depth consistant." P21: "A lane has one area of focus, reads it whole and delivers designs, never product code; jobs and lanes reach a lane only through BOB; BOB defines lanes without Bob's approval."
3. Main text: G: "Design lanes, with user experience always there." F: "one clause lets a design lane's pull request merge with no tests run, which is yours to keep or drop." Section B lists ROOT, coordinator, ARCH, job, worker and says "Sessions are at most three levels deep". The opening says "One question is still yours, in section K."
4. Evidence: MEASURED: the approvals' lanes paragraph ("lane-only pull request lands without a suite run", `permissions_inventory.md` section 1a). REASONING: a lane pull request is a merge that is not a job's and that test one does not cover.
5. How bad: costs Bob time; a second way to merge outside C steps 1 to 8.
6. Proposed correction: add to B: "**A design lane** is a folder of design knowledge and a design responsibility. ARCH starts a helper or a session for it when a design is needed, and manages its refreshes so that depth stays the same. It delivers designs, never product code, and is reached only through ARCH. User experience is always there." Move F's "yours to keep or drop" into section K as a second question, or change the opening to "Two questions are still yours".

### Finding 14. Smaller attribution faults

| # | Main-text sentence | What the source shows | Proposed wording |
| --- | --- | --- | --- |
| 14a | J: "By your own rule, nothing here is in force until it has run on a real tranche." | Foundations line 9 (a session-drafted document): "Nothing here is in force until it has run on a real tranche with the two health metrics measured." Claude retired those two metrics at K point 5. The rule is quoted without the half Claude ended. | "By the rule in your Foundations, nothing is in force until it has run on a real tranche "with the two health metrics measured". Claude has retired those two (section K, point 5), so that half is not met." |
| 14b | D: "One module already has an upgrade test among its own tests, which you kept on 8 Nov" | `DECISIONS.md` BD-R4, a session's record quoting Bob: "migrate-released need only look at perhaps the last 2 or 3 versions just to make sure that the migration process actually works." He narrowed it. "Kept" is Claude's reading. | "which a decision record of 8 Nov quotes you as narrowing to the last two or three releases" |
| 14c | I 2: "end the every-job form, as you began to on 9 Nov" | `DECISIONS.md` PD-21, headed "(Bob, 9 Nov)", item 4 "The setup check runs once per pin". The record quotes Bob only in general: "Is this needed at all? If so, it must be done efficiently. If not, then cut it." No words of his name this check. | "as a decision record of 9 Nov began to, on your general instruction to cut what is not needed" |
| 14d | I 7: "checks were added in 41% of merges both before and after you told sessions to stop" | Bob's words as sessions quote them, 5 Nov: "We only add additional checks when we can confirm from factual study and data." His own typed sentence in the field report: he "told CC repeatedly not to add checks that reduced development velocity without evidence of an absolute necessity". He set a condition; he did not say stop. | "after you told sessions to add a check only on evidence" |
| 14e | I 11: "Your decision to preserve permission management covers it." | Session's record of 13 Nov: "Process3's permission management is preserved." That it covers this particular check is Claude's reading; the session's own withdrawn proposal had recommended removing the check (`live_docs.md` B, item 11). | "Claude reads the session's record of your decision to preserve permission management as covering it." |
| 14f | F: "design lanes (your standing design areas, such as user experience)" | P21 (kept by Bob): "BOB defines lanes without Bob's approval." Foundations: "You identify the need for a lane and BOB opens it". | "design lanes (design areas you point out and ARCH sets up, such as user experience)" |
| 14g | I 6: "You asked for it to be tried with an open mind." | Bob's own typed words (ledger note, REC-9): "Try this, but measure the experience with an open mind as to whether it's work or not." The open mind is on the measuring. The item then says honestly that the measurement was never taken. | "You wrote: "Try this, but measure the experience with an open mind"." |

Correctly attributed, for the record: I 1 "Process3's decision record quotes you on 9 Nov" (it does, `DECISIONS.md` line 160); H "A session's record of 14 Nov gives the reason as your word"; the "Notes in your ledger" paragraph in K, which is more careful than the session's own record (that record says "you rewrote all six notes yourself"; the store has no author field); "your word adds or reorders work" (Foundations line 127); "as your documents say" at C, K point 4, and K technical points 1, 3, 10 and 14 (each rests on a stored ledger decision). Sources by kind for every "you" sentence are in section 5.

### Finding 15. Model, effort and mode: two clauses of your sentence are lost (SES-8, way changed by Claude; parts from nowhere)

1. Line: SES-8 (modified; "permissions mode" added twice by Bob): "Models, effort, and permissions mode come from one table, picked by the start command; always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand."
2. Main text: K technical point 12: "*Decided:* ROOT passes your suggestion to every session it starts." B: "It may suggest a model and effort". F: "Every session runs in Auto mode, the only mode the platform allows here."
3. What is lost: "always a model and effort sufficient for quality" (nothing says what is used when you suggest nothing); jobs are started by ARCH, not ROOT, so "every session it starts" does not reach them; your own clause on permissions mode cannot be met, and the text does not say so.
4. Evidence: PLATFORM: "No locked-down (dontAsk) session can exist on the account", 1 Nov (disposition §6 row 9).
5. How bad: minor; a job on a weak model costs a round.
6. Proposed correction: K technical point 12: "*Decided:* your suggestion is passed to every session, by ROOT and by ARCH to each job. Where you suggest none, a model and effort sufficient for quality, as your ledger says. Your words "a permissions mode appropriate for the task" cannot be met: the platform allows only Auto mode here (section F)."

### Finding 16. How a process fault is reported, and the cost alarm (MSG-5 silently dropped; MNT-7 by the blanket; GAP-2 part dropped)

1. Lines: MSG-5 (kept): "A flaw report from a product session reaches the process by the state branch and the reply by main of the process repository". MNT-7 (kept): "A flaw report is filed from any session by one command, listed at each status, answered by main; a flaw found anywhere is never fixed in place." GAP-2 (kept): "its cost per attempt is an alarm the sweep reads, not a cap."
2. Main text: E: "**The process itself has a fault.** Claude fixes it." K technical point 2: "a short session started for that one fix". K technical point 1 ends the state branch that MSG-5 travels on. I 4: "end it as a duty on jobs. Report cost where it can be read." Nothing says who reports a fault, to whom, who starts the fix session, or that a fault is "never fixed in place". Nothing says the cost alarm ends.
3. Evidence: MEASURED: both routes were "never built" (`ledger_map.md`: later gate). REASONING for the effect.
4. How bad: costs time; a job that works around a fault in place is the Process3 pattern.
5. Proposed correction: E: "A session that finds a fault in the process reports it to ARCH and does not fix it where it stands. ARCH starts the fix session." I 4: add "The cost alarm in your ledger goes with it."

### Finding 17. Decision records (REC-11, silently dropped)

1. Line: REC-11 (kept): "Decisions go to short architecture decision records the moment they are made, each in its own file, never as a line in a long plan."
2. Main text: nothing says where ARCH's technical decisions, or your decisions, are kept. G counts the line among the 45 whose way is "set by your decisions or still open"; no way is set and K lists none as open.
3. Evidence: MEASURED: "DECISIONS.md went from nothing to 49 KB and 31 headings in four days, in one file"; "23 of the 26 PD records are headed "coordinator"" (disposition row REC-11).
4. How bad: misleads Bob (ARCH "tells you in plain words what it did", with no place named).
5. Proposed correction: G, "The record": "A decision is written once, where it is made: yours in your own words, ARCH's in the pull request it concerns." Or declare the line ended and name the decider.

### Finding 18. The shadow slice has become a list of small trials, and section J says a small trial can "prove" (MNT-8 changed from nowhere; dropped MNT-12 echoed)

1. Lines: MNT-8 (modified; first sentence is Bob's): "Certification is a long-term goal that indicates that it's ready for general use. ... one shadow of a representative slice, then the live first tranche is the certification with SES-11 and SES-12 measured". MNT-12 (dropped by Bob): "A process is declared in force the day it is written, certified on a two-module toy."
2. Main text: J: "Each item is a claim, then the smallest trial that would prove or break it." J6: "*Trial:* two slots, three modules with work." J2: "*Trial:* one run through."
3. Evidence: MEASURED: "Toy flaws and product flaws were disjoint" (`foundations.md` line 260, the reason MNT-12 was dropped). Section J8 itself is careful ("It cannot prove it"); the header sentence is not.
4. How bad: misleads Bob (a passed toy trial read as proof).
5. Proposed correction: J header: "Each item is a claim, then the smallest trial that could break it. A trial that passes proves nothing by itself: your ledger makes a slice of the real product, and then the first real tranche, the proof." No trial is added.

### Finding 19. The per-line test is ended at I 8 but still stands in a note re-saved on 14 Nov (TXT-1, contradicted in part)

1. Line: TXT-1 (modified; note as stored 2026-11-14T00:15:24Z): "hand-written means BOB writes and keeps the product's CLAUDE.md line by line, each line passing the per-line test ... each change listed in the tranche report; the approvals block stays Bob's own."
2. Main text: I 8: "**A line-by-line test of instruction files in place of a size limit** (two lines). ... *Claude decided:* end it."
3. Evidence: MEASURED (the store). The store cannot show who re-saved the note.
4. How bad: minor; a third line is touched and not counted.
5. Proposed correction: I 8: "(two lines, and a clause in a third: the note on who writes the product's CLAUDE.md, re-saved on 14 Nov, still asks for it)".

### Finding 20. Which document governs (GAP-9, by the blanket)

1. Line: GAP-9 (kept): "The Ledger, the Foundations and the Build Plan agree ... no build starts on a line any of them contradicts."
2. Main text: the opening, "The appendix shows where each of your 288 requirement lines went." After this definition the store still shows "keep" or "modify", not "drop", for all 22 lines the definition ends, INT-4 among them.
3. Evidence: MEASURED: a session restored a removed check by citing ledger lines (finding 1).
4. Proposed correction: G, last bullet: add "Where this definition and the Ledger differ, the definition governs once you accept it. No session changes your stored answers."

### Finding 21. The module order is repaired by Claude alone (P4, part)

1. Line: P4 (kept): "BOB, with Bob, defines layers and modules in one total order".
2. Main text: K technical point 8: "*Decided:* correct the module list where the code already runs one way, and turn one registration between two modules around. Nothing a user sees changes."
3. Evidence: MEASURED: the session's own record said the repair "depends on two things that are yours" (`assessment_doc.txt` line 47). One of the two (the size cap) is ended at I 3; the other (a sign-in relay to retired routes) is not mentioned.
4. Proposed correction: K technical point 8: add "Your line has the order defined with you; this repair moves three modules and is reported here for that reason. The session's record named one thing in it as yours, a sign-in relay to retired routes; Claude judges it changes nothing a user sees."

### Finding 22. Long steps (PLT-4)

Line: "No step runs longer than the in-session background limit; anything that can is a CI workflow." Main text: C "several sessions walk it there ... Each external walk took about an hour." The main text does not say that the walk's steps run on GitHub's machines. MEASURED: 60 and 64 minutes (disposition row PLT-4); PLATFORM: the limit is about thirty minutes. Proposed correction: C, "End of a round": "The walking sessions start the journeys on GitHub's machines and read the results; no session runs a step longer than the platform's limit."

### Finding 23. Twenty measurements where your line says one (GAP-11, contradicted in part)

Line: GAP-11 (kept): "A platform behaviour is measured once by default, more only when the first result is ambiguous or a failure recurs". Main text: J1: "*Trial:* twenty or more merges by ARCH". The reason exists (the checker passes and refuses the same act minutes apart, PLT-2's source) but is not given. Proposed correction: J1: "Twenty, not one, because the checker has passed and refused the same act minutes apart."

## 3. The eight dropped lines

None comes back as a rule. Checked one by one:

| Dropped line | In the main text? |
| --- | --- |
| ENF-4 a hook refuses a short read | No. Its softer successor, the reading audit, is ended by Claude (I 10). |
| ENF-5 a hook refuses a turn's end until a refresh | No. |
| REC-12 a multi-writer issue tracker | No. |
| INT-6 a mandated test-first red step | No. The nearest thing, the revert check, is ended in H. |
| MSG-7 doorbell and mailbox | No. Notices are work against a module, not a mailbox. |
| MNT-2 the process as twelve modules | No. |
| MNT-12 in force the day written, certified on a toy | Echoed in J's header sentence (finding 18). J's first sentence says the opposite. |
| P16 every rule names its principle; principles change only with Bob's approval | No. The wall in K gives Bob the say over every change to the process, which is a different thing and is put to him as a question. |

## 4. Additions: things in the main text that no line and no decision of Bob's asks for

Bob's rule is that the definition starts from his documents and designs nothing afresh. Each of these is labelled "Claude decided" in the text unless noted. None is hidden; all are new.

| # | Addition | Main-text sentence | Why it is new | Proposed correction |
| --- | --- | --- | --- | --- |
| A1 | A release walk on a copy installed by the real installer | C: "Claude decided that this walk is run on a copy installed with the real installer, since a development deployment does not use the installer." | A new mechanism. The worker who studied it called it "unbuilt and unproven" (`k_evidence.md` line 99). It is not in section J, so the text asserts something unmeasured. It also sits oddly beside D: "there is no separate install test ... before a release". | Remove the sentence, leaving "It must have passed an external walk, as your documents say." Or keep it and add it to J as unproven and unbuilt. |
| A2 | The external walk run by a fixed rule after every tranche | C: "Claude decided how the option works: a fixed rule runs it after every tranche, no session chooses, and you skip it by telling the coordinator." | The session's record says only "An optional ... walk runs after that". Run by default, with its findings made "the first work of the next tranche", it works as a fourth standing test beside "exactly three tests, and no others, ever", and exercising the option becomes an act of Bob's. | "It runs when you ask for it, and before a public release, which your documents require. It is not one of the three tests and holds nothing back." This removes a standing run. |
| A3 | A new item in the tranche report | G: "Claude decided that it also carries the walk result at the end of each round: steps passing out of steps in all, with any steps added or removed since the last round shown beside it" | A new record kept round by round, replacing two measures Claude retired (K point 5), while three things Bob's lines put in the report are left out (finding 11). | Remove "with any steps added or removed since the last round shown beside it". State the caution once in J11 instead: "sessions write the walk's steps, and in Process3 the count moved". |
| A4 | A new kind of session: the process-fix session | K technical point 2: "a short session started for that one fix and ended when the fix is merged, by itself or by you" | Not among B's roles. Bob's line MNT-1 has the process built "as a product under itself", by jobs. Who starts it and at what depth is not said. The heading's second half ("which repository the coordinator holds") is not answered. | Add it to B with its starter and depth, and say in K: "This replaces your line that the process is built like a product, by jobs in tranches; Claude decided." Answer the second half or delete it. |
| A5 | The wall and what comes with it | K: "It reaches the process only when you press the merge button"; "Each fix comes to you with one plain sentence ... and the size of the process before and after"; "keeping the version of the process that a product uses where only you can move it, and running the module tests from a place a job's pull request cannot alter" | A new act of Bob's for every fix, a new record, a second new act (moving the version), and a new mechanism. The text says honestly "Your requirements exclude such an act today" (GAP-10, P19, MNT-5). | It is put as a question, which is the right form. Add to "Why it matters to you": "Taking the wall also makes moving the process version an act of yours, and ends your line that a blocking fix is adopted without you." |
| A6 | A comparison at the end of every round of the first tranche | J9: "at each round's end in the first tranche, compare the process's files with round 1" | Called a trial, but it recurs through a real tranche and no session is named to do it. | "At the end of the first tranche, compare the process's files with those at its start." One measurement, once. |
| A7 | Two small reports | C: "The process prepares the release and shows you what it carries." K technical point 7: "ARCH, which reports it." | New, small, harmless. | Leave, or drop "and shows you what it carries" (GAP-7 asks only for the approval). |

Not counted as additions, because a source exists: the coordinator as front door (`DECISIONS.md` BD-R2, quoting Bob, 8 Nov; session's record of 13 Nov); the set-up row in B's table (platform fact; P17's note on onboarding steps; GAP-8's page of steps); Bob committing the deny list (`permissions_inventory.md` 1b: "Who edits it. The owner only, by website commit"); the working rules in F (Foundations, permissions sections); "a failure already on the tranche branch ... is named" (Foundations row F-JOB-8); the notice naming the changed parts (session's record of 13 Nov); the trials in J other than J9 (one-off measurements).

## 5. Every "you" sentence in the main text, by kind of source

Kinds: OWN = Bob's own typed words (ledger notes he worded, his approvals commits); STORED = a stored ledger decision (keep, modify or drop on a session-drafted line; the store itself is a session-carried copy re-seeded on 14 Nov, `live_docs.md` A2); DOC = a session-drafted document Bob adopted (Foundations); REC-Q = a session's decision record that quotes him; REC = a session's record of what he said, no quotation; CLAUDE = Claude's reading or decision.

| Main-text sentence | Kind | Note |
| --- | --- | --- |
| B "Only words you wrote yourself count as your word." | REC or CLAUDE | finding 2e |
| C "You made this walk optional." | REC | finding 2c |
| C "as your documents say" (release walk) | STORED | P22 |
| D "which you kept on 8 Nov" | REC-Q, read by CLAUDE | finding 14b |
| D "Your documents say: the services listed in the public part" | DOC | Foundations; REQ-1 |
| D "as you require" (rigorous and correct) | REC | 13 Nov |
| E "as your documents already ask" (unmeasured) | STORED | SES-9 |
| F "in your own words" (approvals) | OWN | his website commits |
| F "your standing design areas" | DOC, reworded | finding 14f |
| G "Your decisions of 13–14 Nov settle ten more" | REC | finding 2a |
| G "set by your decisions or still open" | CLAUDE | finding 2f |
| G "The eight things you already dropped" | STORED | correct |
| H "Fifteen lines end by your decisions" | REC | finding 2a |
| H "you decided there are no layers" | REC | finding 2a |
| H "your decision" (review) | REC | finding 2a, 2d |
| H "on 13 Nov you confirmed these end" | REC, in quotation marks | finding 2b |
| H "A session's record of 14 Nov gives the reason as your word" | REC, said to be so | correct |
| H "only you change the number" | REC | 13 Nov |
| I 1 "Process3's decision record quotes you on 9 Nov" | REC-Q, said to be so | correct |
| I 2 "as you began to on 9 Nov" | REC | finding 14c |
| I 6 "You asked for it to be tried with an open mind" | OWN, paraphrased | finding 14g |
| I 7 "after you told sessions to stop" | REC-Q, overstated | finding 14d |
| I 11 "Your decision to preserve permission management covers it" | REC, reach by CLAUDE | finding 14e |
| J "By your own rule" | DOC, half quoted | finding 14a |
| K "Your requirements exclude such an act today" | STORED | GAP-10, P17 |
| K 4 "It stays, as your documents say" | STORED | GAP-10 |
| K 8 "Your word still adds and reorders work, as your documents say" | DOC | Foundations line 127 |
| K technical 1 "which your documents allow" | STORED | REC-1 note (the session's suggestion, accepted) |
| K technical 3 "your kept rule" | STORED | MNT-5 |
| K technical 10 "which your documents keep" | STORED | REQ-3 |
| K technical 14 "your documents list" | STORED | SHM-1 |

## 6. Every kept or modified line

Classes: a = stated in the main text; blanket = covered only by "so 208 stand"; b-bob, b-claude, b-nowhere = way changed, by whom; c-bob, c-claude = ended and declared, by whom ("bob" always means "as a session recorded it"); d, d-part = silently dropped, whole or in part; e = contradicted.

| Line | Class | Where, and what is missing |
| --- | --- | --- |
| PLT-1 | a | G "The process stands only on measured platform behaviour"; the dated table itself is not named |
| PLT-2 | a | F "Nothing needed for correctness depends on archiving a session or switching off an alarm"; "counted and reported" not carried |
| PLT-3 | a | F, the deny list (line replaced in the ledger by GAP-6) |
| PLT-4 | a | C step 6 "module tests run on GitHub's machines, not in the session"; nothing says where an hour-long walk runs (finding 22) |
| PLT-5 | a | B "at most three levels deep, and none starts its own replacement"; contradicted in part by K technical point 4 (finding 9) |
| PLT-6 | a | B "the hourly alarm is only the safety net" |
| PLT-7 | a | F "with one repository only"; G "Its own repository. One fixed version per tranche" |
| PLT-8 | blanket | privileged GitHub acts by workflows with the owner's tokens: not in the main text |
| PLT-9 | d-part | "gathered once" is carried (B table, secrets row); the check at every tranche open is neither stated nor ended (finding 1) |
| PLT-10 | a | B "Git and GitHub hold all state" |
| ENF-1 | blanket | hooks are not mentioned |
| ENF-2 | blanket | not mentioned |
| ENF-3 | blanket | "nothing holds a turn" not stated; the stop on his word is at K technical point 6 and J12 |
| ENF-6 | a | E "The hourly alarm catches a dead session that no event reported" |
| ENF-7 | a | E "A job that cannot go on records that it is blocked, pushes everything and stops" |
| REC-1 | b-claude | K technical point 1: working state in each job's pull request |
| REC-2 | a | G "One writer per file" |
| REC-3 | a | G "starts from a status read-out, not from notes"; K technical point 4 |
| REC-4 | a | D test one's trigger is the module's files or tests only |
| REC-5 | blanket | not mentioned |
| REC-6 | blanket | not mentioned |
| REC-7 | a | G record theme |
| REC-8 | c-claude | I 10 |
| REC-9 | c-claude | I 6 (attribution note, finding 14g) |
| REC-10 | c-claude | I 5; the same Process3 check also guarded the approvals block (finding 1) |
| REC-11 | d | decision records: neither stated nor ended; no way named (finding 17) |
| ARC-1 | a | D test one "a check that the uses the module declares match what its code imports"; the layer clause ended in H |
| ARC-2 | b-claude | rule in C step 5 and G; its check ended by Claude (D, K point 1), declared |
| ARC-3 | blanket | not mentioned; the session's 13 Nov record lists its check as ended (finding 1) |
| ARC-4 | c-bob | H, second bullet; but two parts of Bob's own sentence are not accounted for (findings 1 and 12) |
| ARC-5 | blanket | not mentioned |
| REQ-1 | a | G "public and a private part under permanent numbers" |
| REQ-2 | a | G "stating behaviour"; "an ambiguity is removed by rewriting" not stated |
| REQ-3 | a | K technical point 10 |
| REQ-4 | blanket | marks appear in C step 1; who strikes them is not stated |
| REQ-5 | a | B "Technical questions are not brought to you"; the route for a question that is his is missing (finding 6) |
| REQ-6 | c-claude | I 3 |
| REQ-7 | e | B coordinator paragraph makes every word told to the coordinator "followed" (finding 5) |
| PLN-1 | a | "Words used here": tranche, round; layers ended in H |
| PLN-2 | b-bob | no plan; "has work and no job already open" (13 Nov record) does the plan's job; deferral reasons not stated |
| PLN-3 | a | C step 5; C "Each finding becomes work for a named module" |
| PLN-4 | c-claude | K technical point 11 |
| PLN-5 | b-claude | K technical point 6; J12 |
| PLN-6 | a | G reports; "deferrals with reasons" and "work left" dropped (finding 11) |
| PLN-7 | a | K point 7 "for each product" |
| JOB-1 | a | C step 5; G "One module, one branch, one draft pull request" |
| JOB-2 | a | C step 4; F "starting instructions that name every act it may take" |
| JOB-3 | blanket | taking in earlier unmerged work: not mentioned |
| JOB-4 | a | E "A fault that blocks work pauses the product until the process is fixed; the same jobs then continue" |
| JOB-5 | a | C step 6; the seconds-long local checks are not mentioned (finding 1) |
| JOB-6 | a | E "A job's session dies" |
| JOB-7 | c-claude | I 1; the half about flaws found elsewhere is kept (C step 5) |
| JOB-8 | blanket | not mentioned; the session's 13 Nov record lists it as ended with GAT-4 (finding 1) |
| JOB-9 | a | E "records that it is blocked, pushes everything and stops" |
| JOB-10 | c-claude | I 4 |
| JOB-11 | blanket | replaced in the ledger by GAP-2; see GAP-2 |
| JOB-12 | c-bob | H "Three checks"; the attribution is faulty (finding 2b) |
| JOB-13 | c-bob | H "Deliberate-fault sampling" |
| JOB-14 | b-nowhere | E "whose brief says what was corrected and why": Bob's purpose clause is cut (finding 7) |
| GAT-1 | a | C step 6 |
| GAT-2 | a | D test one "never another module's" |
| GAT-3 | a | D test two and "Interface changes" |
| GAT-4 | c-bob | H "Three checks" (attribution: finding 2b) |
| GAT-5 | blanket | not mentioned |
| GAT-6 | a | D test one trigger |
| GAT-7 | c-bob | H, second bullet |
| GAT-8 | c-bob | H "Three checks" (attribution: finding 2b) |
| INT-1 | a | C steps 7 and "End of a tranche" |
| INT-2 | c-bob | H "Review by a fresh reviewer" |
| INT-3 | a | replaced by GAP-10; C step 7 "no review and no act of yours" |
| INT-4 | c-bob | H; correctly attributed to "a session's record of 14 Nov" |
| INT-5 | a | F last working rule |
| INT-7 | c-bob | H "Review by a fresh reviewer (two lines)" |
| SES-1 | b-bob | B roles; ROOT stays a session (13 Nov record); the note's scheduled-task form is not adopted and not said to end |
| SES-2 | b-claude | K technical point 4 |
| SES-3 | b-claude | K technical point 4; G "not from notes" |
| SES-4 | blanket | refresh threshold printed by status: not mentioned |
| SES-5 | blanket | not mentioned |
| SES-6 | c-claude | I 9, for the process's own texts only; the rest stands by the blanket |
| SES-7 | blanket | not mentioned |
| SES-8 | b-claude | K technical point 12 and F "Auto mode"; two clauses of Bob's own wording lost (finding 15) |
| SES-9 | a | E "writes 'unmeasured'"; I 4 |
| SES-10 | blanket | B "returns its result and ends"; receipts not mentioned |
| SES-11 | a | G reports, "overhead" |
| SES-12 | c-claude | K point 5 |
| SES-13 | blanket | not mentioned |
| SES-14 | d-part | G "Design lanes, with user experience always there" only; no role, starter or lifecycle (finding 13) |
| SES-15 | d-part | routing is at B (ARCH passes notices); "toward Bob ... context, options and a recommendation" and the measurement are gone (findings 6, 10) |
| SES-16 | d | the measurement Bob asked for: neither stated nor ended (finding 10) |
| SES-17 | blanket | not mentioned |
| SES-18 | a | B worker; the reviewer use ended in H "Parts of kept lines" (finding 2d) |
| TXT-1 | a | F approvals block; the rest (thirty lines, pin and fetch line, ARCH writes it) not mentioned; its 14 Nov note conflicts with I 8 (finding 19) |
| TXT-2 | c-claude | I 8 |
| TXT-3 | a | G texts |
| TXT-4 | d | the trial Bob agreed to: neither stated nor ended (finding 10) |
| TXT-5 | blanket | not mentioned |
| TXT-6 | c-claude | I 7 |
| TXT-7 | blanket | not mentioned |
| MSG-1 | a | B "Git and GitHub hold all state. Sessions are woken by events" |
| MSG-2 | a | B coordinator paragraph |
| MSG-3 | blanket | not mentioned |
| MSG-4 | a | E "one plain message with a numbered list of what is yours to do" |
| MSG-5 | d | how a process flaw is reported and answered: no way named (finding 16) |
| MSG-6 | blanket | not mentioned |
| MNT-1 | b-claude | G maintaining; K technical point 2 replaces "jobs on branches ... built in tranches" with one-off fix sessions, not said to change this line (addition A4) |
| MNT-3 | blanket | not mentioned; moot once the process has no tranches of its own |
| MNT-4 | a | G "One fixed version per tranche, changed only by a recorded act"; the start-up verification of the pin is not mentioned (finding 1) |
| MNT-5 | a | E; K technical point 3 |
| MNT-6 | a | E "A fault that blocks nothing waits for the next tranche" |
| MNT-7 | blanket | not mentioned; "never fixed in place" absent (finding 16) |
| MNT-8 | b-nowhere | J's trials stand where "one shadow of a representative slice" stood; nobody is named as deciding it (finding 18) |
| MNT-9 | blanket | not mentioned |
| MNT-10 | blanket | not mentioned |
| MNT-11 | blanket | not mentioned |
| SHM-1 | b-claude | K technical point 14; the drift check is neither stated nor ended (finding 1) |
| SHM-2 | blanket | not mentioned |
| SHM-3 | blanket | not mentioned |
| SHM-4 | blanket | carrying a running tranche over: not mentioned |
| SHM-5 | blanket | not mentioned |
| P1 | a | A, second and third sentences |
| P2 | a | G maintaining; C step 1 |
| P3 | a | E "A fault that blocks work pauses the product until the process is fixed" |
| P4 | a | "Words used here: Module"; D test one; "with Bob" is not kept at K technical point 8 (finding 21) |
| P5 | a | G modules and requirements; D "Interface changes" |
| P6 | a | I 3 "Keep its purpose: a module fits in one reading" |
| P7 | d-part | "every requirement is tested ... and proven met" is not stated; the cross-module pass is in C (findings 4, 8) |
| P8 | a | C step 2 "no job already open" |
| P9 | a | C step 5; "BOB confirms it" and "a flaw in the requirements goes to BOB and Bob" not stated |
| P10 | c-bob | H "Layers"; concurrency and "nothing waits" carried in C |
| P11 | c-bob | H, second bullet |
| P12 | a | C "End of a tranche"; "the close ... re-runs the checks" neither stated nor ended (finding 1) |
| P13 | a | G sessions; K technical point 4 |
| P17 | a | A and B; "with options and a recommendation" not carried (finding 6) |
| P18 | d | nothing prepares the next round or tranche (finding 3) |
| P19 | a | C step 8; E "other work goes on" |
| P20 | a | G record; I 10 |
| P21 | d-part | lanes named once in G; "a question that is Bob's becomes his decision and a design before anything is built" not stated (findings 6, 13) |
| P22 | a | C "A public release"; regression clause ended in H; external-walk findings go to the next tranche by Claude's decision (K point 6) |
| P23 | a | I 5 "Keep its purpose: a lean repository" |
| GAP-1 | b-bob | A "while nobody watches"; E "completely blocked": his "CAN RUN" and "reaches him" are reworded (finding 6) |
| GAP-2 | d-part | own checkout by the blanket; the cost alarm neither stated nor ended (finding 16) |
| GAP-3 | b-bob | E "may only correct or remove" (14 Nov record) with I 7 |
| GAP-4 | a | G "starts from a status read-out"; C step 3 |
| GAP-5 | a | B "woken by events"; C step 8 |
| GAP-6 | a | F; I 11; the check that guarded the approvals block in git is not mentioned (finding 1) |
| GAP-7 | a | C "A public release" |
| GAP-8 | a | B coordinator paragraph and table; J12 |
| GAP-9 | blanket | the appendix does this; the main text does not say which document governs (finding 20) |
| GAP-10 | a | C step 7; K point 4 |
| GAP-11 | blanket | not mentioned; J1 asks for twenty or more measurements (finding 23) |
| GAP-12 | d-part | "the minutes it took of yours" carried; "BOB's idle time while work was ready" dropped (finding 11) |

## 7. Slips inside the main text met on the way (not ledger findings)

- F: "Unchanged from Process3: all of the above, and merging through the merge tool. The tool's three rules that demanded a review come out, which is a removal." K point 1 also takes the own-files check out of the merge tool, and H takes out the second test run. "Unchanged" and "three rules" understate it.
- K: "Your seven earlier open points" has eight numbered items; "Six were technical and Claude decided them" fits five of them (1, 2, 5, 6, 7).
- D: a notified job "runs only the tests that relate to them", while test one runs "that module's tests" on GitHub's machines whenever the module's files change, and C step 6 says tests do not run in the session. Where the narrower run happens is not said.
- G: "Releases. The process owns ... nothing on a live site." C deploys to a development site and walks it there.

## 8. Limits of this audit

- I read the main text against the ledger lines only. The 137 Foundations rows of the 288 were used as evidence, not audited.
- "Stated in the main text" is a judgment. Where a line is carried by a few words of a theme in G, I counted it (a) and wrote what is missing in section 6.
- Whether Bob himself made the six store changes of 14 Nov cannot be shown; the store has no author field.
- I could not read the conversation in which Bob gave his decisions of 13 and 14 Nov. Every statement here about what he "decided" on those days rests on `assessment_doc.txt`, a session's text.
