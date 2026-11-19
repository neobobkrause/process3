# Part 4. Roles and sessions

Length: 158 lines. Last section: "11. Smaller rules a session needs".

## 1. The roles, and the sessions that hold no standing role

- **ROOT** is the first session. The owner starts it with a plain prompt on the product's repository. It starts the watcher, ARCH and the coordinator, and starts PROCESS when asked. Once an hour a scheduled wake rouses it as a safety net, to wake or replace a session that has stopped. It decides nothing about the product and builds nothing.
- **The watcher** is a standby session that takes over if ROOT dies. ROOT starts it (section 6).
- **The coordinator** is the owner's front door for the product. It passes on his marked decisions and instructions exactly as typed and dated, and keeps the product's record of them. It answers his questions in words, never by building anything. It tells him what ARCH decided, one plain line each, puts to him the questions that are his, and gives him the account after each round. On his word it holds or approves one merge, puts a module first, changes the slot number, or stops work. It decides nothing about the product.
- **ARCH** is the architecture session, one for each product. It decides every technical matter of the product, writes each decision in the product's decision record, and settles a design before anything is built on it. It writes requirement text, keeps the module list, proposes each tranche, names each walk's areas, turns each flaw into work for a named module, makes the development deployment, prepares a release, starts the product's lanes, and writes the tranche report. It never edits the owner's approvals, changes the process, or publishes a release without him.
- **A lane** is a standing design responsibility for one area of a product (section 3).
- **PROCESS** is where the process is changed, and the only place (part 6).
- **A job** is a session started to do one module's work (part 2).
- **A walking session** is started by ARCH for a walk (part 3) and uses a job slot (part 2, section 5).
- **A worker** is a helper that a long-lived role or a job starts inside itself (part 1, section 6).

What the tool does and what ARCH keeps: whatever has one right answer is done by the tool: who takes a free slot, when a notice is sent and to whom, whether a round's jobs are done. ARCH's session keeps what needs judgment. The share of ARCH's work that is passing things on is measured on the first tranche. **Claude decided:** the tool chooses the next job and writes its starting instructions; ARCH's session makes the start, because only a session can start a session.

## 2. Who starts whom

| Starter | Starts |
|---|---|
| The owner | ROOT |
| ROOT | The watcher, ARCH, the coordinator, PROCESS |
| ARCH | Jobs, walking sessions, the product's lanes |
| PROCESS | Its own lanes (a reading; part 6, section 8) |
| A long-lived role or a job | Its own workers |

- Under a ROOT the owner started, sessions sit at most three levels deep: ROOT; then ARCH, the coordinator, the watcher and PROCESS; then jobs, walking sessions and lanes. A takeover by the watcher adds a level (section 6).
- No session starts its own replacement.
- A session is started with one repository only; from the newest commit of the tranche branch, or for PROCESS of the process repository's main branch; in the harness's unattended mode; and with starting instructions that name every act it may take. PROCESS works in the process's own repository.
- **Claude decided:** ROOT's first act is to fetch the newest copy of its branch, and to stop if it cannot.
- Every session passes the owner's suggestion of model and effort on to each session it starts. His ledger note, as the sixth draft quotes it: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand".
- **Unproven:** that a ROOT started by a plain prompt, whose instructions name no acts, comes up on the owner's newest approvals and can act as ROOT.

## 3. Lanes

The owner's rulings:

- ARCH starts a product's design lanes.
- A lane decides design in its area. ARCH decides whether and when a design is built and whether it can be built as given. A design ARCH cannot build goes back to the lane.
- The owner works with a lane through its design pages.

**Reading:** the rest of this section stands as written; the owner has not confirmed each rule one by one.

