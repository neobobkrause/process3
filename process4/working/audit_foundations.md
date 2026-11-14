# Audit of the Process4 definition (second draft, main text) against the Foundations and Bob's decisions

14 Nov 2026. Auditor's findings. Nothing was changed in any repository or document; this file is the only thing written.

Audited: `/home/user/handoff/process4_definition_v2.md`, sections A to K (the main text only; the appendix was not used to excuse a silence).

Read in full: `attack_common.md`, the definition, `foundations.md`, `live_docs.md`, `k_evidence.md`, `verify_numbers.md`, the 137 Foundations rows of `process4_disposition.tsv`, and the top 130 lines of `assessment_doc.txt` (the record of 13 and 14 Nov). Read by passage: `DECISIONS.md` (every passage that quotes Bob), `audit_D_central.md` (Bob's four requirements of 13 Nov, quoted there word for word), `interface_and_cycle.md`, `roles_root_coordinator.md`, `permissions_inventory.md`, `change_sample.md`, `product_side.md`, `no_layers_width.md`, `enforcement_levers.md`, `trial_plan_facts.md`.

## How the items were counted

205 items: the 137 Foundations rows of the disposition table; 43 statements in the session's record of 13 and 14 Nov; 25 dated statements of Bob's quoted in `DECISIONS.md`, `k_evidence.md` and the ledger store. Bob's six instructions of 14 Nov are judged separately, under (f) and (g).

| Category | Count | Note |
| --- | --- | --- |
| (a) honoured, and the main text says so | 113 | |
| (a) honoured only by the blanket sentence "208 stand" in section G; the main text never states them | 23 | Not counted as dropped unless listed under (d) |
| (b) purpose kept, way changed by a decision of Bob's | 10 | |
| (b) purpose kept, way changed by a decision of Claude's of 14 Nov, and the text says so | 5 | |
| (b) way changed with no decider named | 1 | Finding 9 (who is told of a change) |
| (c) ended, said so, Bob decided | 9 | |
| (c) ended, said so, Claude decided | 12 | Two of these end something that is a purpose, not a way (findings 4 and 5) |
| (d) silently dropped | 20 items, in 8 findings | |
| (e) contradicted, or a conflict between Bob's own statements resolved without saying so | 13 items, in 9 findings | |
| (f) added | 7 firm, 2 possible | |
| (g) plain-words faults | 10 assurances or blurred claims; 8 number faults in 24 numbers checked; 7 undefined terms; 4 references to things Bob has not seen; 3 places where a session's reading is written as Bob's act | |

### Claude's decisions of 14 Nov, judged strictly

- **Section I, 13 items.** Items 1 to 10 remove a way of doing something; items 11 to 13 keep one. None designs anything new. Four have a fault: item 7 removes the only carrier of a purpose (finding 4); item 9 may add refusals (finding 18); item 8 ends something a note Bob edited on 14 Nov still names (finding 19); items 1 and 2 lean on Bob (finding 12).
- **Section K, the eight closed points.** Points 1, 4 and 8 stay inside Bob's documents. Point 3 adds an act of Bob's, with support in his Foundations. Point 2 removes two tests and **designs a new one** (the walk on an installer-installed copy, finding 3). Point 5 ends Bob's judge of the process and **designs a new record** (finding 5). Point 6 chooses Bob's rule of 8 Nov but settles a conflict between his words of 8 and 13 Nov without saying so, and adds skipping by word (finding 2). Point 7 answers a question that was put to Bob on 13 Nov, against the drift of his words of 6 Nov (finding 7).
- **The 14 technical points.** Points 1, 3, 5, 6, 10, 11 and 14 choose among ways Bob's documents allow. Point 9 designs the notice, which Bob's decision asks for, and marks it unproven. Point 4 keeps the Foundations' standby but gives an assurance the record contradicts (finding 6). Point 2 creates a role that section B does not list and leaves half its own question unanswered (finding 11). Point 8 decides matters the design study called Bob's and gives an assurance (finding 10). Point 12 departs from Bob's own note on models (finding 19). Point 13 does not answer "how many" (finding 19). Point 7 adds a small report by ARCH.
- **The one question put to Bob** is in the right form (what it is, why it matters, a recommendation), but see finding 1.

---

## Findings, worst first

### 1. The one question put to Bob is the withdrawn proposal again, with its cost understated and an assurance attached

**Counter-argument.** The wall Claude recommends is the same step the proposal of 13 Nov took and then withdrew because it broke Bob's requirements. The text does not tell him that. It says the wall costs "one click" a fix when the evidence says more, it promises that silent growth becomes "impossible" two paragraphs after listing where growth can still happen, and it adds a new record on every fix.

**Sentences attacked (section K).** "With the wall, every process fix costs you one click". "The one physical stop that was found, and that earlier reviewers could not break, is a wall". "Each fix comes to you with one plain sentence saying what it corrects or removes, and the size of the process before and after." "What it does is make silent growth impossible and every change visible to you."

**Sources.**
- Assessment document, which Bob has seen: "The proposal does not meet your requirements, and its recommendations are withdrawn"; "To stop Claude corrupting the process, I moved the process itself across to you. That one move produced most of the contradictions"; its table: "You are made the merger of every process change ... None of those is a settings change".
- Bob, 13 Nov, quoted in audit D: "The only actions he will very occasionally take are changes to GitHub or Cloudflare settings related to permissions or rules." "It doesn't block waiting for user input unless it is completely blocked".
- Bob, 14 Nov, typed: "Do not add tests, gates, reviews or checks." "Do not assure me that something will work."
- `enforcement_levers.md`, on this wall: "Costs Bob: one sitting of settings; one merge and one move of the reference for every process fix; a click for each change to the product's own workflows (two in nine days in Process3); wording edits to approvals and deny list. A blocking process fault waits for him. This is the corner the central audit said breaks 'unattended' and 'very occasionally'." And: "If only Bob merges, the stop is his reading of a diff, and the record says that does not hold."
- The definition's own list: "Tests that serve the process placed among a module's own tests, or extra steps added to the walk. These remain rules in text."

**Kind.** (e) a withdrawn step re-proposed without saying so; (f) a gate by Bob's click and a new record ("the size of the process before and after"), neither asked for by any source; (g) one wrong cost, one assurance, one reference to reviewers Bob has not read.

**How bad.** Misleads Bob on the only decision he is asked to make.

**Proposed correction.**
- Add to "What it is": "This is the step the proposal of 13 Nov took and withdrew, because it breaks two of your requirements (your acts are settings only; the process waits for you only when completely blocked) and your instruction of 14 Nov not to add gates. It is put to you again because no other physical stop was found."
- Replace "every process fix costs you one click" with: "every process fix costs you two acts on GitHub's website: merging the fix, and moving the product to the fixed version. Setting the wall up is one sitting of settings. A change to the product's own test set-up files would also wait for your click (two such changes in nine days of Process3)."
- Replace "and that earlier reviewers could not break" with: "; the workers who attacked the withdrawn proposal found no way round it, and it has never been run".
- Replace "What it does is make silent growth impossible and every change visible to you" with: "What it does is stop a session changing the process's own repository without you. It does not stop growth in the four places listed above."
- Remove "and the size of the process before and after", or mark it as an addition of Claude's that Bob may strike.

### 2. Bob's words of 8 Nov on when a tranche ends are overturned by the 13 Nov record, and the text does not say so

**Counter-argument.** On 8 Nov Bob said, in his own words, that a tranche ends only after the walk of the deployed release is also clean and the installer and website are updated. The definition ends the tranche at the clean internal walk, merges it to the main branch, and sends whatever the external walk finds to the next tranche. It follows a session's record of 13 Nov and never tells Bob that this replaces what he said five days earlier.

**Sentences attacked (section C).** "A round that completes with no failures ends the tranche. The tranche branch merges into the main branch as a whole ... A deploy-and-external-walk then follows ... It does not hold the tranche back. What it finds is the first work of the next tranche." Section H lists only 'a development release "in each round"' as ended.

**Sources.**
- Bob, 8 Nov (`DECISIONS.md`, BD-R1, "in Bob's words"): "This successive set of rounds continues until an internal walk doesn't find flaws, the release deployment happens, and the walk of the release also doesn't identify flaws. When the release walk is clean, the installer is updated for that release, then the civicsmith.dev website is updated to refer to the new install, and that ends the tranche."
- Session's record of 13 Nov: "A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that."
- Foundations, "A job's life": "so nothing found waits for the next tranche".
- `k_evidence.md`: "By Bob's words of 8 Nov the question could not arise ... No text of his says what its findings then open." And: "in Process3 nothing reached the main branch before a clean external walk."
- The definition's own figure: the one time the internal walk was clean, the external walk of the same build passed 20 of 175.

**Kind.** (e). Claude's choice in K6 (a rule runs the walk; Bob may skip it) picks Bob's own rule of 8 Nov and is declared; the undeclared part is the end of the tranche and the fate of the findings.

**How bad.** Silently corrupts the result: the main branch receives a product no deployed walk has passed, on the strength of a record Bob did not type.

**Proposed correction.** Add to "End of a tranche", and repeat in section H: "This changes what you said on 8 Nov, that rounds continue until the walk of the release deployment also finds no flaws, the installer and website are updated, 'and that ends the tranche'. A session's record of 13 Nov has the tranche end at the clean internal walk, with the external walk after it and optional. This document follows the later record. Three things follow from it: the main branch receives the tranche before any deployed walk; updating the installer and website is no longer part of ending a tranche; and what the external walk finds waits for the next tranche, where your documents said nothing found waits for the next tranche. If the record of 13 Nov is wrong on this, say so."

### 3. The walk before a public release "on a copy installed with the real installer" is a new test, unbuilt, and the whole release path is missing from the unproven list

**Counter-argument.** In the same breath as ending the install test, Claude designs a walk that installs the product with the real installer. No document of Bob's asks for it, it has never been built, and it is not listed as unproven. Nothing on the path to a public release ever ran in Process3, and section J is silent on all of it. Two of Bob's rulings on that path are dropped.

**Sentences attacked.** Section C: "Claude decided that this walk is run on a copy installed with the real installer, since a development deployment does not use the installer. The process prepares the release and shows you what it carries. It waits for your approval, given in a protected area of GitHub ..." Section B: "There are no others".

**Sources.**
- Bob, 14 Nov: "Do not add tests, gates, reviews or checks. Process4 has three tests, ever." "Do not assure me that something will work."
- `k_evidence.md`, option 3 for the install test: "The external walk is made to cover them: it walks a copy installed by the installer ... Risk: unbuilt and unproven". Also: "No release of any kind was cut."
- Bob, 8 Nov (BD-R3): "build the installer only when the internal walk completes without the need for another round, and build the site update only once the external walks complete without the need for another round."
- Bob, 9 Nov (BD-R5): "The first run or two of the external system will run without without an AI account connected ... we'll configure an AI so that the AI-assisted journeys can be run and debugged." And: "Yes, the installer update and site update wait until a release walk with AI on is also clean." `k_evidence.md`: "BD-R5 leaves one act with Bob that is not on his list: connecting an AI account to the deployment".

**Kind.** (f) a new test; (g) unproven and not in J; (d) BD-R3 and BD-R5 dropped.

**How bad.** Misleads Bob; could stop the first release.

**Proposed correction.**
- Replace the "Claude decided that this walk ..." sentence with: "A development deployment does not use the installer, so the external walk does not show that the installer can place a release into an empty account. Nothing in Process4 shows that. It is unproven."
- Add to section J: "Nothing on the path to a public release has ever run: preparing the release, your approval in GitHub's protected area, updating the installer and the website page. Process3 cut no release of any kind. *Trial:* one rehearsal as far as the draft, stopping before anything is published."
- Add to section C, or declare ended with the decider named: "Your rulings of 8 and 9 Nov stand: the installer is built only after a clean internal walk and the website update only after clean external walks; the first external walks run with no AI account, and the installer and website wait for a clean walk with one connected. Connecting that account is an act of yours and is added to the list in section B."

### 4. The sentence that was meant to hold back growth is gone, and the rule said to replace it is narrower

**Counter-argument.** Bob's own brake, that caution is a cost and that the default answer to an unmeasured worry is no change, appears nowhere in the main text. Item 7 of section I ends the citation rule and says the rule on process fixes "now does its work". That rule forbids only a new test, gate, review or stop. It does not cover new records, rules, alarms or duties, which section A itself names as part of what killed Process3.

**Sentences attacked.** Section I, item 7: "*Claude decided:* end the citation rule. The rule on process fixes (section E) now does its work." Section E: "It must never add a new test, gate ... review or stop." Section A: "its sessions kept adding checks, reviews and record-keeping".

**Sources.**
- Foundations: "caution is a cost, paid only against a measured failure or your word. ... The default answer to a finding with nothing measured behind it is no change, and a rule, check, review round, measurement run or owed task exists only against a measured failure or your word (GAP-3)."
- Bob, 7 Nov (`DECISIONS.md`): "make sure that this baseless overcaution NEVER happens. NEVER!"
- Disposition table: both Foundations rows are KEEP or purpose kept.
- `change_sample.md`: the 121 additions were of "a check, gate, refusal, hold, review requirement, audit, alarm or bookkeeping duty".

**Kind.** (d). Section I says "Every purpose behind them stays", but for this item the main text does not state the purpose and nothing carries it.

**How bad.** Silently corrupts the result: the documented way Process3 grew is only half forbidden.

**Proposed correction.** Add to section E, in Bob's own words: "Two sentences of yours stay as rules for every session: 'Caution is a cost, paid only against a measured failure or your word', and 'The default answer to a finding with nothing measured behind it is no change.' They are rules in text; nothing enforces them." In item 7 replace the last sentence with: "The rule on process fixes covers tests, gates, reviews and stops. New records, rules, alarms and duties are held back only by your two sentences in section E."

### 5. Claude ends Bob's judge of the process, quotes his rule with half of it cut off, and puts a new record in its place

**Counter-argument.** The Foundations make two numbers "the standing judge of every other line" and say nothing is in force until a tranche has run with them measured. Claude retires both as a technical matter. Section J then cites "your own rule" without the half Claude ended. In their place the tranche report gets a new count, with a watch on walk steps added or removed, which no document of Bob's asks for. The report's own list is also shorter than Bob's.

**Sentences attacked.** Section K, point 5: "*Claude decided:* the two numbers ... are retired." Section J: "By your own rule, nothing here is in force until it has run on a real tranche." Section G: "Claude decided that it also carries the walk result at the end of each round: steps passing out of steps in all, with any steps added or removed since the last round shown beside it". Section G: "A tranche report: time, work done, cost, overhead, and the minutes it took of yours."

**Sources.**
- Foundations: "Nothing here is in force until it has run on a real tranche with the two health metrics measured." "The two health metrics ... are the standing judge of every other line." "the tranche report states elapsed time, work done, deferrals, cost, the overhead share, BOB's idle time while work was ready, and the minutes it took of yours".
- Disposition table, on the judge: "the owner should see any change to his judge".
- `k_evidence.md`: "Not found: any line of Bob's that names walk steps passing ... as a measure." Also: survival of merged work "98.8%" was read from git, so half of the second number can still be read at no cost.
- Bob, 14 Nov: "Bring me only what is mine to decide"; "start from my documents".

**Kind.** (c) by Claude of something that is a purpose (how Bob judges the process), not a way; (f) the walk-step record; (e) the truncated rule; (d) "deferrals" and "idle time while work was ready" dropped from the report.

**How bad.** Misleads Bob; costs him his measure of "quickly, cheaply, and still there later".

**Proposed correction.**
- Section K, point 5: "Your Foundations call these two numbers 'the standing judge of every other line'. Ending them changes what you asked for, so you may want this back as your decision. Claude's reasons: the first is defined by two checks you ended; the cost half of the second could not be read for most of Process3. What can still be read from git at no cost is whether merged work is still there later."
- Section J, first line: "Your rule is that nothing is in force until it has run on a real tranche 'with the two health metrics measured'. Claude has retired those two numbers (section K), so that half of your rule is not met."
- Section G: restore the report's list as the Foundations give it, and either remove "with any steps added or removed since the last round shown beside it" or mark it plainly as an addition of Claude's that no document of yours asks for.

### 6. "Replacing ROOT is not an act of yours" is contradicted by Process3's own record

**Counter-argument.** The standby is in Bob's Foundations, so it is not a new design. But in Process3 each takeover left ROOT one level lower and left no standby, and the decision record says Bob then restarts ROOT himself. The text promises the opposite, does not list it as unproven, and does not list the standby among the sessions in section B.

**Sentence attacked.** Section K, technical point 4: "For ROOT, keep Process3's standby session, woken once a day, which takes over, so that replacing ROOT is not an act of yours." Section B: "Sessions are at most three levels deep".

**Sources.**
- `DECISIONS.md`: "A takeover moves ROOT one level down, so it is a bridge: Bob restarts ROOT from his app at depth 0 at his next opportunity".
- `roles_root_coordinator.md`: "It took over twice (4 Nov 04:11Z, 7 Nov 19:07Z)"; "Each left no watcher and put ROOT one level down"; and, of the roles suited to Process4, "Not in the set ... the watcher".
- Foundations: "If the watcher's session declines, replacing ROOT stays yours".

**Kind.** (g) assurance; proven and unproven blurred.

**How bad.** Stops a tranche if it fails; misleads Bob.

**Proposed correction.** "For ROOT, your Foundations name a standby session, woken once a day, that takes over. In Process3 it took over twice. Each time ROOT ended one level lower and no standby was left, and the Process3 decision record has you restart ROOT yourself afterwards. So a takeover is a bridge, and starting a fresh ROOT after one is the act already on your list. Not proven: that jobs can still be started after a takeover." Add the standby to section B, with who starts it.

### 7. The slot number: the default and "for each product" both settle conflicts in Bob's own words without naming them

**Counter-argument.** Bob's words give four different numbers on four dates, and his words of 6 Nov tie the number to GitHub traffic for the whole account. The text states "eight by default" and "for each product" as settled and mentions only the Foundations' 24.

**Sentences attacked.** Section A: "Eight by default." Section H: "A default of 24 live sessions ... *Why:* eight job slots, and only you change the number." Section K, point 7: "*Claude decided:* for each product. A session holds one repository, so nothing can count jobs across two products without a new mechanism."

**Sources.**
- Foundations: "at most 24 live sessions by default ... (your word, 1 Nov)".
- Bob, 6 Nov (quoted): "I think that github limits can handle the traffic from as many as 8 jobs at a time. Set the job slot limit to 8 and monitor github usage for an hour or so to see if there's any real need or opportunity to low or raise the slot count." And: "confirm that the github usage limits we agreed to abide by are written into process3 and used properly account wide."
- `DECISIONS.md`: "Bob set the number of slots (20, 7 Nov)". The field report, typed by its editor (taken to be Bob): "(default: 20)".
- Session's record of 13 Nov: "Job slots default to eight". Its question 5, "is eight per product or across the account?", has no recorded answer.
- `k_evidence.md`: an account-wide count "has to come from the platform's list of sessions, which is account-wide, or from Bob. Judgment (mine)." Process3 did count across the account.

**Kind.** (e), and (g): a judgment written as a fact.

**How bad.** Costs Bob time; two products at sixteen jobs repeat the GitHub load his number was set against.

**Proposed correction.**
- Section H: "Eight comes from a session's record of 13 Nov and matches your words of 6 Nov. On 7 Nov you set 20, and the field report says 20 of Process3. This document uses eight. Say if that is wrong."
- Section K, point 7: "Your words of 6 Nov tied the number to GitHub traffic for the whole account. Counting for each product follows from one repository per session; two products on one account then run sixteen jobs unless you lower each number. Process3 counted across the account from the platform's list of sessions; whether Process4 could do the same was not measured. This is Claude's judgment, and it touches a question that was put to you on 13 Nov and not answered."

### 8. "Your word is enough" is an assurance, and three of the four uses are not on the unproven list

**Counter-argument.** Nothing has been built or tried for holding a merge, putting a module first, skipping the external walk or changing the slot number. For a module put first the fixed rule has to read Bob's word from somewhere, so "nothing is built" cannot be right. Only the stop on his word is listed as unproven.

**Sentences attacked.** Section B: "Nothing special is built for any of these; your word is enough." Section K, points 4 and 8: "Nothing is built for it: you tell the coordinator". Section C: "Only your own word, passed on exactly by the coordinator, puts a module ahead."

**Sources.** Bob, 14 Nov: "Do not assure me that something will work. Say what is proven and what is not." `k_evidence.md`, on reordering: "It needs a place in the record for his list and a way to clear it; in Process3 the list was two modules and was never cleared." On holding a merge: "Used: not found ... no mechanism of its own." Section J, item 12, itself: "After your stop of 9 Nov the process ran on for over two hours."

**Kind.** (g).

**Proposed correction.** Replace the sentence in B with: "Nothing has been built or tried for any of these. A module put first has to be read by the fixed rule from the same place in the record as the slot number. Whether a hold reaches ARCH before it merges is not proven." Widen section J, item 12, to: "a stop, a held merge, a module put first, a skipped external walk and a new slot number, each on your word".

### 9. On interface notices the text says "safely" where section J says "unproven", and two sentences give a rule that is not the one in force

**Counter-argument.** Section D says naming the changed parts "can safely narrow" what a notified job reads and tests. Section J, item 5, lists exactly that as not proven, and D itself says the tests cannot yet be picked. Separately, step 8 and test two say a notice goes out when the interface changed, while D says that today every declared user is told on any change. Nobody is named as having decided the wider rule.

**Sentences attacked.** Section D: "Naming the changed parts can safely narrow what a notified job reads and tests." Section C, step 8: "If the change altered the module's interface ..., every module that uses it is notified." Section D, test two: "*Trigger:* a merged job changed its module's interface." Against section D: "So today every declared user is told, on any change in the provider." Also "241 were truly affected".

**Sources.** Session's record of 13 Nov: "When a job changes a module's interface, every user of that module is notified"; "Recognising that an interface changed must be proved rigorous and correct." Assessment document: "Naming the parts that changed narrows what a notified job has to read. It does not safely narrow who is told." (no "safely" on the first); "65 of 178 past notices had no changed requirement id and no export difference, and still held 63 affected users"; "It used the code as it stands now, so the figures are indicative." The definition: the 241 are "the judgment of AI workers, not ground truth".

**Kind.** (g) proven and unproven blurred; (b) with no decider named.

**Proposed correction.** D, last two sentences: "Naming the changed parts is meant to narrow what a notified job reads and tests. That is not proven (section J, item 5), and in 65 of 178 past notices no part could be named. It cannot yet safely narrow who is told." Step 8 and test two: "Trigger today: any merged change to a module's source. Claude decided this, because recognising an interface change is not yet proved; on Process3's record about nine notices in ten were needless." Change "truly affected" to "judged affected".

### 10. Questions that are Bob's are decided as technical or buried, against "one question is still yours"

**Counter-argument.** The opening says one question is Bob's. Section F hands him a second in half a sentence, with no reason and no recommendation. Technical point 8 decides the repair of the module order and says nothing a user sees changes, while the study it rests on says the order is built into the product and lists questions it calls the owner's.

**Sentences attacked.** Opening: "One question is still yours, in section K." Section F: "one clause lets a design lane's pull request merge with no tests run, which is yours to keep or drop." Section K, technical point 8: "*Decided:* correct the module list where the code already runs one way, and turn one registration between two modules around. Nothing a user sees changes."

**Sources.** Bob, 14 Nov: "Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation." `interface_and_cycle.md`: "Three things need the owner"; "Whether a member's own Claude sign-in through the runner still exists ... its requirement file states both positions"; "Whether a module may own requirements and no code. 29 of the 220 modules do"; "Moving a module that registers something can change what a member sees." Assessment document: the repair "depends on two things that are yours". Session's record of 13 Nov: such a use is "to be fixed by refactoring them"; the text's own section E says "fixed by refactoring them in their own jobs", which is not the same as correcting the list.

**Kind.** (g) assurance; a fault against the instruction on what is brought to Bob; (e) minor, list correction against "refactoring".

**Proposed correction.** Opening: "Two questions are still yours." Move the design-lane clause into section K with what it is, why it matters and a recommendation. Technical point 8: replace "Nothing a user sees changes" with "Not measured. The order of modules is built into the product, and the study of these modules says moving one that registers something can change what a member sees." Add: "That study left two questions it called yours: whether a member's own Claude sign-in through the runner still exists, and whether a module may hold requirements and no code (29 of 220 do, which bears on 'a job writes only its own module's files'). They are put to you here", each with a recommendation.

### 11. Section B does not list four kinds of session the document relies on, and does not say who tells Bob anything

**Counter-argument.** "Who does what" names five kinds of session. The text elsewhere relies on four more: the standby, design lanes, the session that fixes the process, and the sessions that walk. Who starts each, on which repository, and whether they take slots is not said. Technical point 2 asks which repository the coordinator holds and does not answer. And nothing says which session reports ARCH's decisions to Bob "as done" or brings him the questions that are his.

**Sentences attacked.** Section B as a whole; "It decides nothing about the product and never brings you a technical question"; section K, technical point 2: "Which session makes a process fix, and which repository the coordinator holds. *Decided:* a short session started for that one fix".

**Sources.** Foundations: "BOB ... decides everything technical and detailed, and reports it to you in plain words as done (P17)"; "Questions that are yours are asked in one place, the walk-through, numbered, with a column for your word ... a decided question is never asked again"; "A question that is yours becomes your decision, and a design, before anything is built on it (P21)"; "In the middle ground both offer opinions, explanations, options and recommendations". Ledger note as Bob left it on 14 Nov: "toward Bob it always explains each decision of his with context, options and a recommendation". Foundations, roles table: lanes are started by BOB "when you identify the need". Bob, 14 Nov: "Decide technical matters yourself and tell me what you decided."

**Kind.** (d), six Foundations rows; (g) a question asked and not answered; technical point 2 is (f) in so far as it creates a role B does not have.

**Proposed correction.** Add four lines to section B (standby, design lane, process-fix session, walking sessions), each with who starts it and on which repository, or the words "not yet specified". Answer technical point 2 in full. Add to the coordinator's paragraph: "It tells you in plain words what ARCH decided and did. It brings you the questions that are yours, numbered, in one place, each with what it is, why it matters and a recommendation; a question you have decided is never asked again."

### 12. Three places write a session's reading as something Bob did or said

**Sentences attacked and sources.**
- Section H: "on 13 Nov you confirmed these end with 'three tests and no others, ever'". The record holds no confirmation; the list of ended lines is the session's ("Kept Ledger lines this decision ends: ..."). The quoted phrase is in neither the record ("Process4 has three tests and no others"; "No other test is necessary, ever") nor Bob's typed words ("Process4 has three tests, ever").
- Section I, item 2: "as you began to on 9 Nov". `DECISIONS.md` PD-21, cut 4 (the set-up check once per version), carries no words of Bob's; only cut 1, the receipt, does.
- Section I, item 7: "after you told sessions to stop". Bob's words of 5 Nov were: "we only add additional checks when we can confirm from factual study and data".

**Source for the rule.** Bob, 14 Nov: "Only words I wrote count as my word. Never record your decision or your summary as mine."

**Kind.** (g), against the only-my-words rule.

**Proposed correction.** H: "a session's record of 13 Nov lists these three as ended by your decision that Process4 has three tests and no others". I2: "as the Process3 coordinator began to on 9 Nov, under your instruction to cut what is not necessary". I7: quote the 5 Nov sentence in place of "told sessions to stop". Use quotation marks only around words found in a source.

### 13. Which repository ROOT starts on changed between the two days' records, and ROOT as described does not meet section F's own starting conditions

**Sentences attacked.** Section B: "You start it on the product's repository. Your first prompt says you are starting or restarting development ..." Section F: "How a session must be started for both to take effect: ... from the newest commit of the tranche branch, never from the main branch ...; and with starting instructions that name every act it may take."

**Sources.** Record of 13 Nov: "You start a session with the process repository mounted." Record of 14 Nov: "ROOT starts with the product repository". Both are the session's text and the earlier is not struck (`live_docs.md`, C4). Foundations, roles table: ROOT's "starting prompt lists every act it and its sweep may take". Section J, item 2: "a ROOT you started twice came up on an old copy of the branch."

**Kind.** (e); (g) a step of Bob's left out (he has to pick the branch).

**Proposed correction.** B: "You start it on the product's repository, on the tranche branch. (The record of 13 Nov said the process's repository; the record of 14 Nov says the product's. This document follows the later.) Your plain prompt does not name ROOT's acts as section F requires of every other session; whether that works is item 2 of section J."

### 14. "Earlier modules' jobs run before later ones" is read down to a tie-break without saying so

**Sentence attacked.** Section C, step 3: "When a slot is free, the ready module earliest in the order takes it." Section H: "One reading is corrected: a job does not wait until every module it uses is settled."

**Sources.** Bob, 13 Nov, quoted in audit D: "Each module is updated and tested by a single job, with the jobs of earlier modules run before those later in the order." The field report keeps the same clause as its editor left it. Session's record of 13 Nov: "A job does not wait for the modules it uses to finish ... ready jobs take free slots earliest in the order first."

**Kind.** (e).

**Proposed correction.** Add to step 3: "Your sentence of 13 Nov, that 'the jobs of earlier modules run before those later in the order', is read here as: among modules ready at the same moment, the earlier takes the free slot. A later module does not wait for an earlier one that has no work yet. A session's record of 13 Nov gives that reading as your decision. Say if it is wrong."

### 15. Seven standing duties in Bob's documents are neither kept nor ended in the main text

**Counter-argument.** Each of these is a count, a trial or a check that is not one of the three tests. Bob's rule of three tests may end some of them, and his decision to preserve permission management may keep others. The text does not say which.

**Sources and what is missing.**
- Foundations: every refusal of an approved act is "counted per tranche, tried with a handful of approved acts at the depths they run at, at each tranche's open before any job starts, and re-tested at each model release".
- Foundations: "At each model release and each Claude Code version change ... components are removed one at a time and the result observed".
- Foundations: "a check fails any change to the approvals block not made by you through GitHub's website"; main and the tranche take changes "with the gate (or ci) and record required". The text says only "with the tests passing".
- Foundations: "The sweep catches lack of progress, not only silence". The text has the alarm only for "a session that has stopped".
- Foundations: "every new session is checked to have started".
- Foundations: "Every requirement is tested at the module's interface and proven met; none goes untested (P7)."
- Bob, 6 Nov: hold to "80% or 90% of github's published limits"; 9 Nov: "don't do it beyond just making sure that we don't exceed published limits." GitHub suspended the sessions' account on 6 Nov. The text mentions the suspension and no limit.

**Kind.** (d).

**How bad.** Misleads Bob: the builder of Process4 will keep or drop each by its own judgment.

**Proposed correction.** One paragraph in section H or F: "Your documents also ask for seven things this document has not placed", then the list, each marked "kept as Process3 ran it", or "ended, because it is a check outside the three tests", with the decider named. Where preserving permission management and "three tests and no others" pull in opposite directions (the trial at each tranche's open, the check on your approvals), say that they do.

### 16. The mechanical pass has lost its two conditions

**Sentence attacked.** Section C: "A change that touches many modules in the same trivial way, needing no judgment, can be made in one pass."

**Source.** Foundations: "one mechanical pass by a worker in BOB's session while no job runs ...; a module where it needs judgment gets its own job in the same tranche (P7)." Record of 13 Nov: "The cross-module mechanical pass is preserved."

**Kind.** (d). With eight jobs open, a pass across many modules writes files that open jobs are also writing.

**Proposed correction.** "... can be made in one pass, by a helper in ARCH's session, while no job is open. A module where the change needs judgment gets its own job." Or declare the two conditions ended, with the decider.

### 17. The trial in section J, item 9, is a comparison at every round's end, which is a recurring check

**Sentence attacked.** "*Trial:* at each round's end in the first tranche, compare the process's files with round 1. Any difference other than a recorded corrective fix breaks the claim."

**Source.** Bob, 14 Nov: "Do not add tests, gates, reviews or checks."

**Kind.** (f).

**Proposed correction.** "*Trial:* once, when the first tranche ends, read from git how often the fixed version moved and what each move changed."

### 18. Ending "nothing is ever refused for size" for the process's own texts may add refusals

**Sentence attacked.** Section I, item 9: "*Claude decided:* end it for the process's own texts only."

**Source.** Foundations: "Text is kept short by splitting and consolidating ... Nothing is ever refused for size." Bob, 14 Nov: no added checks.

**Kind.** (g) unclear; possible (f).

**Proposed correction.** Add: "The only limits that refuse are the two Process3 already had: the size of each role's starting text, and ten rules per role. No new limit is added."

### 19. Four smaller conflicts with Bob's own notes or words, settled without mention

- **Models and effort (technical point 12).** "ROOT passes your suggestion to every session it starts." Bob's own note of 31 Oct: "Models, effort, and permissions mode come from one table, picked by the start command; always a model and effort sufficient for quality". Jobs are started by ARCH, so the sentence does not reach them. *Correction:* say the table is ended and by whom, or keep it; say what happens when no model is suggested and how the suggestion reaches jobs.
- **How many walk (technical point 13).** "*Decided:* by journey" answers how the walk is shared, not how many. Bob, 8 Nov: "run as many walks as is reasonable ... (But be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account." *Correction:* add his caution; say the number is not yet set.
- **When a process fix reaches a running tranche (technical point 3, section E).** "A fault that blocks nothing waits for the next tranche." Bob, 9 Nov: "Pin moves should be lightweight fixes that improve velocity, not ruin it. So they should happen as needed, but also ganged up when possible". *Correction:* say that the Foundations' rule is followed over his words of 9 Nov, and why.
- **The line-by-line test (section I, item 8).** Ended by Claude. The ledger note Bob edited on 14 Nov still reads "each line passing the per-line test". *Correction:* say so in item 8.

### 20. Numbers: 24 checked, 8 faulty

Right, and supported by a named source: 2,342 / 241 / 2,101 and 90% (assessment document); 65 of 178; 20 of 175 and 147 of 157 and 70 of 357 (`k_evidence.md`, read from the stored reports); 218 of 220 (`product_side.md`); 28 of 279 (`permissions_inventory.md`); 1,187 runs; 105 of 508; 41% before and after (71 of 175, 50 of 121); 8 KB to 134 KB (7,955 to 134,219 bytes, `verify_numbers.md`); 116 moves; 70% of commits (12,881 of 18,389); 194 minutes; 45 minutes; 11 of 11; about 450; about 700.

Faulty:

| Text | What the evidence says | Correction |
| --- | --- | --- |
| K: "sessions made 270 of the 296 changes ..., and 121 of those added a check" | `change_sample.md`: "121 of the 296 merges". 270 is merges made by the sessions' accounts (`enforcement_levers.md`); 14 of the other 26 are Bob's own edits to his approvals and settings | "121 of the 296 added a check" |
| K1: "the check's three known firings were all false alarms" | `k_evidence.md`: "How often it fired: not found." Three false-alarm episodes are known; one alone was 455 findings | "How often it fired is not recorded. The three episodes that are recorded were all false alarms" |
| I5: "Its first run gave 947 findings, and seven later changes repaired false alarms" | `change_sample.md`, PR 1: the 947 findings and the seven repairs belong to the whole record check (file size, temporary folders, the approvals block, the job-record format), not to the size check alone | Say "the check it was part of" |
| D: "38 such pairs exist in tests today" | `interface_and_cycle.md`: 38 pairs are tests importing a later module. Also undeclared: 24 pairs that read another module's tables, and 158 of 349 pairs that read another module's files | "at least 38" and name the other two kinds |
| J7: "The hourly alarm wakes ROOT itself. Measured ..., eight times out of eight" | `permissions_inventory.md`: 5 of 5 on 1 Nov into an idle session; 3 of 3 on 2 Nov were the daily alarm of the standby | "five times out of five, and three of three for the standby's daily alarm" |
| D: "241 were truly affected" | Judged by AI workers on today's code; the assessment calls the figures "indicative" | "judged affected" |
| G: "198 ... ten more ..., so 208 stand. Another 45"; H: "Fifteen"; I: "seventeen" | These sum to 285 of 288 | Say where the other three lines went (they appear to be the three settled in section K: writing only one's own files, the set-up page, replacing ROOT) |
| K: "Process3's rate, 296 changes in nine days, was mostly the growth itself" | No source measures "mostly"; `verify_numbers.md` labels 47% of a sample as fixes to earlier process code | Mark as Claude's judgment |

Also: I3, "overridden 32 times out of 32", comes from the earlier review (`review.txt`) and was not re-measured; `product_side.md` says "The review lists this". Numbers that are choices, not measurements, are not marked as such: "twenty or more merges", "ten Process3 faults". A: "Process4 keeps almost all of your requirements" against the text's own 208 of 288 kept as written.

### 21. Plain words

- **Undefined terms.** "status read-out" (four uses; Bob's documents call it "status"); "standby session" (his documents call it "the watcher"); "its real level" (J1); "probe" (J3); "turn one registration between two modules around" (K); "force-pushing" (F); "pull request" and "draft pull request" (used in the definitions in A without one of their own).
- **References to things Bob has not seen.** "that earlier reviewers could not break" (K); "Later platform notes suggest" (J7); "Three facts were corrected" (opening; the three are not named); "the audit kept 198" (G; which audit is not said).
- **Counts that do not read straight.** "Your seven earlier open points" heads a list numbered 1 to 8. "Six were technical and Claude decided them", while five items say "Claude decided", two say "It stays" and one says "Not a decision".
- **Other assurances or facts stated more firmly than the evidence.** B: "the platform gives no session a way to do either act, so it is a fact and not a choice"; `k_evidence.md` says of the cloud environment "in part", observed only in tool descriptions and never tried. *Correction:* "no way that has been measured". C, step 3: "gives the same answer every time", which J6 lists as unproven; say "is meant to".
- **Hard to read.** C: "the internal walk had every one of its 238 steps passing (with 63 failures of a kind already known)". A reader cannot tell how every step passed with 63 failures. Say what the 63 were.

### 22. The list of Bob's acts against his sentence of 13 Nov

**Sentence attacked.** Section B: "Your acts: ... There are no others, unless you choose the wall in section K. The set-up row is new on this list".

**Source.** Bob, 13 Nov, quoted in audit D: "The only actions he will very occasionally take are changes to GitHub or Cloudflare settings related to permissions or rules."

**Kind.** (e), minor and mostly declared. One of six rows is a settings change. Four others rest on a session's record of his answers of 13 Nov; the set-up row rests on the platform and on his Foundations ("the developer recreates the cloud environment and Claude's GitHub connection from a page the process writes"). "Three times in nine days" is not "very occasionally". Finding 3 adds a seventh act (connecting an AI account).

**Proposed correction.** Add under the table: "Only the first row is a settings change of the kind your sentence of 13 Nov allows. Rows two, four, five and six rest on your answers of 13 Nov as a session recorded them. Row three is forced by the platform and is in your Foundations."

---

## Smaller silent drops, for completeness

Each is a kept line that the main text never states, where the silence could matter to a builder. No correction beyond one clause in section G is proposed for any of them.

- Foundations: "while a tranche runs it prepares the next round or tranche ... so the next opens the moment this one closes". The text does not say how a tranche opens or who writes its work.
- Foundations: the product's CLAUDE.md is "under thirty lines, written by BOB line by line", each change "listed in the tranche report". The text speaks only of the approvals block.
- Foundations: "two ROOTs never both start a BOB" (the address in git decides). It matters once a standby can take over.
- Record of 13 Nov: lists "tests asserting on text keys as a separate check" among the lines the three-tests decision ends. Section H does not list it.
- Foundations, certification: "a shadow run of one representative slice of the product, then the live first tranche". Section J's trials stand in for it without saying so.

## What I could not check

- Bob's decisions of 13 and 14 Nov exist here only as a session's record, apart from his four requirements quoted in audit D and his typed instructions of 14 Nov given in my brief. Every "honoured" count against that record is a count against the record, not against his own words.
- A numbered list of "decisions 1 to 18" is cited by the first draft's appendix. I did not find the list itself.
- I did not open the two repositories; every number was checked against the evidence files only.
