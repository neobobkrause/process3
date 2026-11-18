# Part 4. Roles and sessions

Length: 122 lines. Last section: "10. When something goes wrong".

## 1. The roles

- **ROOT** is the first session. The owner starts it with a plain prompt on the product's repository. It starts the watcher, ARCH and the coordinator, and starts PROCESS when asked. Once an hour a scheduled wake rouses it as a safety net, to wake or replace a session that has stopped. It decides nothing about the product and builds nothing.
- **The watcher** is a standby session that takes over if ROOT dies. ROOT starts it (section 6).
- **The coordinator** is the owner's front door for the product. It passes on his marked decisions and instructions exactly as typed and dated, and keeps the product's record of them. It answers his questions in words, never by building anything. It tells him what ARCH decided, one plain line each, puts to him the questions that are his, and gives him the account after each round. On his word it holds or approves one merge, puts a module first, changes the slot number, or stops work. It decides nothing about the product.
- **ARCH** is the architecture session, one for each product. It decides every technical matter of the product, writes each decision in the product's decision record, and settles a design before anything is built on it. It writes requirement text, keeps the module list, proposes each tranche, names each walk's areas, turns each flaw into work for a named module, makes the development deployment, prepares a release, starts the product's lanes, and writes the tranche report. It never edits the owner's approvals, changes the process, or publishes a release without him.
- **A lane** is a standing design responsibility for one area of a product (section 3).
- **PROCESS** is where the process is changed, and the only place (part 6).
- **A job** is a session started to do one module's work (part 2).
- **A walking session** is started by ARCH for a walk and uses a job slot (part 3).
- **A worker** is a helper a session starts inside itself (part 1, section 6).

What the tool does and what ARCH keeps: whatever has one right answer is done by the tool: who takes a free slot, when a notice is sent and to whom, whether a round's jobs are done. ARCH's session keeps what needs judgment. The share of ARCH's work that is passing things on is measured on the first tranche. **Claude decided:** the tool chooses the next job and writes its starting instructions; ARCH's session makes the start, because only a session can start a session.

## 2. Who starts whom

| Starter | Starts |
|---|---|
| The owner | ROOT |
| ROOT | The watcher, ARCH, the coordinator, PROCESS |
| ARCH | Jobs, walking sessions, the product's lanes |
| Any session | Its own workers |

- Roles sit at most three levels deep: ROOT; then ARCH, the coordinator, the watcher and PROCESS; then jobs, walking sessions and lanes.
- No session starts its own replacement.
- A session is started with one repository only; from the newest commit of the tranche branch; in the harness's unattended mode; and with starting instructions that name every act it may take. PROCESS works in the process's own repository.
- **Claude decided:** ROOT's first act is to fetch the newest copy of its branch, and to stop if it cannot.
- Every session passes the owner's suggestion of model and effort on to each session it starts: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand".
- **Unproven:** that a ROOT started by a plain prompt, whose instructions name no acts, comes up on the owner's newest approvals and can act as ROOT.

## 3. Lanes

**Reading:** the owner has ruled on lanes in part and has not confirmed each rule below one by one.

- A lane has a folder of design knowledge in the product's repository, which it owns. It reads its area whole. It delivers designs, never product code.
- The owner identifies the need for a lane, and ARCH opens and starts it. The UX lane is always there. A product's other lanes are named in its process config.
- A lane runs as one session at a time. Whether it is kept running or started when a question arrives is ARCH's call, judged by cost.
- The first time a lane runs, it uses workers to research the product's founding documents, the existing code and the best practice of its area, and answers no question until that research is recorded in its folder. Every later session of the lane reads it first and adds to it.
- A lane decides design in its area, within the product's principles. ARCH decides whether and when a design is built and whether it can be built as given. A design ARCH cannot build goes back to the lane.
- The owner keeps the product's direction, audiences and principles. A lane decision that would change one comes to him with options and the lane's recommendation.
- Questions from the work reach a lane only through ARCH. A job never talks to a lane, and lanes never talk to each other. The owner works with a lane through its design pages.
- The UX lane owns the Screens document and the journeys.
- A lane ends when the owner or ARCH says its area needs no further design. Its folder and research stay.

**Claude decided:** a lane session uses no job slot; a fresh lane session begins by reading the lane's research and the links to its design pages.

## 4. The shared state

- What belongs to one job stays in that job's pull request. What every role needs is in the shared state.
- What sessions say to each other, and the process's running records, never build up as files or commits in a repository.

**Claude decided** the rest of this section.

- The shared state is a small fixed set of records, each rewritten in place. Each record has one writer. It is read and written only through the tool, and writing it needs no merge.

