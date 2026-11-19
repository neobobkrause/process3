Length: N lines. Last section: "B5. Unmarked rules with no source at all".

# What the Process4 design puts in the owner's name, checked against his own words

Written by a Claude audit worker on 19 Nov 2026. Nothing was edited but this file and its second part, `attribution_audit_2.md` (the approvals blocks, how each kind arose, and what was read). Plain words; "part 4:157" means part 4 of the seventh draft, line 157 of that part's own file. "Build 03" is a build text in `process4/definition/process4_build_v1/`.

## How this was checked

- His words were taken only from: the nine files in `process4/owner_words/`; the two Foundations files in `process4/evidence/`; and the approvals texts he committed himself (git shows his name as author), on Process3's `tranche` branch here (`CLAUDE.md`, `.claude/settings.json`) and in `neobobkrause/process3-probes` (`tranche` branch).
- A passage is "found only via an earlier record" when it appears only in a file a session wrote that says it quotes him. Those records are named. They may be right; they are not his typed words.
- Being committed by him does not make text his words. Git shows he committed both first-build approvals blocks exactly as Claude wrote them (process4 `main`, commit `a89c80c`; process3-probes `p4-tranche`, commit `be99278`; both 18 Nov Pacific time, 19 Nov UTC). Those blocks are split sentence by sentence in the second file.
- The two Foundations files were written by a session ("Oct 31, 2026 · @Sparky2", foundations.md:3) from his ledger. Where they quote him ("Bob: ...") the quotation is counted as his. Where they state a rule in their own words, often addressed to him ("your word"), it is counted as an earlier record, not his words.
- No file of his typed words exists for 18 or 19 Nov. Everything the design says he decided on those days comes through Claude's own files.

## In short

- Quotations checked: 34 presented as his. 20 are word for word in his typed words. 7 are found only via an earlier record. 4 are not his words at all: one is a phrase a Claude file wrote, one pair is the Foundations' own sentences called "his written instructions", one is a note of his word that exists only in a Claude handoff. (Three more passages in his first person are Claude's text: see the second file.)
- Rules: about 45 unmarked or "on the owner's word" rules rest only on Claude's design state of 18 Nov; about 20 only on the session's record of 13 and 14 Nov; about 12 only on the Foundations; 9 claims name him explicitly with no source in his words.
- One correction to the earlier checks: part 8:46 ("which the owner expects Codex to need and the process to support cleanly") is in his words, `bob_words_16_17nov_codex_development.md:29`.

## A. Quotations

### A1. Not found in his words

1. **"Shall I record that as a decision?"** Part 1:39 and starting text `coordinator.md:21`. Part 0 line 21 says quotation marks mean his words unless they name a term, a mark or an option; this is none of those. It is the question a session asks, written by Claude in `working/design_state_18nov.md:47`. Not his.
2. **"caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change".** Part 6:60, introduced as "His written instructions, as a field report quotes them". They are the Foundations' own sentences (foundations.md:38; foundations_tranche_9nov.md:44), in a paragraph headed "your direction, 2 Nov" and addressed to him ("your word"). The "your" shows they were not typed by him. The idea is his direction as the Foundations record it; the words are not his.
3. **"these current values"** (part 5:16). Found only in `working/design_state_18nov.md:43`, Claude's record of his 18 Nov words ("let's use these current values for now so that we move forward with the next task"). Not in his typed words.
4. **"The throwaway repo to use is neobobkrause/process3-probes ... You have my permission to use it however you need."** `trial_repo_approvals.md:5`, dated 19 Nov. Found only in `working/handoff_18nov_walkthrough_session.md:38`, a Claude handoff. His nearest typed words: "The throwaway repo that you need already exists: process3-probes." (`bob_words_14nov_b.md:3`).

### A2. Found only via an earlier record