- A lane has a folder of design knowledge in the product's repository, which it owns. It reads its area whole. It delivers designs, never product code.
- The owner identifies the need for a lane, and ARCH opens it. The UX lane is always there. A product's other lanes are named in its process config.
- A lane runs as one session at a time. Whether it is kept running or started when a question arrives is ARCH's call, judged by cost, and is measured at the end of the first tranche.
- The first time a lane runs, it uses workers to research the product's founding documents, the existing code and the best practice of its area, and answers no question until that research is recorded in its folder. Every later session of the lane reads it first and adds to it.
- A lane decides design and wording in its area, within the product's principles.
- The owner keeps the product's direction, audiences and principles. A lane decision that would change one comes to him with options and the lane's recommendation.
- Questions from the work reach a lane only through ARCH, which passes each on with enough context to decide. A job never talks to a lane, and lanes never talk to each other.
- The UX lane owns the Screens document and the journeys.
- A lane ends when the owner or ARCH says its area needs no further design. Its folder and research stay.

**Claude decided:** a lane session uses no job slot. A fresh lane session begins by reading the lane's research and the links to its design pages. One session for each lane is held by the lanes record. The record is written before the session is started, and the tool refuses to write a second while the first is recorded as live.

**Reading:** the questions ARCH puts to a lane, and its answers, are not kept as a running record. What a lane decides is written into its folder as design.

## 4. The shared state

- **Claude decided:** what belongs to one job stays in that job's pull request, and what every role needs is in the shared state.
- What sessions say to each other, and the process's running records, never build up as files or commits in a repository.
- Every kind of standing note in the shared state says what ends it, and the tool removes the note when that comes true.

**Claude decided** the rest of this section.

- The shared state is a small fixed set of records, each rewritten in place. Each record has one writer. It is read and written only through the tool, and writing it needs no merge.

| Record | Holds | Writer |
|---|---|---|
| Roles | Which session holds ROOT, the watcher, ARCH, the coordinator and PROCESS | The holder of ROOT. At a takeover the watcher writes it, and by that write becomes ROOT |
| Lanes | Which session holds each of the product's lanes | ARCH. PROCESS keeps a like record of its own lanes in the process's repository |
| Wakes | The time ROOT last woke | ROOT |
| Stop | A stop on the owner's word, naming the account | The coordinator |
| Standing notes | The owner's instructions now in force for running work: a held merge, a module put first, the slot number | The coordinator |
| Round | The tranche, the round, the areas named, the modules with work, and which are finished or blocked and why | ARCH's session, by the tool |
| Waiting work | Notices, walk flaws and flaws reported by jobs, placed against modules with no open job | ARCH's session, by the tool |
| Handover, one for each long-lived role | What that role's successor needs to carry on | The holder of the role |

- Sessions name roles, not session addresses, so that a replaced role can be obeyed.
- The owner's decisions are not kept here. They are in the record of decisions (part 5).
- What carries the records on GitHub: one issue in the product's repository, found by its label, with each record one comment rewritten in place. Each comment's first line is a hidden mark naming its record. One listing call reads them all; one call rewrites a record.
- GitHub keeps no guard against two writes to one comment at the same moment: one is lost, silently. So every record has exactly one writing session. A job writes none. It records that it is blocked, or that a notice needs no change, in its own pull request, and sends ARCH its one message; the tool in ARCH's session then rewrites the round and waiting-work records. Which modules are finished is worked out afresh each time from GitHub's own record of pull requests: merged, or closed with the job's record that nothing needed changing.
- On a failed write the tool obeys GitHub's rate-limit response and tries again up to four times. If the write still fails, that is a process fault. It keeps no list of writes to make later.
- Each record is kept under the single-text maximum, as a rule.
- The grounds and the alternatives set aside are in `process4/working/design_work_18nov/shared_state_carrier.md`.
- **Unproven:** all of it. The shared state is not built. Not verified from GitHub's own pages: the size a comment can hold, that rewriting a comment notifies no one, and any limit on how often one comment can be rewritten.

## 5. Refresh and replacement

