Length: 212 lines. Last section: "127. What a lane decides, and what stays with you".

## Part 3. The tranche, rounds, walks, and release (continued)

### 105. Where the install and update are tried, and what "successful" means
- **Where:** Part 3, section 6, second point; also part 9, section 1 (install and update row).
- **The design says:** "**Reading:** the install and the update run on a development account; "successful" means the installer or updater finishes without error and the site it produced starts; on a failure no release is offered and the fault becomes work in the next tranche."
- **In practice:** The install and update are tried on the development account; if either fails, no release is offered.
- **Where it came from:** A reading by Claude, not confirmed by you.
- **Your nearest words:** "3. installer and site updates wait for a clean development release walk" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 106. ARCH prepares a release; development releases need no approval
- **Where:** Part 3, section 6, third point.
- **The design says:** "ARCH prepares the release and waits for the owner's approval (**from a session's record:** the Foundations, as the sixth draft cites them, its line 194). ... **Claude decided:** a development release, made only for development, is made and published in one act as a pre-release and needs no approval; his approval is for public releases."
- **In practice:** ARCH gets each release ready and waits for you; trial releases for development only go out without asking you.
- **Where it came from:** A session's record (the Foundations, as the sixth draft cites them), not your typed words; the development release rule is Claude's own choice.
- **Your nearest words:** Your standing approvals (Process3's `CLAUDE.md`): sessions may "cut development releases, with their tags and pre-releases in the product's repository" and may never "publish a public release or promote a release to installed sites without my approval".
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 107. Who publishes once you approve
- **Where:** Part 3, section 6, fourth point.
- **The design says:** "**Open (the owner):** who carries out the act of publishing once he has approved. **Reading:** ARCH publishes the release in the product's repository; promoting it to installed sites is the owner's, by the written procedure (section 8)."
- **In practice:** ARCH would publish the release; you would put it onto the sites real users use.
- **Where it came from:** A reading by Claude, not confirmed by you. Marked open for you.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 108. How your approval of a release reaches ARCH
- **Where:** Part 3, section 6, fifth point.
- **The design says:** "**Claude decided** how his approval reaches the publishing session, if ARCH publishes: ARCH prepares the release unpublished and the coordinator puts it on his standing page. He types his approval in ARCH's own session, as a marked decision naming that release. ARCH publishes in that turn and passes his words to the coordinator for the record. Approval relayed through another session is not used, because the permission checker has declined consent that was only quoted."
- **In practice:** You would type your approval directly into ARCH's session, because the platform's safety check refuses approval passed on by another session.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 109. Release notes, and where they and the procedures are kept
- **Where:** Part 3, section 6, sixth point.
- **The design says:** "With each release the process writes what changed, what the update does to stored data, and how to go back (**from a session's record:** the design state, line 124). **Claude decided:** these notes, the written procedures of section 8 and each tranche report are kept in the product repository's process folder, named in the process config, and change as the process's named files do (part 2, section 9)."
- **In practice:** Each release comes with notes on what changed, what happens to stored data and how to undo it, kept with the product.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 124), not your typed words; where they are kept is Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 110. An urgent fix
- **Where:** Part 3, section 7.
- **The design says:** "An urgent fix is a tranche whose content is that fix alone. **From a session's record:** the design state, line 70." "**Open (the owner):** what happens to a tranche that is open when an urgent fix is needed, since the main branch does not move while a tranche runs. **Reading:** the open tranche is paused on the owner's word; the fix is built as its own tranche from the main branch and merged; the paused tranche then takes the main branch in and goes on."
- **In practice:** An urgent fix is a tiny batch of its own; a batch already under way would pause on your word and resume after.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 70), not your typed words; the pause is a reading by Claude. Marked open for you.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 4. Roles and sessions