5. **"a check that the module's declared uses match its imports"** (part 2:59). The line itself says "in the words of the record of 13 Nov": the session's record of 13 and 14 Nov, `process4_definition_v6.md:145` (record line 5). Not in his typed words.
6. **"always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand"** (part 4:33). Via his ledger: line SES-8, given as "Note (owner's own words)" in `evidence/ledger_lines.md:967` and as his modification in `working/live_docs.md:119`.
7. **"be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account"** (part 9:14; build 03:20 and 03:110). Via Process3's decision record, `DECISIONS.md:117` on the `tranche` branch, quoting Bob, 8 Nov. His sentence there begins "(But be careful".
8. **"The first run or two of the external system will run without without an AI account connected."** (build 03:21). Via `evidence/DECISIONS.md:123`, "Decision, in Bob's words (9 Nov)".
9. **"His first prompt says he is starting or restarting development of a named product ..."** (`starting_texts/00-index.md:68`, "The owner's description of the plain prompt"). It is the session's record of 13 Nov, line 16 (`process4_definition_v6.md:156`), there in the second person ("Your first prompt says ..."), here turned into the third. Not his typed words.
10. **"The owner left the count to the AI on 19 Nov"** (part 4:157; part 10:20). Not a quotation, but a claim of his decision. Only source: `working/handoff_18nov_walkthrough_session.md:48`, which quotes him: "Why are you asking me to count lines. You can do that, correct? Keep going."

### A3. Word for word in his typed words (checked)

Part 0:9 "the process4 requirements" (`bob_words_14nov_b.md:25`); part 0:72 and 0:73, the two walks (`14nov_b.md:9`); part 0:77 "a word table change" (`14nov_c.md:35`); part 1:47 plain words (`14nov_b.md:30`, his line goes on "I have not read your working files."); part 2:30 (`14nov_b.md:7`); part 2:31 (`14nov_c.md:35`); part 2:56 (`14nov_b.md:7`); part 2:59 "I think it has to check tests too" (`14nov_c.md:30`); part 2:69 (`14nov_notice_session.md:28`); part 2:71 "ideally only the users of the entry that changed" (`14nov_notice_session.md:64`); part 2:88 (`14nov_notice_session.md:68`); part 3:17 "not the next tranche" (`14nov_b.md:5`); part 5:11 (`17nov_codex_context.md:11`); part 5:23 (`17nov_compaction_avoidance.md:11`); part 6:55, the whole paragraph (`14nov_b.md:25`); part 8:40 (`17nov_compaction_avoidance.md:7`); part 10:19 and build 03:195 "proper results" (`14nov_b.md:9`); build 03:25 (`14nov_c.md:51`); build 03:196 (`14nov_c.md:56`). The "His 8 Nov words" columns of the two first-build approvals tables, and the 1 Nov and 2 Nov wordings quoted in `owner_acts_and_approvals.md:32-33`, match his commits (`tranche` `CLAUDE.md`; probes `tranche` `CLAUDE.md`; commits `32146f7`, `19b7cc0`).

Every other passage in quotation marks in these files names a term, a mark, an option, a file, a command, a made-up example or a measured message, and is not presented as his.

## B. Rules presented as his with no source in his words

Part 0:27 says a rule with no mark "is the owner's ruling, or follows from one directly, or is one of 34 rules carried unchanged from the sixth draft". So every unmarked rule reads as his. Below, "design state" is `working/design_state_18nov.md`, "Written by Claude from Bob's answers in the review session of 18 Nov"; no record of what he typed that day exists. "The record of 13 Nov" is the session's record of 13 and 14 Nov (`process4_definition_v6.md:141-166`), which he called "my decisions of 13-14 Nov" (`14nov_b.md:36`) without seeing its wording in the file.

### B1. Named as his, explicitly, with no source in his words