- Each long-lived role is refreshed on purpose, at a natural pause in its work or at the stated fill level (part 5), whichever comes first. It asks its parent. Its successor starts only from the shared state and the repository.
- ARCH is long-lived.
- **Claude decided:** before it asks, the role rewrites its handover record.
- The parent of ARCH, the coordinator and PROCESS is ROOT. The parent of a product's lane is ARCH. **Claude decided:** ROOT replaces the watcher, and ROOT itself is refreshed by the watcher (section 6).
- A job that fills up or dies is replaced by ARCH with a new session that continues from the same branch and pull request.
- A finished session is archived, not deleted. **Claude decided:** the session that started a session archives it; where the starter is gone, ROOT does.
- Sessions other than ROOT and the watcher are relatively short-lived. **Reading:** a role such as ARCH lasts, while its sessions are refreshed often.
- **Unproven:** replacing ARCH while jobs are open.

## 6. ROOT and the watcher

**Claude decided** this design. **Unproven:** all of it; it is rehearsed in the trial.

- ROOT starts the watcher as its first act after fetching. The watcher has no other duty.
- The watcher has its own scheduled wake. At each wake it reads the time ROOT last woke.
- The watcher wakes hourly, half an hour after ROOT. If ROOT has missed two wakes, the watcher takes over. It writes itself into the roles record as ROOT, takes over ROOT's scheduled wake, starts a new watcher, tells the coordinator, and archives the old ROOT session if it still exists.
- ARCH, the coordinator and PROCESS go on as they were. They name ROOT by role.
- A planned refresh of ROOT is the same takeover, asked for: ROOT rewrites its handover record and asks the watcher to take over.
- Each takeover leaves the new ROOT one level deeper than the one before, because the watcher was started by the ROOT it replaces. When the harness's limit on depth is two levels away, ROOT puts it on the owner's standing page, and the owner starts a fresh ROOT at a pause.

## 7. The one way back

- After any full stop there is one way back: the owner starts ROOT, and ROOT rebuilds everything from the shared state and the repository.
- **Claude decided:** an edit to the owner's approvals goes with a restart of ROOT by this way. What it does to a running round: the owner first tells the coordinator to stop, and open jobs push and stop; he commits the edit and starts ROOT; ROOT starts the standing roles afresh; ARCH starts a new session for each module with an open pull request, continuing from its branch. The round goes on from the round record.
- **Claude decided:** a restarted ROOT first archives every session still named in the roles and lanes records, and every open job's session, and then starts the roles afresh.
- **Claude decided:** the coordinator's session removes a standing note, by the tool, when what ends it comes true. A held merge reaches ARCH by the standing notes, which the tool reads before every merge, and by a message from the coordinator.
- A switch of account adds only the owner's own acts in the new account. **Unproven:** an account switch that loses no work.

## 8. Messages

- A message wakes its receiver at once.
- Whatever the receiver needs is saved before the message is sent. **Claude decided:** it is saved in the sender's pull request, in the repository, in a record of the shared state, or for a walk in that walk's own issue; the message itself is not stored.
- A message from the directing session is an instruction; a message from any other session is information.
- Where a harness has not been shown to wake a session at once, that is noted as a shortcoming (part 8).

## 9. What the owner can see

- He can see each open job's progress and status without speaking to it.
- A product's ROOT, ARCH, coordinator, lanes and jobs are grouped under that product. Workers are left out.

## 10. When something goes wrong

