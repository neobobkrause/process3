Length: 228 lines. Last section: "152. How a job's change is set up".

## Part 4. Roles and sessions (continued)

### 128. Questions reach a lane only through ARCH
- **Where:** Part 4, section 3, under the "Reading" mark, seventh point.
- **The design says:** "Questions from the work reach a lane only through ARCH, which passes each on with enough context to decide. A job never talks to a lane, and lanes never talk to each other."
- **In practice:** Building sessions and other lanes cannot ask a lane directly.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 129. Lane sessions use no slot, and only one per lane
- **Where:** Part 4, section 3, the "Claude decided" paragraph.
- **The design says:** "**Claude decided:** a lane session uses no job slot. A fresh lane session begins by reading the lane's research and the links to its design pages. One session for each lane is held by the lanes record. The record is written before the session is started, and the tool refuses to write a second while the first is recorded as live."
- **In practice:** Lanes do not count against the eight, and two copies of the same lane cannot run.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 130. Questions to a lane are not kept as a running record
- **Where:** Part 4, section 3, last point.
- **The design says:** "**Reading:** the questions ARCH puts to a lane, and its answers, are not kept as a running record. What a lane decides is written into its folder as design."
- **In practice:** Only a lane's decisions are written down, as design, not the questions and answers.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** "I think that Codex needs to be careful about using github as a communications channel." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 131. What goes in a job's own record, and nothing piles up as files
- **Where:** Part 4, section 4, first and second points.
- **The design says:** "**Claude decided:** what belongs to one job stays in that job's pull request, and what every role needs is in the shared state." "What sessions say to each other, and the process's running records, never build up as files or commits in a repository. **From a session's record:** the design state, line 118."
- **In practice:** Messages and bookkeeping never pile up as files in the product.
- **Where it came from:** Claude's own choice, and a session's record (Claude's notes of 18 Nov, line 118), not your typed words.
- **Your nearest words:** "An earlier version of my development process tool used github for process communication and bookkeep, which bloated the repo and added 1,000's of files that are useless but can't be deleted cleanly." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 132. Standing notes say what ends them
- **Where:** Part 4, section 4, third point; also section 7, fourth point.
- **The design says:** "Every kind of standing note in the shared state says what ends it, and the tool removes the note when that comes true. **From a session's record:** the design state, line 132." Section 7: "**Claude decided:** the coordinator's session removes a standing note, by the tool, when what ends it comes true. A held merge reaches ARCH by the standing notes, which the tool reads before every merge, and by a message from the coordinator."
- **In practice:** An instruction of yours that holds for a while (such as "hold this merge") is cleared automatically when its purpose is done.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 132), not your typed words; who removes it is Claude's own choice.
- **Your nearest words:** "fix process3 to anticipate and address these kinds of situations." (your words, quoted in the Foundations, `foundations_tranche_9nov.md`, line 68)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 133. The records of the shared state, and their writers
- **Where:** Part 4, section 4, "**Claude decided** the rest of this section", first point and table.
- **The design says:** "The shared state is a small fixed set of records, each rewritten in place. Each record has one writer. It is read and written only through the tool, and writing it needs no merge." The table names eight records: Roles, Lanes, Wakes, Stop, Standing notes, Round, Waiting work, and a Handover for each long-lived role, each with one writer.
- **In practice:** Eight small records hold what every role must know, each kept by one session only.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 134. The shared state kept as comments on one GitHub issue
- **Where:** Part 4, section 4, points after the table.
- **The design says:** "Sessions name roles, not session addresses, so that a replaced role can be obeyed." "What carries the records on GitHub: one issue in the product's repository, found by its label, with each record one comment rewritten in place." "GitHub keeps no guard against two writes to one comment at the same moment: one is lost, silently. So every record has exactly one writing session. A job writes none. ..." "On a failed write the tool obeys GitHub's rate-limit response and tries again up to four times. If the write still fails, that is a process fault. ..." "Each record is kept under the single-text maximum, as a rule."
- **In practice:** The records live as a handful of notes on one discussion page in the product's GitHub project, rewritten in place rather than added to.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I think that Codex needs to be careful about using github as a communications channel." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them: it uses GitHub, but adds no files.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 135. Refreshing a role at a pause or at the fill level
- **Where:** Part 4, section 5, first and second points.
- **The design says:** "Each long-lived role is refreshed on purpose, at a natural pause in its work or at the stated fill level (part 5), whichever comes first. It asks its parent. Its successor starts only from the shared state and the repository." "ARCH is long-lived. **From a session's record:** the design state, lines 80 and 81, for these two lines."
- **In practice:** A role's session is swapped for a fresh one at a quiet moment or when its memory reaches the set level, and the new one works only from the written records.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, lines 80 and 81. Not your typed words.
- **Your nearest words:** "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." (`bob_words_17nov_compaction_avoidance.md`)
- **Against your words:** Agrees, and adds the natural pause.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 136. Handover first; who replaces whom
- **Where:** Part 4, section 5, third to fifth points.
- **The design says:** "**Claude decided:** before it asks, the role rewrites its handover record." "**Claude decided:** ROOT replaces the watcher, and ROOT itself is refreshed by the watcher (section 6)." "**Claude decided:** a job that fills up or dies is replaced by ARCH with a new session that continues from the same branch and pull request."
- **In practice:** Before a session is swapped it writes what its successor needs; each session has a set replacer.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "strict limits on the size of handoff documents" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 137. Finished sessions are archived, not deleted
- **Where:** Part 4, section 5, sixth point.
- **The design says:** "A finished session is archived, not deleted (**from a session's record:** the design state, line 119; his words on it are a question, `bob_words_16_17nov_codex_development.md`). **Claude decided:** the session that started a session archives it; where the starter is gone, ROOT does."
- **In practice:** Finished sessions are put away where they can still be found and reopened.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 119), not your typed words; who archives is Claude's own choice.
- **Your nearest words:** "Under Claude, sessions that are no longer active are archived so that they don't clog up the session list. There's no downside to archiving sessions because they can be found, reviewed, and even unarchived." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 138. Most sessions are short-lived; a role lasts
- **Where:** Part 4, section 5, seventh point.
- **The design says:** "Sessions other than ROOT and the watcher are relatively short-lived (the design state, line 127). **Reading:** a role such as ARCH lasts, while its sessions are refreshed often."
- **In practice:** ARCH or a lane is the same role throughout, but the session holding it is replaced often.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 127), not your typed words, and a reading by Claude.
- **Your nearest words:** "Just to name it - all of these sessions may need to stay active beyond the completion of their initial scope of work. So these are truly and fully interactive sessions." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Differs in part from your words.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 139. After a full stop, one way back; an account switch
- **Where:** Part 4, section 7, first and last points.
- **The design says:** "After any full stop there is one way back: the owner starts ROOT, and ROOT rebuilds everything from the shared state and the repository. **From a session's record:** the design state, line 84." "A switch of account adds only the owner's own acts in the new account (the design state, line 84)."
- **In practice:** After everything halts, you start ROOT and it rebuilds from the records; moving to another account needs only your own steps there.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 84. Not your typed words.
- **Your nearest words:** "So I wonder if there's a way to anticipate or test for issues related to account switching now so that we're ready when the time comes." (your words of 6 Nov, quoted in the Foundations, `foundations_tranche_9nov.md`, line 70)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 140. Changing your approvals means restarting ROOT
- **Where:** Part 4, section 7, second point; also part 6, section 2, third point.
- **The design says:** "**Claude decided:** an edit to the owner's approvals goes with a restart of ROOT by this way. What it does to a running round: the owner first tells the coordinator to stop, and open jobs push and stop; he commits the edit and starts ROOT; ROOT starts the standing roles afresh; ARCH starts a new session for each module with an open pull request, continuing from its branch." Part 6: "**Claude decided:** an edit therefore goes with a restart of ROOT (part 4, section 7), and no session compares the approvals it loaded with the newest."
- **In practice:** When you change your approvals you halt work, make the change, and start ROOT again, because sessions only read approvals when they start.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 141. A restarted ROOT archives the old sessions first
- **Where:** Part 4, section 7, third point.
- **The design says:** "**Claude decided:** a restarted ROOT first archives every session still named in the roles and lanes records, and every open job's session, and then starts the roles afresh."
- **In practice:** On a restart, old sessions are put away before new ones start, so two never hold one role.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 142. What a message carries, and where its content is saved
- **Where:** Part 4, section 8, second and fourth points.
- **The design says:** "**From a session's record:** the design state, line 128, for the rest of this section. Whatever the receiver needs is saved before the message is sent. **Claude decided:** it is saved in the sender's pull request, in the repository, in a record of the shared state, or for a walk in that walk's own issue; the message itself is not stored." "Where a harness has not been shown to wake a session at once, that is noted as a shortcoming (part 8)."
- **In practice:** A message is only a nudge; what it is about is written down first, so nothing is lost if a session is replaced.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 128), not your typed words; where things are saved is Claude's own choice. (The instruction-or-information rule is under part 1 above.)
- **Your nearest words:** "Confirm that the communications between sessions will be reactive - meaning a message sent to a session immediately wakes up that session to handle the incoming message." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 143. A job that keeps failing its tests
- **Where:** Part 4, section 10, first point.
- **The design says:** "**Claude decided:** the tool counts the failed runs on a job's pull request from GitHub's own record. After two failed corrections (the third failed run on the pull request) it tells ARCH, which replaces the session with a fresh one. The fresh session first works out why the corrections were made, so as to foresee the others. If the replacement also fails twice (the fifth failed run), the module is recorded as blocked with the reason, its slot is freed, and the matter goes to ARCH as a design question."
- **In practice:** After three failed test runs a fresh session takes over; after five, the part is set aside as a design question for ARCH.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 144. Ends to loops that would not end
- **Where:** Part 4, section 10, second point.
- **The design says:** "**A loop that would not end. Claude decided** each end. A walk flaw that two modules' jobs have each handed back as needing no change there is not placed a third time; ARCH decides it as a design question. A job blocked twice by the same other module is the same ... A design that ARCH has sent back to a lane twice comes to the owner as a question, with both views. ... In each case other work goes on."
- **In practice:** Work that keeps bouncing between sessions is stopped after two bounces and decided by ARCH, or by you for a lane's design.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 145. A session that dies or stops is found by ROOT's hourly wake
- **Where:** Part 4, section 10, third point; also section 11, "A stopped session".
- **The design says:** "**A session dies or stops. Claude decided:** ROOT's hourly wake finds it, and it is woken or replaced as section 5 says." Section 11: "**A stopped session** is first woken by a message from ROOT. If it has not answered by ROOT's next wake, ROOT replaces it, or asks ARCH to where ARCH started it."
- **In practice:** A session that has stopped is found within the hour, nudged, and replaced if it does not answer.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Why have you stopped? (That's a real question.)" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 146. A stop nothing called for, and reporting every one during the trial
- **Where:** Part 4, section 10, fourth point.
- **The design says:** "**A stop nothing called for** (**from a session's record:** the design state, line 126) is a process fault. Some need no change to Process4, for example a stop caused by a compaction; then the stopped session is woken or replaced. Each such case may be studied and reported to PROCESS. **Reading:** while Process4 is on trial every such stop is reported to PROCESS; the simpler handling applies once it is beyond trial."
- **In practice:** A session that stops for no reason counts as a fault in the process; during the trial each one is reported to PROCESS.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 126), not your typed words, and a reading by Claude.
- **Your nearest words:** "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees in aim.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 147. A stop on your word
- **Where:** Part 4, section 10, last point.
- **The design says:** "**A stop on the owner's word. Claude decided:** he tells the coordinator, which writes the stop record and tells ARCH, which interrupts each job. It is lifted the same way ... A stop takes effect in the turn in which a session receives it (the design state, line 134). ROOT reads the stop record at every wake, so that the hourly wake does not undo it."
- **In practice:** You tell the coordinator to stop, and the building sessions are halted; you lift it the same way.
- **Where it came from:** Claude's own choice, with one line from Claude's notes of 18 Nov, line 134.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 148. Where the starting texts and this design are kept
- **Where:** Part 4, section 11, "Starting texts". The whole of section 11 is marked "**Claude decided** all of these."
- **The design says:** "**Starting texts** are kept in the process's repository beside the tool, one for each role, at the product's fixed version. PROCESS writes and changes them, as a process change. The tool fills in a job's and a walking session's. This design is kept there too, in a folder of its own beside the build texts, and a session reads it from its read-only copy."
- **In practice:** Each role's short starting text belongs to the process and is changed only through PROCESS.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 149. Who directs whom
- **Where:** Part 4, section 11, "Who directs whom".
- **The design says:** "The session that started a session directs it. The owner directs every session he speaks to. The coordinator's message carrying the owner's marked words is an instruction to ARCH."
- **In practice:** A session takes orders from its starter and from you.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 150. How ROOT starts
- **Where:** Part 4, section 11, "ROOT's start".
- **The design says:** "The owner's plain prompt tells ROOT to fetch the process's copy and read ROOT's starting text. ROOT then reads the roles record. If it names sessions, this is a restart, and ROOT archives them first (section 7). ROOT makes its own scheduled wake; the watcher makes its own."
- **In practice:** Your short starting message points ROOT at its instructions; ROOT works out for itself whether this is a first start or a restart.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 151. Changes that are not a job's: who opens and merges them
- **Where:** Part 4, section 11, "Pull requests that are not a job's".
- **The design says:** "The role that writes one opens it and merges it by the tool: a lane for its own folder; ARCH for requirement text, the module list and its decision record; the coordinator for the owner's decision record; PROCESS in the process's repository, on the owner's word. Each recorded decision is one pull request."
- **In practice:** Each role adds its own documents to the project itself.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 152. How a job's change is set up
- **Where:** Part 4, section 11, "For a job".
- **The design says:** "ARCH's session makes the branch and opens the pull request before it starts the job's session, and writes there, once, the job's kind, the work placed and the uses its notice carries. The job writes its own record (blocked; nothing needs changing) as a separate comment, so each has one writer. A job may run its module's tests on its own machine while it works; nothing requires it and nothing reads the result."
- **In practice:** ARCH sets up each building session's workspace and task before starting it.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