### 111. ROOT: started by a plain prompt, woken hourly, decides nothing
- **Where:** Part 4, section 1, first point.
- **The design says:** "**ROOT** is the first session. The owner starts it with a plain prompt on the product's repository (**from a session's record:** the record of 13 Nov, lines 16 and 22). ... Once an hour a scheduled wake rouses it as a safety net, to wake or replace a session that has stopped (**from a session's record:** the Foundations, `foundations_tranche_9nov.md`, line 82). **Claude decided:** it decides nothing about the product and builds nothing."
- **In practice:** You start ROOT with a short message; it starts the others, checks on them every hour, and does no product work. The short message itself, as drafted for you, is Claude's text written in your first person.
- **Where it came from:** Sessions' records (the 13-14 Nov record; the Foundations, line 82), not your typed words; the last sentence is Claude's own choice.
- **Your nearest words:** "M1: ROOT" and "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 112. A watcher is kept, and ROOT starts it
- **Where:** Part 4, section 1, second point; section 6, first point.
- **The design says:** "**The watcher** is a standby session that takes over if ROOT dies. ROOT starts it (section 6). **From a session's record:** the design state, line 83." Section 6: "That the watcher is kept and ROOT starts it is **from a session's record:** the design state, line 83; his only word on it is a question"
- **In practice:** A second session stands by to replace ROOT if ROOT stops.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 83. Not your typed words.
- **Your nearest words:** "O7: are you certain that the watcher isn't needed?" (`bob_words_14nov_c.md`); "Under Claude Code (CC) running process4, if ROOT was archived or deleted it's features would die with it. That has never been a problem because ROOT never just died on its own." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them: your words are a question, and later doubt the need.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 113. How the watcher takes over from ROOT
- **Where:** Part 4, section 6, all points after the first.
- **The design says:** "**Claude decided** this design." "The watcher has its own scheduled wake. At each wake it reads the time ROOT last woke." "The watcher wakes hourly, half an hour after ROOT. If ROOT has missed two wakes, the watcher takes over. ..." "A planned refresh of ROOT is the same takeover, asked for ..." "Each takeover leaves the new ROOT one level deeper than the one before ... When the harness's limit on depth is two levels away, ROOT puts it on the owner's standing page, and the owner starts a fresh ROOT at a pause."
- **In practice:** If ROOT misses two hourly checks the watcher becomes ROOT; after several such takeovers you are asked to start a fresh ROOT.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "O7: are you certain that the watcher isn't needed?" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 114. What the coordinator does
- **Where:** Part 4, section 1, third point.
- **The design says:** "It passes on his marked decisions and instructions exactly as typed and dated, and keeps the product's record of them. It answers his questions in words, never by building anything. It tells him what ARCH decided, one plain line each, puts to him the questions that are his, and gives him the account after each round (**from a session's record:** the design state, lines 47 to 51 and 61). ... **From a session's record:** the record of 13 Nov, line 17: on his word it changes the slot number or stops work."
- **In practice:** The coordinator talks with you, records your decisions, reports ARCH's, and on your word changes the number of sessions or halts work. (Holding a merge and putting a module first are under part 2 above.)
- **Where it came from:** Sessions' records: Claude's notes of 18 Nov; the 13-14 Nov record, line 17. Not your typed words.
- **Your nearest words:** "Yes, the coordinator is the front door." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 115. What ARCH does and never does
- **Where:** Part 4, section 1, fourth point.
- **The design says:** "It decides every technical matter of the product, writes each decision in the product's decision record, and settles a design before anything is built on it. It writes requirement text, keeps the module list, proposes each tranche, names each walk's areas, turns each flaw into work for a named module, makes the development deployment, prepares a release, starts the product's lanes, and writes the tranche report. It never edits the owner's approvals, changes the process, or publishes a release without him. **Claude decided**, carried from the sixth draft, except: the deployment and the release, **from a session's record:** the Foundations, as the sixth draft cites them (its line 194); and starting the lanes, the design state, line 85."
- **In practice:** ARCH is the product's technical lead and keeps its plans.
- **Where it came from:** Mostly Claude's own choice; the deployment and release from the Foundations, and starting lanes from Claude's notes of 18 Nov, neither your typed words.
- **Your nearest words:** "ARCH used to be the front door, and it continues to play a very important role." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 116. What the program does and what ARCH keeps
- **Where:** Part 4, section 1, the paragraph after the list.
- **The design says:** "whatever has one right answer is done by the tool: who takes a free slot, when a notice is sent and to whom, whether a round's jobs are done. ARCH's session keeps what needs judgment. The share of ARCH's work that is passing things on is measured on the first tranche. **From a session's record:** the design state, line 82. **Claude decided:** the tool chooses the next job and writes its starting instructions; ARCH's session makes the start, because only a session can start a session."
- **In practice:** Routine bookkeeping is done by the process's program; ARCH does what needs judgment.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 82), not your typed words; the last sentence is Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 117. Who starts whom
- **Where:** Part 4, section 2, table and the paragraph under it.
- **The design says:** Table: the owner starts ROOT; ROOT starts "The watcher, ARCH, the coordinator, PROCESS"; ARCH starts "Jobs, walking sessions, the product's lanes"; PROCESS starts "Its own lanes (a reading; part 6, section 8)"; "A long-lived role or a job" starts "Its own workers". "**From a session's record:** ROOT starts ARCH and the coordinator, the record of 13 Nov, line 22; the watcher, and ARCH the lanes, the design state, lines 83 and 85; ARCH starts jobs, the Foundations (`foundations_tranche_9nov.md`, line 77). ... **Claude decided:** the rest."
- **In practice:** This is the chain by which each session comes into being.
- **Where it came from:** Several sessions' records, not your typed words; ARCH starting walkers and roles starting their workers are Claude's own choice. ROOT starting PROCESS when ARCH asks is yours.
- **Your nearest words:** "ARCH can ask ROOT to start PROCESS if it isn't already running" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 118. At most three levels of sessions
- **Where:** Part 4, section 2, first point under the table.
- **The design says:** "Under a ROOT the owner started, sessions sit at most three levels deep: ROOT; then ARCH, the coordinator, the watcher and PROCESS; then jobs, walking sessions and lanes. A takeover by the watcher adds a level (section 6). **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, line 60)."
- **In practice:** Sessions are started no more than three steps down from ROOT.
- **Where it came from:** A session's record: the Foundations, line 60. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 119. No session starts its own replacement
- **Where:** Part 4, section 2, second point under the table.
- **The design says:** "No session starts its own replacement. **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, line 77)."
- **In practice:** A session that needs replacing asks the session above it.
- **Where it came from:** A session's record: the Foundations, line 77. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 120. How every session is started
- **Where:** Part 4, section 2, third and fourth points under the table.
- **The design says:** "A session is started with one repository only (**from a session's record:** the ledger, as the sixth draft quotes it, its line 418); **Claude decided:** from the newest commit of the tranche branch, or for PROCESS of the process repository's main branch; in the harness's unattended mode; and with starting instructions that name every act it may take." "**Claude decided:** ROOT's first act is to fetch the newest copy of its branch, and to stop if it cannot."
- **In practice:** Each session gets one project, the latest copy of it, runs without anyone answering it, and is told every act it may take.
- **Where it came from:** A session's record (the ledger lines), not your typed words; the rest is Claude's own choice.
- **Your nearest words:** "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 121. Model and effort passed on
- **Where:** Part 4, section 2, fifth point under the table.
- **The design says:** "Every session passes the owner's suggestion of model and effort on to each session it starts. **From a session's record:** the ledger (SES-8, `ledger_lines.md`, line 967), where it is given as his own words: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand"."
- **In practice:** Each session tells the sessions it starts which AI model and how much effort to use, as you suggested.
- **Where it came from:** A session's record: the ledger lines, which give these as your words. They are not in any file of your typed words.
- **Your nearest words:** "If you run it, pick a model and effort that's appropriate." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Agrees in spirit.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 122. ARCH starts the product's lanes
- **Where:** Part 4, section 3, first point.
- **The design says:** "ARCH starts a product's design lanes. **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, line 60, "Bob's answer, Keep and Drop page, 6 Nov")."
- **In practice:** ARCH, not you or ROOT, starts each design lane.
- **Where it came from:** A session's record: the Foundations' own summary of your 6 Nov answer. Not your typed words.
- **Your nearest words:** "Lanes are an important element of the development process, though they haven't been fill into the process4 design." (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 123. A lane decides design; ARCH decides what gets built
- **Where:** Part 4, section 3, second point.
- **The design says:** "A lane decides design in its area. ARCH decides whether and when a design is built and whether it can be built as given. A design ARCH cannot build goes back to the lane. **From a session's record:** the design state, line 86."
- **In practice:** Lanes design; ARCH can send a design back if it cannot be built.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 86. Not your typed words.
- **Your nearest words:** "But interacting with lanes is crucial, as this is where architecture and design decisions are made." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 124. A lane's folder, and its research before it answers
- **Where:** Part 4, section 3, under "Reading: the rest of this section stands as written", first and fourth points.
- **The design says:** "A lane has a folder of design knowledge in the product's repository, which it owns. It reads its area whole. It delivers designs, never product code." "The first time a lane runs, it uses workers to research the product's founding documents, the existing code and the best practice of its area, and answers no question until that research is recorded in its folder. Every later session of the lane reads it first and adds to it."
- **In practice:** Each lane keeps its own folder, studies first, and only then answers questions.
- **Where it came from:** A reading of your words by Claude, not confirmed by you rule by rule.
- **Your nearest words:** "So The first time a lane is defined and run, it should start by using workers to fully research canon documents, existing code, and best practices related to their specialty area" (your words of 6 Nov, quoted in the Foundations, `foundations_tranche_9nov.md`, line 93)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 125. Opening and ending lanes; the UX lane and its documents
- **Where:** Part 4, section 3, under the "Reading" mark, second, eighth and ninth points.
- **The design says:** "The owner identifies the need for a lane, and ARCH opens it. The UX lane is always there. A product's other lanes are named in its process config." "The UX lane owns the Screens document and the journeys." "A lane ends when the owner or ARCH says its area needs no further design. Its folder and research stay."
- **In practice:** You say when a lane is needed; the user-experience lane always exists and keeps the screens and journeys; a lane closes when no more design is needed there.
- **Where it came from:** A reading of your words by Claude, not confirmed by you rule by rule.
- **Your nearest words:** "Lanes are an important element of the development process, though they haven't been fill into the process4 design." (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 126. One session per lane; kept running or not is ARCH's call
- **Where:** Part 4, section 3, under the "Reading" mark, third point.
- **The design says:** "A lane runs as one session at a time. Whether it is kept running or started when a question arrives is ARCH's call, judged by cost, and is measured at the end of the first tranche."
- **In practice:** A lane may not always be running; ARCH decides by cost.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** "Just to name it - all of these sessions may need to stay active beyond the completion of their initial scope of work. So these are truly and fully interactive sessions." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Differs in part: you said these sessions may need to stay active.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 127. What a lane decides, and what stays with you
- **Where:** Part 4, section 3, under the "Reading" mark, fifth and sixth points.
- **The design says:** "A lane decides design and wording in its area, within the product's principles." "The owner keeps the product's direction, audiences and principles. A lane decision that would change one comes to him with options and the lane's recommendation."
- **In practice:** Lanes decide design and wording; anything that would change the product's direction, audience or principles comes to you.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** "interacting with lanes is crucial, as this is where architecture and design decisions are made" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