- **A job fails its tests.** The job fixes its module and the tests run again. **Claude decided:** the tool counts the failed runs on a job's pull request from GitHub's own record. After two failed corrections (the third failed run on the pull request) it tells ARCH, which replaces the session with a fresh one. The fresh session first works out why the corrections were made, so as to foresee the others. If the replacement also fails twice (the fifth failed run), the module is recorded as blocked with the reason, its slot is freed, and the matter goes to ARCH as a design question.
- **A loop that would not end. Claude decided** each end. A walk flaw that two modules' jobs have each handed back as needing no change there is not placed a third time; ARCH decides it as a design question. A job blocked twice by the same other module is the same: the boundary between the two is an architecture bug (part 2, section 8). A design that ARCH has sent back to a lane twice comes to the owner as a question, with both views. A chain of notices ends of itself, because a module is used only by modules after it. A tranche's rounds end on the owner's word (part 3, section 5), and takeovers by the watcher at the limit on depth (section 6). In each case other work goes on.
- **A session dies or stops.** ROOT's hourly wake finds it, and it is woken or replaced as section 5 says.
- **A stop nothing called for** is a process fault. Some need no change to Process4, for example a stop caused by a compaction; then the stopped session is woken or replaced. Each such case may be studied and reported to PROCESS. **Reading:** while Process4 is on trial every such stop is reported to PROCESS; the simpler handling applies once it is beyond trial.
- **The process itself has a fault.** No session building a product fixes it or works round it (part 6, section 6).
- **The process is completely blocked.** The owner gets one plain message with a numbered list of what is his to do.
- **A stop on the owner's word.** He tells the coordinator, which writes the stop record and tells ARCH, which interrupts each job. **Claude decided:** it is lifted the same way: he tells the coordinator, which clears the record and tells ARCH, which wakes or replaces each job from its pull request. A stop takes effect in the turn in which a session receives it. ROOT reads the stop record at every wake, so that the hourly wake does not undo it.

## 11. Smaller rules a session needs

**Claude decided** all of these. Each answers something a starting text needed and the design did not say.

- **Starting texts** are kept in the process's repository beside the tool, one for each role, at the product's fixed version. PROCESS writes and changes them, as a process change. The tool fills in a job's and a walking session's. This design is kept there too, in a folder of its own beside the build texts, and a session reads it from its read-only copy.
- **Who directs whom.** The session that started a session directs it. The owner directs every session he speaks to. The coordinator's message carrying the owner's marked words is an instruction to ARCH.
- **ROOT's start.** The owner's plain prompt tells ROOT to fetch the process's copy and read ROOT's starting text. ROOT then reads the roles record. If it names sessions, this is a restart, and ROOT archives them first (section 7). ROOT makes its own scheduled wake; the watcher makes its own.
- **A stopped session** is first woken by a message from ROOT. If it has not answered by ROOT's next wake, ROOT replaces it, or asks ARCH to where ARCH started it.
- **Pull requests that are not a job's.** The role that writes one opens it and merges it by the tool: a lane for its own folder; ARCH for requirement text, the module list and its decision record; the coordinator for the owner's decision record; PROCESS in the process's repository, on the owner's word. Each recorded decision is one pull request.
- **For a job,** ARCH's session makes the branch and opens the pull request before it starts the job's session, and writes there, once, the job's kind, the work placed and the uses its notice carries. The job writes its own record (blocked; nothing needs changing) as a separate comment, so each has one writer. A job may run its module's tests on its own machine while it works; nothing requires it and nothing reads the result.
- **A job that reaches the fill level** pushes, tells ARCH in one message, and stops. ARCH replaces it from the same branch. A walking session that reaches it writes its last lines in the walk's issue, tells ARCH, and stops; ARCH gives the areas not yet walked to a fresh session. A walking session starts no workers.
- **A natural pause** is a moment between two pieces of work, with nothing half done and everything saved.
- **What ARCH learns from the coordinator** (a held or approved merge, a module put first, a new slot number, a request for a full external walk) comes by the standing notes and a message.
- **The one message when the process is completely blocked** is sent by the coordinator, or by ROOT where the coordinator is what has stopped.
- **The tool is first built** by a session on the owner's word, before anything is in force. That session holds the process's repository alone. Until the tool exists it pushes to its own working branch and opens its pull requests by the harness's ordinary means, as the owner's present approvals allow, and the owner merges each one himself. After the first build only PROCESS changes the tool.
- **"At most ten rules"** counts the numbered rule lines of a starting text, the lines that say what the session never does among them. A line may hold closely related rules. A starting text must name every act its session may take, because a session declines an act its starting text does not name (measured in the process before this one, 6 of 6), and that alone is more than ten single rules for most roles. What keeps a text short is its size limit. The owner left the count to the AI on 19 Nov. The size limit applies to the text as filled in for a session. What is filled in is names and addresses only. A list (the work placed, the uses a notice carries, a walk's areas) stays in the pull request or the round record, which the text names.

