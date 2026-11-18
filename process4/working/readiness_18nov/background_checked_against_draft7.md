Length: 285 lines. Last section: "Counts".

# The background document checked against the seventh draft of the design

Written by a Claude checker on 18 Nov 2026, with no earlier knowledge of the work. It judges neither document and proposes no change to the design.

## What was read

Both documents were read in full, every line, before anything was compared.

The design document, `process4/definition/process4_definition_v7/`, 854 lines in eleven files: part 0, 89 lines; part 1, 79; part 2, 107; part 3, 73; part 4, 138; part 5, 61; part 6, 71; part 7, 69; part 8, 50; part 9, 28; part 10, 89. Each file's own "Length" line agrees with the count.

The background document, `process4/working/foundations_updated/`, 904 lines and 76,559 bytes in eleven files: index, 31 lines; part 1, 101; part 2, 65; part 3, 86; part 4, 97; part 5, 95; part 6, 91; part 7, 68; part 8, 85; part 9, 100; part 10, 85. Each file's own "Length" line agrees with the count.

## How to read this report

- "bg 3:7" means the background document's part 3, line 7. "design 2:8" means the design document's part 2, line 8.
- The five headings asked for are used under each part of the background document:
  - CONTRADICTS: the two cannot both be true as written.
  - OUT OF DATE: the background calls something open, owed or unknown that the design now states, or gives a shorter or older form of a rule.
  - WHOSE RULE: the background states with no mark (so as the owner's) what the design marks "Claude decided", "Reading", "Open" or "Unproven". The reverse was looked for in every part and not found once.
  - DUPLICATES: a count of paragraphs, list items and table rows that restate a design rule and add no reason, source or evidence, with one example. These counts are my estimate from one reading and are approximate.
- Background the design leans on and the background lacks is gathered in one section after the parts, because most items belong to no one part.
- Where I am unsure an item belongs under its heading, the item says so.

## Background index (00-index.md)

CONTRADICTS: none.

OUT OF DATE: none.

WHOSE RULE: none.

DUPLICATES: 2. Example, bg 0:31: "The parts name no product. A product's own facts belong to that product's conversion plan." Design 0:11: "It names no product. A product's own facts and the steps to bring it under Process4 belong to that product's conversion plan."

## Background part 1 (purpose, the owner and the AI)

CONTRADICTS: none.

OUT OF DATE:

1. bg 1:54 to 1:63, the list of the owner's acts. bg 1:54: "His acts are few", then eight. The design's table (design 1:20 to 1:30) has acts the background's list lacks. Design 1:30: "Connect an AI account to the development deployment | Before an external walk of journeys that use AI". Design 1:22 adds to starting ROOT: "after any full stop; and, as **Claude decided**, after each edit to his approvals". Design 1:27 has him commit his two files "in the product's repository and in the process's".
2. bg 1:67: "A worked proposal on branches and on where his approvals live, with each act asked of him, is owed (part 10)." The design now states it. Design 6:17: "**Claude decided** where they live: in the product's repository on the tranche branch, carried to the main branch by each tranche's merge ... and in the process's repository on its main branch." Design 7:54 to 7:69 lists his ten acts in order. Design 6:20 leaves only the wording open: "**Open (the owner):** the wording of his approvals and forbidden commands for Process4. A proposal for him to adopt or change ... is in `process4/working/design_work_18nov/owner_acts_and_approvals.md`."

WHOSE RULE: none. The reading at bg 1:71 is marked as a reading, as at design 1:57.

DUPLICATES: about 40. Example, bg 1:92: "**Job:** one session's work on one module, delivered as one pull request." Design 0:64 is the same sentence. The fourteen entries of "Words used" (bg 1:87 to 1:100) all repeat design 0:45 to 0:89.

## Background part 2 (the tests)

CONTRADICTS:

1. Minor, and I am unsure it is more than wording. bg 2:37: "The structured comments that state an interface's bounds also tell the job which bounds its tests must cover (part 3)." Design 2:57: "The structured comments and the tool can also inform module tests, so that boundaries are properly checked." The background says "must cover"; the design says "can also inform".

OUT OF DATE:

1. bg 2:39: "Some changes are so trivial that module tests need not run again. A mechanical edit can be one of them (part 3)." The design does not say this of the mechanical edit. Design 2:104: "**Unproven:** which test run GitHub requires on that one change." Design 10:66: "A mechanical edit across several modules merges once, tried with the touched modules' tests run and with none run." What the design does say merges with no module tests is something else (design 2:106): "Requirement text, the module list, and the process's named files."

WHOSE RULE:

1. bg 2:39, the same sentence: stated as fact; the design marks it "Unproven" (design 2:104).
2. bg 2:49: "Each step of a walk exists only to prove a product requirement." No mark. Design 2:61: "**Claude decided:** a module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names." (bg 2:27 does mark the same rule for tests as Claude's.)

DUPLICATES: about 17. Example, bg 2:29: "Module tests run for the job's own module only. They run on GitHub's machines when the job marks its pull request ready. A failure goes back to the job". Design 2:55 says the same.

## Background part 3 (modules, jobs and the notice)

CONTRADICTS:

1. bg 3:7: "Every file has one owner module." bg 3:11: "ARCH edits the list until every file has one owner and every use points backward." Design 2:8: "Every code file has exactly one owner module." Design 2:9: "**Claude decided:** every file in the product's repository belongs to exactly one of these: a module; a lane's folder; or the process's own named files". So under the design some files have no owner module.
2. bg 3:63: "Only the users of the entry that changed are told." Design 2:71: "In the owner's words, 'ideally only the users of the entry that changed'. The tool sends the notice and decides to whom." Design 2:85: "A user the tool cannot follow fully counts as using everything of that provider." Under the design, users of other entries can be told.

OUT OF DATE:

1. bg 3:17: "Each module has a requirements file, with a public part and a private part, under permanent numbers." The design has no public or private part. Design 2:14: "Each module has one requirements file. Each requirement has a permanent number and is marked met or not yet met." (The words "public part" are in the older Foundations, not in the design state.)
2. bg 3:27: "Bob changes it by telling the coordinator." bg 7:33 says the same. Design 2:47: "The owner can change the number by a marked instruction."
3. bg 3:35: "A flaw a job finds in another module goes to ARCH, which passes it to that module's job." Design 2:25: "A flaw it finds in another module goes to ARCH, which places it against that module." The design also says what the background lacks (design 2:33): "When the other module merges, the job is made ready again."
4. bg 3:39: "A module's work is finished when its job merges, or when its notified job tells ARCH that nothing needs changing." The design's rule is longer and differs. Design 2:41: "A module whose only work was a notice is also finished when its job records in its own pull request that nothing needs changing." Design 2:42: "A module with a walk flaw against it is finished only by a merge." Design 2:76: the told job "records the result in its pull request, and closes it unmerged".
5. bg 3:62: "A build tool writes out the module's interface". Design 2:70: "The tool writes out the module's interface". In the design it is the process's one tool (design 6:36). Minor.
6. bg 3:71: "How a notified job picks the tests that relate to a changed entry is owed (part 10). Two smaller matters are also open: who is told when the product's list of modules itself changes, and what becomes of a module that says it uses another while none of its code does." The design now states all three. Design 2:74: "**Which tests relate. Claude decided:** the tool picks them, not the job." Design 2:79: "**When the module list changes. Claude decided:** a change to the list sends no notice of itself." Design 2:80: "**A declared use that no code makes. Claude decided:** it receives no notice".

WHOSE RULE:

1. bg 3:66: "A change to the words that state a bound is a change to the interface." No mark, in a list headed "The conclusions, as the design holds them". The design has it as number 3 of a list headed "**Claude decided,** for the tool that finds the change" (design 2:82, 2:86), though with the owner's words quoted in support.

DUPLICATES: about 27. Example, bg 3:29: "Its job is ready when the module has work and no job open. A ready job does not wait for the modules it uses." Design 2:22 says the same.

## Background part 4 (tranche, rounds, walks, release)

CONTRADICTS: none.

OUT OF DATE:

1. bg 4:23: "The tranche ends when a round's external walk comes clean." Design 3:48: "**Reading:** a tranche ends when a round's partial walks, internal and external, both come clean; or, where the owner asked for a full external walk, when that walk is clean." The two agree in effect, since the external walk is made only after an internal walk with no flaws; the background gives the shorter form. The design also now holds an open question the background lacks (design 3:49): "**Open (the owner):** what shows that the journeys named for the tranche do complete at its end, when a round's walks cover only the areas that round changed."
2. bg 4:73: the tranche report "gives time, work done and left, and cost where it can be read, marked 'unmeasured' where it cannot." Design 3:53 lists more: "anything deferred and why ... the overhead share, ARCH's idle time while work was ready, the owner's minutes, and every change the UX lane made during the tranche to the two documents the walks are measured against."

Not stated in the background at all, so not counted: the design's open questions on who publishes a release (design 3:60), on an urgent fix while a tranche is open (design 3:68), and its reading on a tranche merged with its flaws named (design 3:52).

WHOSE RULE:

1. bg 4:23, above: no mark. The design marks it "Reading", and lists it as open with the owner (design 10:12).
2. bg 4:63: "The UX lane keeps them." No mark. Design 3:33: "**Reading:** the UX lane owns them".
3. bg 4:73: "At the end of a tranche ARCH writes one report". No mark. Design 3:53: "**Claude decided:** by ARCH, and that it lists the UX lane's changes".

DUPLICATES: about 30. Example, bg 4:37: "Every round's walks are partial, the first round's included. Before each walk, ARCH names the areas that the round's updates affect. A partial walk is without flaws when it lists no flaw in the areas it was given." Design 3:23 says the same.

## Background part 5 (roles and sessions)

CONTRADICTS:

1. bg 5:21: "The tool is small: it pushes, opens a pull request and marks it ready, merges, starts the next job, sends notices and writes the shared state." Design 4:17: "**Claude decided:** the tool chooses the next job and writes its starting instructions; ARCH's session makes the start, because only a session can start a session." The background's list is also shorter than the design's (design 6:36).
2. bg 5:35: "Sessions are at most three levels deep". bg 9:74 says the same. Design 4:29: "Under a ROOT the owner started, sessions sit at most three levels deep ... A takeover by the watcher adds a level". Design 4:110: "Each takeover leaves the new ROOT one level deeper than the one before".
3. bg 5:52: "A change that touches only files in the lane's own folder merges without a test run." Design 2:105 says it "needs no module tests", and design 2:106: "The required test run reports on every pull request. It passes at once when no module's code or tests changed".

OUT OF DATE:

1. bg 5:10: the watcher's "takeover is not yet designed". bg 5:17: "That design is owed, and the takeover is unproven." The design now holds it (design 4:101 to 4:110), marked "**Claude decided** this design. **Unproven:** all of it". For example design 4:107: "If ROOT has missed two wakes, the watcher takes over."
2. bg 5:39: "Codex: how separate sessions, their depth, the passing on of model and effort, and archiving are carried there is not yet known." Design part 8 now records three of the four. Design 8:15: "A child inside the starter's own chat. A session listed on its own, started by another session, could not be made from a hosted session | Child: measured. Separate session: measured as blocked". Design 8:30: "Depth of sessions | Four". Design 8:26: "Archiving | Not available to a hosted session | Measured as absent". Model and effort are still "Not known" (design 8:31).
3. bg 5:67: "The level has no settled value yet (part 10)." Design 5:23: "The fill level for a refresh | 40 percent | The owner's words of 17 Nov ... Not measured", provisional (design 5:16).
4. bg 5:69: "Codex: a hosted session shows no reading of how full its context is, so what carries the fill level there is not yet known." Design 5:26: "**Claude decided:** where a harness shows no fill level (part 8), the refresh comes only at a natural pause."
5. bg 5:85: "Exactly what the shared state holds is owed (part 10)." The design now states it: eight records with their writers (design 4:70 to 4:79), and what carries them (design 4:83): "one issue in the product's repository, found by its label, with each record one comment rewritten in place."
6. bg 5:87: "Codex: where the shared state lives there is not yet known." Design 8:28: "In the one trial, a file on the host, not on GitHub | Documented".

WHOSE RULE:

Seven lane rules stated with no mark, which the design places under "**Reading:** the rest of this section stands as written; the owner has not confirmed each rule one by one" (design 4:44):

1. bg 5:45, a lane owns a folder and delivers designs, never code (design 4:46).
2. bg 5:46, "Bob identifies the need for a lane", "The UX lane is always there", and it "keeps the Screens document and the journeys" (design 4:47, 4:53). That ARCH starts the lane is the owner's ruling (design 4:40).
3. bg 5:47, the first-run research (design 4:49).
4. bg 5:49, the owner keeps direction, audiences and principles (design 4:51).
5. bg 5:50, "Questions reach a lane through ARCH. A job never talks to a lane, and lanes do not talk to each other." (design 4:52). That he works through design pages is the owner's ruling (design 4:42).
6. bg 5:51, one session at a time, ARCH's call by cost (design 4:48).
7. bg 5:52, the lane-folder change (design 2:105: "**Reading:** this is among the lane rules he has not confirmed one by one").

And one more:

8. bg 5:12: ARCH "records each decision in the product's repository". No mark. Design 5:50: "**Claude decided:** ARCH's technical decisions are written in a second record in the product's repository". Minor.

DUPLICATES: about 33. Example, bg 5:81: "Sessions name roles, not particular sessions. So a job obeys ARCH even after ARCH has been replaced." Design 4:81: "Sessions name roles, not session addresses, so that a replaced role can be obeyed."

## Background part 6 (reading in full, and the documents)

CONTRADICTS: none.

OUT OF DATE:

1. bg 6:19: "The values are not yet settled, and are owed (part 10). The figures found so far are in `process4/working/harness_separation/` ... The values are settled first from the limits that Process3's own rules set. If those do not settle them, credible tests measure the thresholds." The design now gives four figures (design 5:18 to 5:23): 24,000 bytes, 175,000 bytes, 4,096 bytes with at most ten rules, and 40 percent. Design 5:16: "All four are **provisional**. They stand, on the owner's word, until a second measurement reports." The design names a first measurement and a second (design 5:61), not the route through Process3's limits.
2. bg 6:29: "There is one short rulebook for each role, of at most ten rules." Design 5:22: "A role's starting text | 4,096 bytes, and at most ten rules | Proposed by Claude. 'At most ten rules' is kept from the process before this one. Not measured". The background lacks the byte figure and the standing of the rule.
3. bg 6:39: "Codex: the limit on the instruction files a hosted session loads is not yet known." Design 8:20: "`AGENTS.md`, one for each folder ... sharing one budget of 32 KiB by default ... | Documented. The hosted limit was not measured". The default is now recorded; only the hosted limit is unmeasured.

WHOSE RULE:

1. bg 6:29, above: stated as a settled rule. The design holds it as a provisional figure "Proposed by Claude" (design 5:22) and open with the owner (design 10:11).

DUPLICATES: about 22. Example, bg 6:45: "A lower kind never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH." Design 5:55 says the same.

## Background part 7 (how Bob's words become decisions)

CONTRADICTS: none.

OUT OF DATE:

1. bg 7:33: "He changes the number of slots by telling the coordinator the new value." Design 2:47: "by a marked instruction". The same point as bg 3:27; counted once, under part 3.
2. bg 7:56: "Codex: how sessions are grouped and archived there is not yet known." Design 8:26: "Archiving | Not available to a hosted session | Measured as absent". Grouping is still "Not known" (design 8:33).

WHOSE RULE: none. The reading at bg 7:68 is marked, as at design 4:98.

DUPLICATES: about 15. Example, bg 7:15: "A session that thinks Bob has decided something without the mark asks once: 'Shall I record that as a decision?'" Design 1:39 is the same sentence.

## Background part 8 (changing the process)

CONTRADICTS:

1. Possible, and I am unsure. bg 8:50: "A job held up by a process fault is not started over. Once the product has moved to the corrected process, the same job carries on." The design has no such sentence. Design 3:9: "A product's tranche runs on one fixed version of the process from open to close". A job lives inside a tranche, so a job that carries on after the product has moved would be in a tranche that changed version. The background states the fixed-version rule itself two lines earlier (bg 8:48).

OUT OF DATE: none.

WHOSE RULE:

1. bg 8:48: "Each session fetches a read-only copy of that version." Stated as fact. Design 7:37: "A read-only copy of the process | **Unproven:** how a session that holds one repository fetches the process's copy without losing its deny list".

DUPLICATES: about 21. Example, bg 8:65: "Nothing is removed or tried unless Bob says so." Design 6:71: "Nothing is removed or tried unless he says so."

## Background part 9 (permissions and the platform)

CONTRADICTS:

1. bg 9:68: "The process stands only on platform behaviour that has been measured." The design rests rules on platform behaviour it says is not measured. Design 7:28, grouping sessions by tag: "Read in the session tools' own descriptions; not measured". Design 7:31, model and effort passed on: "Read in the starting tool's own description; not measured". Design 7:33, the limit on depth: "One session reported a limit of eight (seen once)".
2. bg 9:74: "So sessions are at most three levels deep." The same contradiction as bg 5:35; counted once, under part 5.

OUT OF DATE:

1. bg 9:9: "Process4 holds its rules with four things", the first being "Each session's instructions". Design 6:7: "Three things hold a rule whatever a session intends: the owner's standing approvals, judged by the permission checker; the list of forbidden commands; and GitHub's own rules". Design 6:8: "Every other rule in this design is held by text: by a session's instructions and by this document. That is a known limit."
2. bg 9:34: "What an edit does to a round that is running is a technical matter still owed (part 10)." Design 4:115 now states it: "the owner first tells the coordinator to stop, and open jobs push and stop; he commits the edit and starts ROOT; ROOT starts the standing roles afresh; ARCH starts a new session for each module with an open pull request ... The round goes on from the round record."
3. bg 9:50: "Who can read the deploy token is owed (part 10)." Design 9:21: "The deploy token is for the development account only. Only ARCH's instructions name deploying. Nothing physical keeps the token's value from another session in the same environment."
4. bg 9:80: "Why GitHub suspended the sessions' account on 6 Nov is owed (part 10)." Design 10:89, under risks with no trial: "Why GitHub once suspended the sessions' account was never learned."

WHOSE RULE:

1. bg 9:34: "So an edit to the approvals goes together with a restart of ROOT." No mark. Design 6:14: "**Claude decided:** an edit therefore goes with a restart of ROOT".

DUPLICATES: about 27. Example, bg 9:59: "An act the permission checker refused is never reworded and never retried elsewhere." Design 6:31: "A refused act is never reworded or handed to another session." The table at bg 9:88 to 9:98 repeats nine rows of design 7:9 to 7:38.

## Background part 10 (proven, unproven and owed)

CONTRADICTS: none.

OUT OF DATE:

1. bg 10:31: "Judged cost to Bob: one sitting of about half an hour, with two session starts, one edit to his approvals and one 'stop'." Design 10:53: "**Claude judged** that it needs the owner for one sitting: session starts, one edit to his approvals, one stop, and three short marked instructions. The account switch, item 15, adds his acts in a second account."
2. bg 10:35 to 10:48, the trial list, is an older form of design 10:58 to 10:72. bg 10:35 has ROOT start "ARCH and the coordinator"; design 10:58 has it fetch the newest copy and start "the watcher, ARCH and the coordinator". bg 10:39 has the watcher take over "from a ROOT that has died"; design 10:62 adds "and from one that asks". bg 10:43: "A mechanical edit across several modules merges once"; design 10:66 adds "tried with the touched modules' tests run and with none run". bg 10:48 lists "running and confirming an install and an update before a release" apart from what the trial rehearses; design 10:69 makes it trial item 12. The background lacks design 10:68, "An edit to the approvals with a restart carries a round on", and design 10:70, "The rule for who takes a free slot gives the same answer every time."
3. bg 10:54 to 10:59, what only the first real tranche can show. The background has "How many notices the notice's method saves on a real product", which design 10:74 to 10:81 does not list. The design has "Whether a lane's session is better kept running or started when a question arrives" (design 10:81), which the background does not.
4. bg 10:65: "The values of the maximums, to fill the design's named blanks (part 6) ... Writer's reading: the fill level at which a long-lived role is refreshed (part 5) is one of those blanks." The design has no blanks; it has four provisional figures (design 5:18 to 5:23).
5. bg 10:66: "A design for how a notified job picks the tests that relate to a changed entry (part 3)." Now design 2:74 to 2:78.
6. bg 10:67: "The design of the watcher's takeover (part 5)." Now design 4:101 to 4:110.
7. bg 10:68: "A worked proposal on branches and on where Bob's approvals live, with each act asked of him". Now design 6:17 to 6:20 and 7:54 to 7:69.

The ten "Technical matters that Claude settles and reports" (bg 10:72), each listed as not yet done:

8. bg 10:74, "when a round's jobs are done". Design 2:43: "A round's jobs are done when every module that had work when the round opened, or was given work during it, is finished."
9. bg 10:75, "who can read the deploy token". Design 9:21, quoted above.
10. bg 10:76, "who decides an interface between two modules". Design 2:98: "ARCH decides the interface between two modules."
11. bg 10:77, "what becomes of files that no module owns". Design 2:9: "A file that fits none is given to a module by ARCH before any job touches it."
12. bg 10:78, "which copy a job's tests run against". Design 2:34: "a job's module tests run on its pull request as GitHub would merge it into the tranche branch at that moment."
13. bg 10:79, "what the shared state holds". Design 4:70 to 4:79.
14. bg 10:80, "what ends a loop that has no end". Design 4:133: "**A loop that would not end. Claude decided** each end."
15. bg 10:81, "what an edit to Bob's approvals does to a running round". Design 4:115.
16. bg 10:82, "why the sessions' account was suspended on 6 Nov". Design 10:89: "was never learned".
17. bg 10:83, "the two smaller open parts of the notice". Design 2:79 and 2:80.

And:

18. bg 10:85: "One more matter is not yet settled: how two products running at once share the eight slots. Claude settles it when a second product starts." Design 2:49: "**Claude decided:** when two products run at once, each product's process config names its share of the slots, and the shares add up to the account's number. The default is an equal split."

Still current in the background's "Owed": the Codex side (bg 10:69; design 10:19) and each product's conversion plan (bg 10:70; design 10:26).

WHOSE RULE: none.

DUPLICATES: about 18. Example, bg 10:37: "A freed slot is refilled within minutes, and jobs obey an ARCH that has been replaced." Design 10:60: "A freed slot is refilled within minutes, and jobs obey a replaced ARCH."

## Background the design leans on and the background lacks

The design says in general where its reasons are. Design 0:10: "The reasons and the evidence are in the background document." Design 5:38: "A background document gives the background and context; it is the owner's Foundations brought up to date with the design." Listed here are the places where the design itself refers to a measurement, a past event, a record or the owner's reasons, and the background holds none of it. Where the design names a working file instead, that is said. For some items I also searched the background's two sources, the design state and the two working Foundations files, for the key words; the result is given.

1. The four values and what they rest on (design 5:16 to 5:25). The figures 24,000 bytes, 175,000 bytes, 165,358 bytes and 4,096 bytes are nowhere in the background. The design names working files for them (design 5:61). The design state holds 24,000 and 175,000; the working Foundations hold neither.
2. The owner's words behind the provisional values, "these current values", "his words of 18 Nov to the session he was working with" (design 5:16). Not in the background. The background names no file of his words for 18 Nov, and `process4/owner_words/` has none dated 18 Nov. The design state quotes them.
3. The 40 percent fill level and "The owner's words of 17 Nov" (design 5:23). The background names the 17 Nov files but gives no figure, and says the level "has no settled value yet" (bg 5:67).
4. The first reading measurement on Claude Code and the owner's judgment of it as "too weak to rely on" (design 5:20, 5:21, 7:42 to 7:45: 25,000 tokens, 256 KB, a 1,000,000-token window). None of it is in the background. The second measurement (design 5:16, 5:61) is not mentioned either.
5. "'At most ten rules' is kept from the process before this one" (design 5:22). The background states the rule (bg 6:29) and gives no origin.
6. The Codex measurements. Design 5:10: the Codex maximums "rest on real measurements". Design part 8 marks rows "Measured", "Documented" and "Measured, second-hand". The background repeats the claim (bg 6:17) and holds no Codex measurement; on Codex it says only what is not yet known, and in four places says unknown what part 8 now records (bg 5:39, 5:87, 6:39, 7:56).
7. The shared state's carrier (design 4:83 to 4:88): why one GitHub issue with a comment for each record, that "GitHub keeps no guard against two writes to one comment at the same moment", and the alternatives set aside. The design names a working file (design 4:87). The background holds only the owner's reason against files building up (bg 5:77).
8. The watcher's takeover (design 4:101 to 4:110): why two missed wakes, why each takeover goes a level deeper. Nothing in the background, which calls the design owed. One related measured fact is there (bg 9:72: "A fresh session started by an alarm could not start sessions (0 of 3)").
9. The limit on depth: "One session reported a limit of eight (seen once)" (design 7:33). The background says only that the limit "is a measured behaviour of that harness" (bg 5:35), with no figure. The figure is in neither of its sources.
10. "A worker cannot start workers (seen once)" (design 7:20). Not in the background.
11. How a told job's related tests are picked (design 2:74 to 2:78). The design names a working file for the grounds (design 2:78). The background holds none and calls the matter owed.
12. The owner's acts to start a product, "and why each cannot be a session's act" (design 7:56), and the repository settings (design 7:60, 7:61, 7:67). The design names a working file. The background has the second GitHub account (bg 9:44) and nothing on the order, the settings or the reasons.
13. Four quotations the design says come through earlier records, which the background does not hold or source:
    - design 2:59, the declared-uses check, "in the words of the record of 13 Nov", and "I think it has to check tests too". The background has the rule (bg 2:33) and no source.
    - design 4:33, "His ledger note, as the sixth draft quotes it". The background has the standard (bg 5:33) and no source.
    - design 6:60, "His written instructions, as a field report quotes them". The background has both sentences (bg 1:75) and no source.
    - design 9:14, "The owner's caution of 8 Nov, as the earlier process's decision record quotes it", on too many external walkers. Not in the background.
14. "The owner approved two refusals" (design 2:60). The background states the two refusals (bg 2:34, 2:35) and names no words of his for them.
15. "The owner's ledger was a worksheet and is retired" (design 5:37). The word "ledger" is not in the background. The design state has the sentence.
16. Renewing the Codex sign-in, "which the owner expects Codex to need and the process to support cleanly" (design 8:46). The background has token renewal in general (bg 7:68) and nothing on a Codex sign-in.
17. Why the two-products rule is as it is: "because no record is shared between two products" (design 2:49). The background says the matter is not yet settled (bg 10:85).
18. The known weaknesses of AI sessions (design 1:65 to 1:79). Held in part only. The background has the principle and names the owner's words (bg 1:79), and holds evidence for some weaknesses in other parts (compaction, reading in full, refusals, quoted consent). It holds nothing for "Caution grows the process" as a weakness of a session, for "A successor acts from memory it does not have", or for "The same correction fails again and again".

Checked and found held in the background, so not listed: quoted consent declined (design 3:61; bg 9:30); the stale copy of a branch (design 7:49; bg 9:36); starts failing at about fifty sessions (design 7:52; bg 9:73); the 60 and 64 minute deployments (design 9:26; bg 4:29); the failed account switch (design 10:44; bg 5:95); no clean walk in the process before (design 10:38; bg 4:79); merges through the earlier tool (design 6:42; bg 9:22); rules held by text drifting (design 6:8; bg 8:14); the notice's proof (design 2:78; bg 3:83).

## Counts

| | Index | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Contradicts | 0 | 0 | 1 | 2 | 0 | 3 | 0 | 0 | 1 | 1 | 0 | 8 |
| Out of date | 0 | 2 | 1 | 6 | 2 | 6 | 3 | 1 | 0 | 4 | 18 | 43 |
| Whose rule: background unmarked, design marked | 0 | 0 | 2 | 1 | 3 | 8 | 1 | 0 | 1 | 1 | 0 | 17 |
| Whose rule: the reverse | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Duplicates the design (approximate) | 2 | 40 | 17 | 27 | 30 | 33 | 22 | 15 | 21 | 27 | 18 | 252 |

- Contradicts: 8. Two of them are marked as unsure: bg 2:37 (wording) and bg 8:50 (possible).
- Out of date: 43. Repeats of one point in two parts are counted once (bg 7:33 with bg 3:27; bg 9:74 with bg 5:35).
- Whose rule: 17, all one way. By the design's mark: Reading 9 (one of them also Open), Claude decided 5, Unproven 2, provisional and proposed by Claude 1.
- Duplicates: about 252 of the background's paragraphs, list items and table rows, an estimate.
- Background the design leans on and the background lacks: 18, one of them (the last) held in part.