| Record | Holds | Writer |
|---|---|---|
| Roles | Which session holds each standing role | The starter of that role |
| Wakes | The time ROOT last woke | ROOT |
| Stop | A stop on the owner's word, naming the account | The coordinator |
| Standing notes | The owner's instructions now in force for running work: a held merge, a module put first, the slot number | The coordinator |
| Round | The tranche, the round, the areas named, the modules with work and which are finished | The tool |
| Waiting work | Notices and walk flaws placed against modules with no open job | The tool |
| Handover, one for each long-lived role | What that role's successor needs to carry on | The holder of the role |

- Sessions name roles, not session addresses, so that a replaced role can be obeyed.
- Every kind of standing note says what ends it, and the tool removes the note when that comes true.
- The owner's decisions are not kept here. They are in the record of decisions (part 5).
- **Open (a session, in the trial):** what on GitHub carries the records. First candidate: one issue in the product's repository, each record one comment rewritten in place. It must be shown to take a write without a merge, to hold under GitHub's limits, and to be read in one call.
- **Unproven:** all of it. The shared state is not built.

## 5. Refresh and replacement

- Each long-lived role is refreshed on purpose, at a natural pause in its work or at the stated fill level (part 5), whichever comes first. It asks its parent. Its successor starts only from the shared state and the repository.
- Before it asks, the role rewrites its handover record.
- The parent of ARCH, the coordinator and PROCESS is ROOT. The parent of a lane is ARCH. ROOT replaces the watcher. ROOT itself is refreshed by the watcher (section 6).
- A job that fills up or dies is replaced by ARCH with a new session that continues from the same branch and pull request.
- The session that started a session archives it. A finished session is archived, not deleted.
- Sessions other than ROOT and the watcher are relatively short-lived. **Reading:** a role such as ARCH lasts, while its sessions are refreshed often.
- **Unproven:** replacing ARCH while jobs are open.

## 6. ROOT and the watcher

**Claude decided** this design. **Unproven:** all of it; it is rehearsed in the trial.

- ROOT starts the watcher as its first act after fetching. The watcher has no other duty.
- The watcher has its own scheduled wake. At each wake it reads the time ROOT last woke.
- If ROOT has missed two wakes, the watcher takes over. It writes itself into the roles record as ROOT, takes over ROOT's scheduled wake, starts a new watcher, tells the coordinator, and archives the old ROOT session if it still exists.
- ARCH, the coordinator and PROCESS go on as they were. They name ROOT by role.
- A planned refresh of ROOT is the same takeover, asked for: ROOT rewrites its handover record and asks the watcher to take over.
- Each takeover leaves the new ROOT one level deeper than the one before, because the watcher was started by the ROOT it replaces. When the harness's limit on depth is near, ROOT puts it on the owner's standing page, and the owner starts a fresh ROOT at a pause.

## 7. The one way back

- After any full stop there is one way back: the owner starts ROOT, and ROOT rebuilds everything from the shared state and the repository.
- An edit to the owner's approvals goes with a restart of ROOT by this way. **Claude decided** what it does to a running round: the owner first tells the coordinator to stop, and open jobs push and stop; he commits the edit and starts ROOT; ROOT starts the standing roles afresh; ARCH starts a new session for each module with an open pull request, continuing from its branch. The round goes on from the round record.
- A switch of account adds only the owner's own acts in the new account. **Unproven:** an account switch that loses no work.

## 8. Messages

- A message wakes its receiver at once.
- Whatever the receiver needs is saved before the message is sent: in the sender's pull request, in the repository, or in a record of the shared state. The message itself is not stored.
- A message from the directing session is an instruction; a message from any other session is information.
- Where a harness has not been shown to wake a session at once, that is noted as a shortcoming (part 8).

## 9. What the owner can see

- He can see each open job's progress and status without speaking to it.
- A product's ROOT, ARCH, coordinator, lanes and jobs are grouped under that product. Workers are left out.

## 10. When something goes wrong

- **A job fails its tests.** The job fixes its module and the tests run again. **Claude decided:** the tool counts the failed runs on a job's pull request from GitHub's own record. After two failed corrections it tells ARCH, which replaces the session with a fresh one. The fresh session first works out why the corrections were made, so as to foresee the others. If the replacement also fails twice, the module is recorded as blocked with the reason, its slot is freed, and the matter goes to ARCH as a design question.
- **A session dies or stops.** ROOT's hourly wake finds it, and it is woken or replaced as section 5 says.
- **A stop nothing called for** is a process fault. Some need no change to Process4, for example a stop caused by a compaction; then the stopped session is woken or replaced. **Reading:** while Process4 is on trial every such stop is reported to PROCESS; once it is in force only those that may need a change are.
- **The process itself has a fault.** No session building a product fixes it or works round it (part 6, section 6).
- **The process is completely blocked.** The owner gets one plain message with a numbered list of what is his to do.
- **A stop on the owner's word.** He tells the coordinator, which writes the stop record and tells ARCH, which interrupts each job. A stop takes effect in the turn in which a session receives it. ROOT reads the stop record at every wake, so that the hourly wake does not undo it.