1. **Part 4:38-42, "The owner's rulings" on lanes.** "ARCH starts a product's design lanes" is in the Foundations (foundations_tranche_9nov.md:60, "Bob's answer, Keep and Drop page, 6 Nov"). "A lane decides design in its area. ARCH decides whether and when a design is built ... A design ARCH cannot build goes back to the lane" and "The owner works with a lane through its design pages": only design state :96 and :49. His typed words on lanes are `16_17nov_codex_development.md:51` ("interacting with lanes is crucial, as this is where architecture and design decisions are made") and `14nov_c.md:70`.
2. **Part 5:16, the four values "stand, on the owner's word".** Only design state :43.
3. **Part 5:20, 5:21 and part 7:42, "the owner judged too weak to rely on".** Only design state :43.
4. **Part 4:157 and part 10:20, "left the count to the AI on 19 Nov".** Only the handoff (A2, item 10).
5. **Part 6:60, "His written instructions".** The Foundations' words (A1, item 2).
6. **Part 0:63 and part 5:38, the Foundations as "the owner's own earlier document" and "the owner's Foundations".** His document by ownership; written by a session (foundations.md:3; the sixth draft itself said "written by a session from your ledger").
7. **Part 0:17, "on trial ... from the owner's acceptance", "in force ... on the owner's word".** Only design state :31.
8. **Part 4:9 and part 2:23, the coordinator "on his word" holds or approves one merge and puts a module first; "Only the owner's marked instruction puts a module ahead".** Not found in his typed words, the Foundations or the ledger lines. The sixth draft said "in your documents" and named none. Changing the slot number is the record of 13 Nov, line 17.
9. **Part 6:16, "In the process's repository the approvals say that a process change is merged only on the owner's word given at PROCESS."** Only design state :121 ("Bob rewords his approvals ..."). The approvals he committed in the process repository (process4 `main`, `CLAUDE.md`) do not say this; they say he merges every pull request himself (second file).

### B2. Unmarked, resting only on Claude's design state of 18 Nov

Part (line) and design state line:
- Part 0:9, that the design is "the process4 requirements" (:24). His 14 Nov words use the phrase for Process4's requirements, not for this document.
- Part 1:10, work continues while productive (:110); 1:14-16, where the process stops (:108; his nearest words: "installer and website are outside the tranche", `14nov_c.md:57`); 1:24 and part 3:7, he approves ARCH's tranche proposal (:55); 1:32-33, dated acts on his standing page and token renewal (:138; his `16_17nov:29` is about Codex only); 1:34, subscription (:140; his `16_17nov:21` is a question).
- Part 1:38, the "Decision:" and "Instruction:" marks (:47). His own rule is "Only words I wrote count as my word" (`14nov_b.md:32`); the marks are not in his words. 1:41, his latest statement replaces earlier ones (:9). 1:43, "He may watch, and sometimes speak to, ARCH and the lanes" and a marked message to them is followed (:49): "sometimes" is not his; he called interacting with lanes "crucial" (`16_17nov:51`). 1:48, the form of a question (:50; his nearest words `14nov_b.md:31`). 1:51, one standing page and a phone notification (:51).
- Part 1:57, "Every problem is either an architecture bug or an implementation error" (:106). The Foundations record a different rule from his 2 Nov direction: "Every problem is an architecture bug" (foundations.md:38). 1:62, save work before the turn ends (:142); 1:63, a directing session's message is an instruction (:139).
- Part 2:16, rewordings come to him first (:82-83); 2:53, an install and an update confirmed before release, "no full regression, on request or otherwise" (:16, :19); 2:63, built files never committed (:76).
- Part 3:23, every round's walks partial; 3:25, a flaw is one of three things; 3:28, full external walk opt-in; 3:29, no walk outside a tranche; 3:34, the walks' documents change only to correct an error; 3:45, the account after each round; 3:52, a tranche that does not come clean goes on "until the owner says", then merged with flaws or dropped (:56-65). Against the last: his words "a tranche only ends when an external walk (of a development deployment) completes without flaws" (`14nov_b.md:5`).
- Part 3:58, release once an install and an update are confirmed (:69); 3:68, an urgent fix (:72); 3:73-74 and part 1:15, support procedures (:131).
- Part 4:17, the tool does what has one right answer (:91); 4:92-93, refresh at a pause, ARCH long-lived (:87-88); 4:97, archive not delete (:126; his `16_17nov:67` is a question); 4:105, the watcher kept and ROOT starts it (:92; his only word on it is a question, "are you certain that the watcher isn't needed?", `14nov_c.md:40`); 4:114 and 4:118, one way back and the account switch (:93); 4:122-124, messages saved first, directing session (:139; "wakes at once" is his, `16_17nov:47`).
- Part 5:8-10, the maximums and the Codex maximums used on both (:36-37); 5:30, principles concise (:38); 5:37-42, two documents, ledger retired (:23-28); 5:46-49, the record of decisions (:27); 5:54-55, the ranking page (:132; his words: "I'm open to the addition of a canon authority map", `17nov_codex_context.md:13`); 5:59-61, where things are kept (:115-116).
- Part 6:9 and 6:41, the tool guards against mistakes only, and "no change" to a deliberate attack (:141); 6:15, approvals protected by the checker alone (:122); 6:47, the fault's route (:123; "ARCH can ask ROOT to start PROCESS" is his, `14nov_c.md:26`); 6:72, the question at each new model version (:101).

### B3. Unmarked, resting only on the session's record of 13 and 14 Nov

Record line in brackets. Part 1:7, runs with nobody watching (2); 1:24, start ROOT (16), tell the coordinator (17), change a setting (1); 1:53 and part 4:139, completely blocked (2); part 2:7, one ordered list, a later use is a design error (3, 13); 2:22-23, ready jobs, no waiting, earliest first (8); 2:27, ARCH merges with the tool (23); 2:28 and 2:47, eight slots, refilled at once (9; "across the account" is his, `14nov_c.md:41`); 2:54, a fully informed reason (19); 2:74, a told job checks only the changed parts (10); part 4:7 and 4:24, ROOT starts ARCH and the coordinator (22). Lines also in his typed words are not listed: approving a public release (also his 2 Nov approvals); a job writes only its own module (`14nov_c.md:35`); no new test, gate, review or stop (`14nov_b.md:34`; `15nov_main.md:13`).

### B4. Unmarked, resting only on the Foundations or the ledger

Part 1:8, the one output, "merged quickly and cheaply" (foundations.md:38); 1:58, a workaround is not a fix (:38); 1:59, two kinds of refusal (:183); part 3:8, the main branch never moves (foundations_tranche_9nov.md:57); 3:9 and part 6:40, one fixed version per tranche (9nov:48, :67); part 4:7, the hourly wake (9nov:82); 4:29, three levels (9nov:60); 4:30, no session starts its own replacement (9nov:77); part 5:7, act only on what was read in full (9nov:133); part 6:13, no session writes or relays his approvals (foundations.md:183); 6:32, three refusals stop a session (9nov:194, a measurement, not a ruling); part 7:19, `CLAUDE.md` under thirty lines (9nov:184). Part 6:26, GitHub's limits, is in his quoted words (9nov:71, P27).

### B5. Unmarked rules with no source at all

Part 0:27 counts 34 such rules carried from the sixth draft, and says he "has ruled on none of them one by one"; the list is `readiness_18nov/draft7_unmarked_lines_traced.md`, items marked UNMARKED IN V6. This check found no source for them in his words either. Among them: the job's life, steps 4 to 6 (part 2:24-26); a job never merges, starts a session or deploys (2:32); a blocked job (2:33); tests on the job's own module only (2:55); the two-part run (2:62); ARCH starts walking sessions (3:38); the tranche merges with no tests run (3:51); the newest commit and unattended mode (4:31); ARCH replaces a dead job (4:96); how a stop travels (4:140); the three things that hold a rule (6:7-8); the forbidden commands' list and the second account (6:24-25); the working rules of 6:30-31; the AI builds the tool (6:39). Also with no source: the seven rules the earlier trace found marked "Claude decided" in the sixth draft and unmarked in the seventh, of which part 2:48 (lanes use no slot) and part 4:62 (what belongs to one job) still stand unmarked.
