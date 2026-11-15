# Process4: definition, sixth draft

15 Nov 2026. For Bob, the owner. Written by Claude.

**How to read this.** Plain words, no reference codes. Nothing here is in force. Section B lists your decisions: the words you typed on 14 and 15 Nov, then the session's record of 13 and 14 Nov. Section N says what is not yet settled, section O what is not proven, and section P what is still open with you. Four words are kept apart. *Measured*: counted in Process3's record or on today's code. *Estimated*: worked out from measured figures. *Judged*: an opinion, Claude's or an AI worker's. *Unproven*: never run.

**Whose decision each thing is.** A thing is called yours only if it is in section B (the record is cited as "line 6" and so on), is an answer stored in your ledger, or is quoted from you with its source. Your typed words outrank the session's record wherever they differ. "Claude decided" marks a technical matter you did not define, or one you left to Claude on 14 or 15 Nov; you can overrule any. Where a matter was a proposal in the fourth draft, this draft gives the proposal in one sentence and then your answer exactly as you typed it.

**What changed since the fifth draft.** Section B now also holds your fifth and sixth messages of 14 Nov, the messages you typed to the session that studied the notification, and your two messages of 15 Nov, each exactly as typed. Four of your short answers that the fifth draft wrote out as longer statements are now quoted exactly, with Claude's reading marked as Claude's. Section F, on the notification, is rewritten from your words to that session and of 15 Nov; your rule for how module tests are written is in section E. Lanes are filled in from your documents in section C, as a proposal waiting for your answers; the fifth draft's "ARCH defines lanes" was Claude's error and is corrected. Claude has withdrawn the request that you make the tranche branch the default branch, and has corrected what the fifth draft said about ROOT's start on 5 Nov (section I). The sentence "Only your word ends a tranche that will not come clean" was Claude's, unmarked, and is gone: that case is undefined and is yours to decide. The statement about where the screens and journeys are is corrected; the fifth draft's "Checked by Claude" there was not true. Section C again names the session that deploys, prepares a release and moves a product to a changed process, as your Foundations do. Section I says how the process reaches a session, as lines you kept in your ledger say. The fifth draft was wrong to say the set-up check ended on your instruction of 9 Nov. The 33 lines of yours that the fifth draft ended without asking you are now "proposed for ending", not ended, and are put to you as seven proposals in section P. Section P now lists every question open with you. A few smaller errors of fact and of whose words are whose are corrected where they stood.

## A. What Process4 is for

Process4 is the way AI sessions build a software product for you in a GitHub repository, and can do so with nobody watching. Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. Following your words of 14 Nov, a tranche reaches the main branch only after the three tests: its modules' tests, an internal walk, and an external walk of a development deployment. No walk of either kind finished without flaws in Process3 (measured), so that ending is unproven (section D). You define the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells you in plain words what it decided.

**Words used here**

- **Session:** one running AI conversation in Claude Code's cloud.
- **Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging.
- **Module:** one part of the product, with its own code files, tests and requirements file. The product is one ordered list of modules, and a module may use only modules before it. A module that uses another is that module's user; the one used is the provider. Today's list of 220 does not fully fit this: seven modules with work hold no code, four are new and have no files, and about 50 code files belong to no module (measured). ARCH edits the list until it fits.
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run. Eight by default, counted across the account.
- **Tranche:** one batch of product work, built on the tranche branch, apart from the main branch, and reaching the main branch only as a whole.
- **Round:** one pass within a tranche: jobs, then the internal walk, then, if that finds no flaws, a deployment and the external walk.
- **Internal walk:** in your words, it "uses the UX Screens document to confirm that the workflow matches the definition". It is made on the product as built, without deploying it.
- **External walk:** in your words, it "follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results". It is made on a development deployment: the product put on a development site in its own Cloudflare account, reaching no one else.
- **Mechanical edit:** one change that touches many modules in the same trivial way and needs no judgment. Your example: "a word table change".

## B. Your decisions

### Your own typed words of 14 Nov: the second message

Exactly as typed. The working rules of your first message are quoted where used.

- On the trial repository: "The throwaway repo that you need already exists: process3-probes."
- On the tranche: "A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche. But if flaws are found during an external walk those flaws are added to the next round, not the next tranche. So a tranche only ends when an external walk (of a development deployment) completes without flaws. A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully."
- On tests: "Yes, a job writes its own tests. That's an important responsibility. It's also a challenge because tests must be complete yet fast and efficient."
- On the walks: your two sentences defining the internal walk and the external walk, quoted in section A.
- On Process3: "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish."
- On changing the process: the paragraph that begins "Lets be clear about how the process is changed (and how it's not changed)", quoted in full in section H.
- "You can create a subtree in the process3 repo for the container being used to update to process4."

### Your own typed words of 14 Nov: the third and fourth messages, on the fourth draft

Exactly as typed.

- On the three tests: the passage that begins "Process4 does have 3 tests", quoted in full at the head of section E. *This corrects* line 5 of the record, which listed the notification as the second test and the internal walk alone as the third.
- On more tests: the passage that ends "There is no need to any any more tests. PERIOD!", quoted in full at the head of section E. *This settles* the fourth draft's passage on the line between correcting the process and adding to it, which is removed. It agrees with line 20.
- A question to Claude: "Explain why using the current criteria 5 of the 241 changes that AI workers judged real would have been missed. What was different in those 5 modules?" The fifth draft answered it as far as the record went. Section F is now rewritten from your later words, and that answer is no longer carried in this draft.
- On telling users of every change: the paragraph that begins "If every user is told when the implementation of a module changes but the interface doesn't", quoted in section F. *This sets aside* the fourth draft's proposals 1 and 3. Lines 3, 10 and 11 stand as recorded. How users are told is now set by your later words to the study session and of 15 Nov (section F). What a told job does (line 10) is still open (section F). Line 11 stands as recorded beside your words of 15 Nov that there is "no means to reliably tell the difference" (section F).
- On the repository: the two sentences that begin "The process3 repo is public", quoted in full in section M. *This settles* where the Process4 work is kept.
- On the fourth draft's list of things not yet settled: "Many of the questions asked in section M of v4 are technical and highly detailed. You're better qualified than I am to answer many of these questions." You added eight hints, one of them a question. Each is quoted where it is used (sections D, E, H, I and J), and the rest are marked "Claude decided".

- Your fourth message, complete: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo". *This settles* where the two documents the walks use are kept (section D).

Your answers to the fourth draft's thirteen proposals:

| Proposal in the fourth draft | Your answer, exactly | What it settles |
| --- | --- | --- |
| 1. When the notice is sent | "We need to study this further" | Not approved. Since settled by your words to the study session and of 15 Nov (section F) |
| 2. Another module's tests run when a job's edit strays into it | "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." | Proposal removed. Agrees with lines 14 and 19 |
| 3. What a notified job does | "needs to be studied further." | Not approved. Line 10 stands; still open, not yet studied (section F) |
| 4. The two walks counted as one test | "internal and external walks a separate tests." | Two tests. Corrects lines 5 and 6 |
| 5. Tests for the process's own tool | "agreed" | Settled (section E) |
| 6. Who takes a free slot | "agreed" | Settled: how lines 3 and 8 are read together (section D) |
| 7. No watcher beside ROOT | "are you certain that the watcher isn't needed?" | Claude is not certain. Proposal withdrawn; the note in your ledger stands (section C) |
| 8. Eight slots for each product | "across the account" | Line 9 is counted across the account (section D) |
| 9. A helper never reviews | "agreed" | Settled; ends one use in a ledger line you kept (section C) |
| 10. What "without flaws" means | "agreed" | Settled (section D) |
| 11. The first trial uses made-up modules | "agreed" | Settled (section O) |
| 12. Three acts of yours beyond settings changes | "agreed" | Settled; adds to line 1 (section C) |
| 13. Checks ended because there are three tests | "three tests and no others" | Claude reads your answer as ending the checks listed in section K, whatever your ledger still shows. Say if you meant otherwise |

**Which recorded lines your second message changed,** as the fourth draft set out: your words on the tranche and the walks change lines 5 and 6; your words on changing the process change lines 1 and 2 and put line 20 in your hands (section H).

### Your own typed words of 14 Nov: the fifth and sixth messages

Exactly as typed. In your fifth message the numbers 1 to 3 answer the three readings that the fifth draft put to you in its last section.

| Your words, exactly | What it settles |
| --- | --- |
| "1. A tranche can end without an AI enabled run" | The external walk that ends a tranche may be made with no AI account connected (section D) |
| "2. installer and website are outside the tranche" | Updating the installer and the website is not part of a tranche (section K) |
| "3. installer and site updates wait for a clean development release walk" | The installer and the website are updated only after a clean development release walk. Whether that is the walk that ends the tranche or a further walk is still open with you (section P) |
| "We'll use a different session then. Give me what I need to start it and task it." | A request: the separate session on the notification. It has reported (section F) |
| "Meanwhile, perhaps this is a good time to repeat the full audit of process4 as currently defined, including a counter-argument audit. This will give a clearer look at that shape the design is in and provide a map where the focus is still needed." | A request: the second full audit. It was made, and the corrections in this draft come from it |

Your sixth message, complete:

> We need to start a fresh session. So give me what I need to continue in a fresh session. But before we refresh, let me respond here to your summary of the last audit. You can work through these comments in the next session.
>
> Lanes are an important element of the development process, though they haven't been fill into the process4 design.
>
> Let's begin the next session by going into greater detail on each of the points you make in the 'What most stands in the way' section of your last response.

What it settles: nothing is decided by it. It asked for two things. Lanes are now filled in from your documents, as a proposal (section C). The five points were gone into in detail, and the questions they leave with you are in section P.

### Your own typed words to the session that studied the notification

You typed these to the separate session you set up on one question: when a module changes, which of the modules that use it must be updated. All but the last were typed on 14 Nov; the last arrived on 15 Nov. These are the messages that settle a point, in the order typed, each exactly as typed. Where your words answered a question of that session's, "What it settles" gives the question's substance; those are that session's words, not yours.

| Your words, exactly | What it settles |
| --- | --- |
| "a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes." | A change of content alone tells no one |
| "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed." | What a change to the interface is |
| "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response." | A rule for how every job writes its module tests (section E) |
| "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated." | The means: structured comments read by a build tool |
| "The comments and tool can also inform module tests to ensure that boundaries are properly checked." | Each stated bound gives the job tests to write (section E) |
| "which event sends the notice: B" | The notice is sent when the tool's listing of the interface differs before and after the change, not when a comment's text was edited |
| "the tool may refuse a disagreeing comment" | Inside a job's own module tests, a comment that disagrees with its own module's code stops the merge |
| "Who is told: ideally only the users of the entry that changed." | Who is told |
| "What rule applies to a module that has no comments yet: The first time a job for a module without comments starts the first thing it does is add the structured comments." | How modules come to have comments |
| "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." | That first step sends no notice and gives the "before" listing |
| "The one fixed form for bounds written in words: If those words are changing, then there must be a reason why. It must be that that interface is changing, right?" | A change to the words that state a bound is a change to the interface |
| "I agree with your recommendation" | For what a provider accepts, users are told only when the new interface cannot stand in for the old (something removed, renamed, newly required or newly refused), so accepting more tells no one. For what a provider hands back, any change to an entry tells that entry's users |
| "As recommended." (15 Nov) | Inside a module's own module tests, and on that module only, the tool may also refuse code that disagrees with a provider's stated interface |

### Your own typed words of 15 Nov to this session

Exactly as typed.

First message, complete:

> After much research it seems pretty clear that there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface.

*This settles* that the notice cannot be exact (section F).

Second message, complete. The main session had set out three choices for the notice, given that it cannot be exact: 1, tell every user on every change; 2, use the study's method as a filter, accepting that it sometimes tells too many and sometimes misses one, which a later test or walk then catches; 3, tell nobody. It had recommended 2, and recommended against the proof session's rule that every user's tests run before each provider change merges. Your answer:

> Okay, I'll follow your recommendation: 2
>
> I don't care if the proof session recommends. We are clear about which tests will be run. There will be no additional tests added to the process than the 3 already identified.

*This settles* that the study's method is used as a filter, and that no test of users runs before a provider's change merges (section F).

### The session's record of 13 and 14 Nov

These reached this document through a session's written record, not through text you typed. On 14 Nov you referred to them in your own words as "my decisions of 13-14 Nov". Each line quotes the record exactly. Correct any that is recorded wrongly.

*13 Nov*

1. "You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules."
2. "The process runs unattended. It waits for you only when it is completely blocked, with no further work possible until you act."
3. "A product is a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and earlier modules' jobs run before later ones. When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested."
4. "The build plan is designed around jobs running in parallel, bounded by a number you can change."
5. "Process4 has three tests and no others." They are: "Each job's own module tests, which include a check that the module's declared uses match its imports"; "Notification of every user module when a job changes an interface"; "A multi-session internal walk at the end of each round." (Corrected by your typed words of 14 Nov: see above.)
6. "No other test is necessary, ever. The internal walk replaces the full regression. A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that."
7. "The layer construct is dropped."
8. "A job does not wait for the modules it uses to finish. A module's job is ready when the module has work and no open job, and ready jobs take free slots earliest in the order first."
9. "Job slots default to eight, and you can change the number." "The moment a job completes and merges, its slot goes to the next ready job."
10. "A change to a provider's interface says which parts of the interface changed. A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them."
11. "Recognising that an interface changed must be proved rigorous and correct."
12. "Process3's permission management is preserved." "GitHub rulesets and other settings may be updated for Process4."
13. "A use that points to a later module is an error in the design of those modules, to be fixed by refactoring them."
14. "a job writes only its own module's files. Kept."
15. "CLAUDE.md and settings.json continue to serve the purpose they did in Process3."
16. "the first session is ROOT. You start a session with the process repository mounted. Your first prompt says you are starting or restarting development of a named product, names that product's repository, and says the Process4 development process is to be used. It may suggest the model and effort, and may mention a switch from another account or other pertinent details."
17. "The coordinator session is the front door. Before changing accounts, you tell the coordinator so it can stop development in that account." "the maximum slot count changes when you tell the coordinator session the new value."
18. "you approve a public release. Updating the public release means updating the installer and the page of the website that refers to the current release and installer."
19. "The cross-module mechanical pass is preserved. Some mechanical changes are so trivial that module tests need not be rerun. Tests run only when there is a fully informed reason to run them."

*14 Nov*

20. "a process fix must not add a new test, gate, review or stop. It may only correct or remove what is broken."
21. "fresh-reviewer review is unnecessary and ends."
22. "ROOT and the coordinator are different sessions." "ROOT starts with the product repository, and starts both the ARCH session and the coordinator session."
23. "Merging stays with the process's merge tool, the route Process3 proved, on your instruction to preserve permission management."
24. The ledger line about when a layer closes ends, "because there are no layers any more: your word."

Lines 16 and 22 differ on ROOT's repository. Your typed words of 14 Nov settle it: the product's (quoted in section I).

## C. Who does what

**You, the owner.** You define the project and answer the questions that are yours. Your acts:

| Your act | How often |
| --- | --- |
| Change a permission or rule setting in GitHub or Cloudflare | Very occasionally |
| At PROCESS: choose among the options offered for a process change, and approve a product's move to the changed process | Whenever a change is proposed |
| Start the first session, ROOT | At each start or restart of development; after each edit to your approvals; and if ROOT dies and no watcher takes over |
| Tell the coordinator things | Whenever you choose |
| Approve a public release | Once per public release |
| Connect an AI account to the deployment | Before an external walk of the journeys that use AI |
| Commit your standing approvals to CLAUDE.md, and the deny list to settings.json, on GitHub's website, in the product's repository and in the process's (section I) | At the start, then only when the wording must change |
| Connect Claude to GitHub, and enter the deploy token and other secret values into Claude's cloud environment, from a page the process writes | At the start of a product and at an account switch |

Line 1 allows you the first row. The second is in your own words of 14 Nov. The next three are in the record (lines 16, 17 and 18). The last three were the fourth draft's proposal 12: these three are acts of yours beyond settings changes. You answered "agreed" on 14 Nov.

**ROOT** is the first session. You start it with a plain prompt on the product's repository. Section I says how that start lands on your newest approvals. ROOT starts ARCH and the coordinator (line 22), and starts PROCESS when ARCH asks (section H). Once an hour an alarm wakes it as a safety net, as in Process3, to wake or replace a session that has stopped. ROOT decides nothing about the product and builds nothing.

**The watcher** is a standby session that takes over if ROOT dies. A note in your ledger says: "The watcher is started beside ROOT by whoever starts ROOT." That note was written in by the coordinator, as its record of what you said in chat on 3 Nov; it is not text you typed. The fourth draft proposed to drop it, and you asked: "are you certain that the watcher isn't needed?" No. Claude is not certain. Claude withdraws the proposal, and the watcher stays as your documents have it. Measured: both recorded takeovers in Process3 left no watcher behind and left ROOT one level deeper than designed. What a takeover does in Process4 is unproven and is rehearsed in the trial. Who starts it beside a ROOT that you start is not yet settled (section N).

**The coordinator** is your front door for the product (line 17). ROOT starts it, on the product's repository. A line you kept in your ledger says: "Only explicitly marked words of yours become decisions". So only words you mark as a decision or an instruction are passed on, exactly as written and dated, and followed; no session writes its own summary of your words as yours. A question from you is answered in words, never by building anything. The coordinator tells you what ARCH decided, one plain line each, and puts a question that is yours to you once, with options and a recommendation. Holding or approving one merge, putting a module first and changing the slot number on your word are in your documents and are untried. It decides nothing about the product and brings you no technical question.

**ARCH** is the architecture session, one per product. The record of 14 Nov calls it ARCH; your older ledger notes call it "BOB". ROOT starts it. It starts jobs, merges them, and passes notifications between modules. It edits the module list until every file has one owner module. It has a helper make each mechanical edit. It starts the walking sessions, has the product deployed to the development site, and turns each flaw into work for a named module. It decides every technical matter of the product, writes each decision in the product's decision file, and settles a design before anything is built on it. While a tranche runs it prepares what the next round or tranche needs (your ledger). It writes the tranche report. Your Foundations (written by a session from your ledger) name it for three more steps, and the fifth draft had dropped the name: "deploying, releasing and acting on a live site are BOB's acts, not a job's". So ARCH deploys and prepares a release. The Foundations also have it move a product to a changed process: "the fix lands, BOB moves the pin, and the same job continues", that is, ARCH moves the version of the process that the product names to the version that holds the fix. Under your words of 14 Nov that move is made only with your prior approval, by the means PROCESS proposes. It never edits your approvals, changes the process, or publishes a release without you.

**A job** is a session ARCH starts to do one module's work. It decides how to meet that module's requirements, and it writes that module's tests. In your words of 14 Nov: "Yes, a job writes its own tests. That's an important responsibility." It writes only its own module's files (line 14). In your words of 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." This rule is held by the job's instructions and not by any check. A job never merges, starts a session, deploys or changes the process.

**A worker** is a helper that ARCH or a job starts inside its own session. A line you kept in your ledger gives its uses: "noisy bulk work such as a full test run, a read-only reviewer, and genuinely independent parallel sub-tasks". The fourth draft's proposal 9: no helper is briefed to review another session's work. You answered "agreed" on 14 Nov. So the second of those three uses ends.

**Lanes: proposed, and waiting for your answers in section P.** Lanes are filled in here from your documents: your ledger, your Foundations, your approvals in the product's repository, Process3's record of your words of 5 and 6 Nov, and your typed words of 14 Nov. Each sentence comes from those documents unless marked *Claude decided*. Where your documents disagree with each other, Claude has not chosen for you; those questions are in section P. Nothing here is in force, nothing here is your decision until you say so, and nothing here has run in Process4. The fifth draft said "ARCH defines lanes". That went against your Foundations ("You identify the need for a lane and BOB opens it") and was Claude's error; it is corrected below.

*What a lane is.* A lane is a standing design responsibility for one area of a product. It has a folder of design knowledge in the product's repository, which it owns. It reads its area whole. It delivers designs, never product code. It is the source of truth in its area, and it is qualified for that before it decides anything.

*Which lanes.* You identify the need for a lane, and ARCH opens it. The UX lane is always there. For Civicsmith the lanes are UX, investigation design and publication design. PROCESS is a lane of a different kind; see below.

*One session.* A lane runs as one session at a time. Whether a lane's session is kept running or is started when a question arrives is ARCH's call, judged by cost, and is one of the measurements your Foundations set for the end of the first tranche. That measurement was never taken in Process3. A long-running lane session is replaced by a fresh one under ARCH's management.

*Qualification.* The first time a lane runs, it uses workers to research the product's founding documents, the existing code and the best practice of its area, and it answers no question until that research is recorded. The research is kept in the lane's own area of the product's repository. Every later session of the lane reads it first, draws on it and adds to it.

*What a lane decides.* Within the product's principles a lane decides design and wording in its area. You keep the product's direction, audiences and principles. A decision that would change one of those comes to you with options and the lane's recommendation.

*How questions reach a lane.* Only through ARCH. A job never talks to a lane, and lanes never talk to each other. ARCH recognises a design question, passes it to the lane with enough context to decide, waits for the lane's decision, and keeps the final say. A question that is yours becomes your decision, and a design, before anything is built on it.

*How a lane's work is merged.* A change that touches only files in the lane's own folder merges without a test run. Your reason, as recorded on 5 Nov: the modules that use what the lane produces have already passed their own tests, and design documents do not need testing.

*The UX lane and the walks.* The UX lane owns the folder you named on 14 Nov for screens and journeys. So the UX lane keeps the two documents the walks are measured against: the internal walk uses its Screens document, the external walk follows its journeys.

*PROCESS.* PROCESS is the lane where the process is changed, and the only place it is changed. You interact with it directly. It explains each problem and offers options for you to explore and choose. Several proposals open at once are considered together. ROOT starts it; ARCH can ask ROOT to start it if it is not running; the coordinator can talk to it. A product moves to a changed process only with your prior approval, by the means PROCESS proposes. Section H says more.

*Claude decided* (technical, reported to you):

1. A lane session does not use one of the eight job slots. Your answer "across the account" was about job slots, a lane is not a job, and in Process3 lane sessions took no slot. So beside the eight there can be one session for each lane: three for Civicsmith, and PROCESS.
2. ARCH starts a product's lanes, so a lane sits at the same depth as a job, inside your limit of three levels.
3. One session per lane is held by a record written before the session is started, which refuses a second start while the first is live. Process3 built this and it ran: five lane starts.
4. A fresh lane session begins by reading the lane's research and the recorded links to its design pages. Process3 built the replacing of a lane session; it never once ran, so this is unproven.
5. Every question ARCH puts to a lane, and every answer, is written in the shared record. Process3 built this and it ran: five questions.
6. The report at the end of a tranche lists every change the UX lane made, during that tranche, to the two documents the walks are measured against. This is a line in a report that nothing reads to decide anything. It is not a check.
7. A lane ends when you or ARCH say its area needs no further design; its folder and research stay. Your documents are silent on this.
8. PROCESS follows the lane rules where they fit: one session at a time, its own folder (in the process's repository, not the product's), research recorded before it proposes. It differs in three ways that come from your words of 14 Nov: ROOT starts it, you talk to it directly, and what it changes is the process itself.

**Walking sessions** are started by ARCH for each walk and use the job slots (section D).

**Model and effort.** Every session passes your suggestion on to each session it starts. Your ledger note says: "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand".

**Shared state** (*Claude decided*). What belongs to one job stays in that job's pull request. What every session needs lives in one place on GitHub, in the product's repository, that needs no merge to write and is written only through the process's tool. It holds: which sessions hold the standing roles; the slot number; a stop; your instructions quoted exactly; notifications and walk flaws for modules with no open job; and the time ROOT last woke. Sessions name roles, not session addresses, so that a replaced ARCH can be obeyed. In Process3, ARCH ran as 21 sessions in six and a half days, that is, it was replaced 20 times (measured; the fifth draft said 21 times). Unproven.

**Modules that hold requirements and no code** (*Claude decided*). There are 29 among the 220 (measured), left by the size cap (proposed for ending, section L). ARCH decides which module's code meets each, and the move is made as a mechanical edit.

Sessions are at most three levels deep, and none starts its own replacement.

## D. How work flows

**The life of one module's job**

1. **The module has work.** A requirement in its file is marked "not yet met", or a walk flaw or a notification has been placed against it.
2. **Its job is ready:** the module has work and no job already open. It does not wait for the modules it uses (line 8).
3. **It takes a slot.** Ready jobs take free slots "earliest in the order first" (line 8). Line 3 also says "earlier modules' jobs run before later ones". The fourth draft's proposal 6: read line 3 by line 8, so that a ready job takes a free slot and does not wait for an earlier module that has no work yet. You answered "agreed" on 14 Nov. Only your marked instruction puts a module ahead.
4. **ARCH starts the job session,** with instructions naming every act the job may take.
5. **The job works** in a draft pull request, writing only its own module's files, its tests among them. A flaw it finds in another module goes to ARCH, which passes it to that module's job.
6. **The job completes.** It pushes and marks the pull request ready. Its module's tests run on GitHub's machines. The job fixes its own failures and sends ARCH one message when the tests pass.
7. **ARCH merges it** into the tranche branch with the process's tool, the only way a session can merge (line 23). There is no review and no act of yours.
8. **The slot is refilled** in the same turn (line 9). If the tool's listing of the module's interface differs from the listing before the job's change, the users of each entry that changed are told (section F). The notice is a way of saving work, not a guarantee (your words of 15 Nov, section F).

**The eight slots.** The fourth draft asked whether eight is for each product or across the account. Your answer of 14 Nov: "across the account". With one product nothing changes. How two products running at once share the eight is not yet settled (section N).

**When a module's work is finished** (*Claude decided*). When its job merges, or when its notified job tells ARCH that nothing needs changing.

**A job stopped by another module's flaw** reports the flaw to ARCH, records that it is blocked, pushes and stops. Its slot is freed. When the other module merges, ARCH makes this module's job ready again.

**A change across many modules: the mechanical edit.** In your words of 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." A module where the change needs judgment gets its own job (your documents). You asked: "Can the mechanical edit do a single merge of all affected modules?" Claude's answer: yes. A helper in ARCH's session makes the edit as one change covering every affected module, and it is merged once. *Claude decided* the moment: when no job is open, between a round's last merge and its internal walk. What is unproven is the test run GitHub requires on that one change: either the module tests of every touched module run once there or, for a change that line 19 calls so trivial "that module tests need not be rerun", none run. The one time a session tried to merge without a required run in Process3, on 9 Nov, the permission checker refused (measured). Rehearsed in the trial.

**A round, step by step**

1. **Jobs.** Every module that has work gets its job.
2. **The internal walk.** When every module that had work is finished, ARCH starts sessions that walk the product as built against the UX Screens document. Each flaw becomes work for a named module in the next round.
3. **Deployment and the external walk.** Only when the internal walk finds no flaws is the product deployed to the development site. Walking sessions then follow the UX journeys there. Each flaw becomes work for a named module in the next round, "not the next tranche" (your words).
4. **The tranche ends** only when an external walk completes without flaws.

*Claude decided* the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws.

**Who runs a walk and the deployment.** The fourth draft left open whether sessions or GitHub's machines run them. Your hint of 14 Nov, exactly: "sessions". Claude reads it as: sessions run both the walks and the deployment. Who runs the walks is among the questions open with you (section P). *Claude decided* the rest: a walk happens when no job is open, so walking sessions use the job slots, and the walk is shared out among them by journey, with at most as many walking sessions as there are slots. Unproven: a session can run one thing for about 30 minutes, and Process3's two late deploy-and-walk runs took 60 and 64 minutes (both measured), so a walk must be shared among sessions. That never ran. How many external walkers the Cloudflare account can bear is unproven and is measured in the trial. Process3's decision record quotes you on 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".

**Where the walks' documents are.** Your words of 14 Nov: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo". The fifth draft said "Checked by Claude" that the folder held them. That was written on another session's word, was not checked, and was only partly right. What a worker found on 14 Nov, reading the product's repository: the folder is different on the product's main branch and on the branch Process3 built on. On the main branch it holds a Journeys page and a Screens page among its files. On the building branch a design session removed the Journeys page on 6 Nov, and the folder's own note there says the design documents are claude.ai pages and lists Journeys and Screens as links to them; the Screens page is still there as an old copy of 28 Oct, with everything needed to rebuild it. There are three lists of journeys, and they do not agree: the claude.ai Journeys page (27 journeys), the Journeys page on the main branch (27), and a script in the folder that the Screens page is built from (32). Nothing says which of these is "the UX journeys". What each walk is measured against, and which journey list counts, is yours to decide (section P).

**What "without flaws" means.** The fourth draft's proposal 10: a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. You answered "agreed" on 14 Nov. The measured facts behind it: no walk of either kind finished without flaws in Process3; on 8 Nov its stored report of the internal walk had all 238 steps marked ok with 63 failures listed; and the step count moved from 238 to 357 inside one round.

**Nothing bounds the number of rounds.** You give the reason no tranche finished in Process3: it "kept adding test after test". So the risk that a tranche does not come clean is unmeasured for a process that does not grow. What happens to a tranche that will not come clean is not defined. It is yours to decide (section P). The fifth draft's sentence "Only your word ends a tranche that will not come clean" was Claude's, not marked as Claude's, and is withdrawn.

**When the tranche ends,** ARCH merges the tranche branch into the main branch as a whole, by pull request. The main branch never moves while a tranche runs. None of the three tests runs on that pull request. This merge never happened in Process3 (measured).

**A release** "can (optionally) be started after a tranche completes" (your words of 14 Nov). ARCH prepares it (your Foundations, section C) and waits for your approval (line 18). No release of any kind was cut in Process3 (measured). A development deployment does not use the installer, so no walk shows that the installer can place a release into an empty account. The release path is unproven. You answered the fifth draft's three readings on the tranche and the release (section B). Whether a release has a walk of its own is still open with you (section P).

## E. The three tests

Your words of 14 Nov: "The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!"

And: "Process4 does have 3 tests, but calling the notification of a user module that a provider has changed isn't a test, it's simply a notification. The 3 tests are" and then your list: "module tests", "internal walk", "external walk". Asked whether the two walks count as one test, you answered: "internal and external walks a separate tests." This corrects the record of 13 Nov, which listed the notification as the second test.

A test runs only when there is a fully informed reason to run it (line 19).

1. **Module tests.** The record of 13 Nov: "Each job's own module tests, which include a check that the module's declared uses match its imports". The job writes them; that is its responsibility, and they "must be complete yet fast and efficient" (your words). They run for the job's own module only, on GitHub's machines, when the job marks its pull request ready. *A failure* goes back to the job. A rule for the job, from your Foundations: "every requirement is tested at the module's interface and proven met". Your rule for how every job writes its module tests, typed 14 Nov to the study session: "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response." And: "The comments and tool can also inform module tests to ensure that boundaries are properly checked."
2. **The internal walk,** as you defined it (section A). It is made at the end of a round's jobs, or at any time on your word to the coordinator (that second part is *Claude decided*; it was not marked in the fifth draft). *A flaw* becomes work for a named module in the next round.
3. **The external walk,** as you defined it (section A). It is made on a development deployment, after an internal walk with no flaws. *A flaw* becomes work for a named module in the next round. A tranche ends only when an external walk completes without flaws.

**The check of declared uses reads tests too.** The fourth draft asked whether that check, inside module tests, should read a module's test files as well as its source. Your hint of 14 Nov, exactly: "I think it has to check tests too". Claude has followed it: in this draft the check reads tests too. Process3's check read only source code, and found no undeclared use there (measured: 0 of 3,029 import statements). It never looked at tests, and the job rules told jobs to use a provider's published test fixtures and helpers, that is, ready-made test data and tools kept among the provider's tests. A script that searches today's code finds 122 pairs where one module's tests import from a module it does not declare (measured by that search). Before the check can read tests, those 122 are corrected. Who corrects them is *Claude decided*: 86 point to an earlier module; ARCH declares each in the module list. 36 point to a later module, which line 13 calls a design error "to be fixed by refactoring them", that is, reshaping the code without changing what it does; those modules' jobs do it.

**Tests and steps that jobs write** (*Claude decided*). A module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in text. Process3 had 211 such test files (measured).

**The process's own tool.** The fourth draft's proposal 5: the small tool through which sessions reach GitHub has tests of its own, the size limit on each role's starting text among them; they run only when PROCESS changes the process, and cannot stop a product job. You answered "agreed" on 14 Nov. In the same message you wrote that there is no need for any more tests. Claude reads the two together this way: the tool's tests test no product and never run on a product's work, so the three tests stay three. Say if you meant otherwise.

## F. The notification to user modules

Words used. A **provider** is a module whose services another module uses; that other module is its **user**. A module's **interface** is what it accepts and what it hands back. A **job** is a session that builds one module.

### What it is

It is a notification, not a test. Your words of 14 Nov: "calling the notification of a user module that a provider has changed isn't a test, it's simply a notification."

Its purpose, your words of 14 Nov: "If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary."

### What it cannot do

Your words of 15 Nov: "After much research it seems pretty clear that there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface."

So the notice is a way of saving work. It is not a guarantee. It will sometimes tell a user that needed no change, and sometimes miss a user that did. Asked which way to go given that, your answer of 15 Nov: "Okay, I'll follow your recommendation: 2". The recommendation was to use the method below as a filter, accepting both kinds of error, with a missed user caught later by the three tests.

**What catches a missed user.** Nothing new. The user's own module tests, the next time its job runs for any reason; or the internal or external walk, where the break is a flaw and becomes work for that module in the next round. Your words of 15 Nov: "There will be no additional tests added to the process than the 3 already identified." So no test of users runs before a provider's change merges.

### What counts as a change to the interface

Your words of 14 Nov, to the session that studied this question:

- "a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes."
- "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed."
- On the words that state a bound: "If those words are changing, then there must be a reason why. It must be that that interface is changing, right?"
- "I agree with your recommendation", answering this: for what a provider accepts, users are told only when the new interface cannot stand in for the old (something removed, renamed, newly required or newly refused), so accepting more tells no one; for what a provider hands back, any change to an entry tells that entry's users.

### How it is found

Your words of 14 Nov: "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated."

The event that sends the notice, your answer of 14 Nov: "which event sends the notice: B". That is: a build tool writes out the module's interface, from its code and its structured comments together, before and after the job's change. The notice is sent only when the two listings differ. A comment edited with no change to the listing sends nothing.

**Who is told.** Your words of 14 Nov: "Who is told: ideally only the users of the entry that changed."

**Modules that have no comments yet.** Your words of 14 Nov: "The first time a job for a module without comments starts the first thing it does is add the structured comments." And: "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." That step sends no notice; it gives the "before" listing.

**Inside a job's own module tests.** Your words of 14 Nov: "the tool may refuse a disagreeing comment", that is, a comment that disagrees with its own module's code. And of 15 Nov, "As recommended": the tool may also refuse a module's code that disagrees with a provider's stated interface, inside that module's own module tests, on that module only. These are parts of module tests, the first of the three tests. They are not further tests.

### Claude decided (technical; you can overrule any)

1. Which parts of a provider a user uses is worked out by the tool from the user's code and comments. No list is kept by hand. (On this you wrote: "You tell me.")
2. A user the tool cannot follow fully counts as using everything of that provider, and is told whenever that provider's listing changes.
3. A bound that a kind of value cannot express is written on its own marked line in the comment.
4. The code inside a module that checks or builds what crosses its interface says, in a comment, which kind it checks or builds.
5. Calls made by name are made followable: each provider publishes one table of its operations, the tables are gathered into one list, and each shared piece that carries a call by name has one comment tying the name to that list.
6. The tool is TypeScript's reader, reading plain JavaScript. Both listings of a comparison are made at the same moment with the same version of the tool.
7. "Accepts more", the one difference that tells nobody, counts only when TypeScript's own type checker confirms it.
8. The proof session's further refusals (twenty-three of them) are not taken. Only the two refusals you approved stand.
9. The changes recorded in the proof become the tests of the process's own tool, which run only when PROCESS changes the process and never on a product's work, as in the fourth draft's proposal 5 that you agreed.

### Still open

1. **What a told job does.** The record of 13 Nov, line 10: "A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them." Not studied. Your answer to the fourth draft's proposal 3 was "needs to be studied further."
2. Who is told when the product's list of modules itself changes.
3. What becomes of a module that declares it uses another while no code of it does (510 of Process3's 2,707 notifications went to such modules).

### Proven and not proven

**Proven** (the proof session, on eleven made-up modules and 150 changes; checked against its data by the study session): on the kinds of change it can see, the method decides as its rules say; it cannot be made complete; every miss recounted showed up as a failing test of the user.

**Not proven:** any of it as part of a running process. How many notices it saves on the real product: the proof's changes were chosen to attack it, and there it sent 2.6 times fewer than telling every user. On Process3's record, AI workers judged about 74 of 2,707 notifications needed. Adding comments to a few heavily used real modules and replaying their recorded changes would measure it; that needs your go-ahead, because it starts sessions on your account.

## G. When something goes wrong

**A job fails its tests.** The job fixes its module and the tests run again. After two failed corrections ARCH replaces the session with a fresh one. Your ledger note gives its first task: "the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail."

**A session dies or fills up.** For a job, ARCH starts a new session that continues from the same branch and pull request. For ARCH or the coordinator, ROOT starts a successor, which begins from the shared state and GitHub. For ROOT, the watcher takes over. Replacing ARCH while jobs are open, and a takeover by the watcher, are unproven.

**The process itself has a fault.** No session building a product fixes it or works round it. The job reports it to ARCH, and any change is made only at PROCESS, with you (section H).

**The process is completely blocked.** You get one plain message with a numbered list of what is yours to do. In every other case the stop is recorded as a named blocker and other work goes on; one that only you can clear is told to you at once.

**A stop on your word.** You tell the coordinator, which tells ARCH, which interrupts each job. The stop is a line in the shared state naming the account. ROOT reads it at every wake, so that the hourly alarm does not undo it. After your stop of 9 Nov the alarm went on firing and had sent 94 notifications by 13 Nov (measured). Unproven.

## H. How the process is changed

Your words of 14 Nov, in full:

"Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."

**The rule PROCESS works under.** Your words of 14 Nov: "The 3 tests provide an appropriate opportunity to identify and debug as necessary every flaw and to test everything that needs to work in a released product. There is no need to any any more tests. PERIOD!" Line 20 stands beside them: a change "must not add a new test, gate, review or stop. It may only correct or remove what is broken."

**What follows.**

- **Two recorded lines change.** Line 2 has the process wait for you "only when it is completely blocked". Line 1 has you take no acts but settings changes. Now a process fault that stops work waits for you at PROCESS, and choosing and approving there are acts of yours. In Process3 one question that sessions carried as yours waited about nine hours (measured).
- **No session building a product may change the process,** add a test, check, gate or review to it, or adopt a changed process on its own. ARCH moves a product to a changed process only with your prior approval, by the means PROCESS proposes (section C).

**Two more rules for PROCESS.** The field report quotes them as your written instructions: "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". So "no change" is always among the options, and a fault that stops no work may be answered with it.

**How PROCESS is started and reached.** The fourth draft listed four things here as not yet settled. Your hints settle three; Claude decided the fourth.

- **Who starts it.** Your hint: "ROOT". ROOT starts PROCESS.
- **How a process fault reaches it.** Your hint: "There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS." So a job reports a process fault to ARCH. ARCH asks ROOT to start PROCESS if it is not running. You talk to PROCESS, and the coordinator can talk to it too. Claude reads your hint to mean that the fault's description travels from ARCH to the coordinator and from the coordinator to PROCESS.
- **Which repository it holds.** Your hint: "the processes". Claude reads those two words as the process's own repository. Say if you meant something else.
- **How your approval is recorded** (*Claude decided*). PROCESS writes your approving words into the record of the change in the process's repository, exactly as typed, with the date. Nothing else counts as approval.

None of this has run.

## I. Permissions

Permission management is Process3's, preserved (line 12).

**Auto mode and the checker.** Every session runs in Auto mode: it acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

**Your standing approvals** are a block of text in your own words in CLAUDE.md, saying what sessions may do without asking you and what they may never do. You commit it yourself on GitHub's website. No session writes, edits or relays it. Consent merely quoted in a session's starting text was declined 11 times out of 11 (recorded in your Foundations; no evidence file was found). A session loads the approvals only when it starts.

**After you edit your approvals.** As in Process3, a long-lived session compares the approvals it loaded with the newest, and on a difference does nothing. Each of your five edits in Process3 stopped every long-lived session, and after the last the product never restarted (measured). So an edit to your approvals is one act together with restarting ROOT.

**The deny list** in settings.json takes commands away from every session outright: every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface. So the process's tool is each session's only door to GitHub.

**GitHub's own rules** are your settings. Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a change only by pull request with its tests passing.

**How a session must be started** for both to take effect: with one repository only, because a session that holds more loads no deny list; from the newest commit of the tranche branch; in Auto mode; and with starting instructions that name every act it may take. ROOT, started by your plain prompt, does not meet the last condition. Whether that works is unproven.

**ROOT's start and your newest approvals.** Your hint of 14 Nov: "ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json". What happened in Process3, checked by a worker on 14 Nov against Process3's log and the product's history: a session runs on a cloud machine that is handed a copy of the repository when it starts, and reads your approvals from that copy once, at the start. On 5 Nov you started ROOT on the correct branch. The machine was handed a saved copy of that branch about an hour old: seven changes behind, and without the approvals you had committed sixteen minutes earlier. ROOT's first check noticed and ROOT stopped. Another session sent it one message, it fetched the newest copy, and it carried on. On 8 Nov the same happened with the same saved copy. The fifth draft said that a ROOT you started "plainly came up on the main branch, which held old approvals, both times it was tried". That was wrong in three ways: you did not start it plainly, you pasted the starting text Process3's tool printed; it was not on the main branch; and you started ROOT three times, the first of which landed on the newest copy. The fifth draft then asked you to make the tranche branch the default branch. That would not have helped, because ROOT was on the right branch, and Claude has withdrawn the request. *Claude decided:* ROOT's first act is to fetch the newest copy of its branch, and to stop if it cannot. That is what actually ran, twice. Unproven: why the cloud handed out an old copy, whether it still does, and whether approvals that arrive after a session has started count the same as approvals read at the start.

**How the process reaches a session.** The fifth draft never said. Lines you kept in your ledger do: "A session works on one repository, the product's; the process is a read-only clone at a pinned commit." And: "A product's tranche runs on one pinned process version from open to close, named in the plan". In plain words: the product names one fixed version of the process, and each session fetches a read-only copy of that version. Process3 ran that way. The rest of the second line, that every session checks that version once at its start, ended with the checks in section K.

**Working rules that exist because of the checker.** One judged act per command. A refused act is never reworded or handed to another session. Three refusals in a row stop a session, which is replaced.

**Wording changes only you can make.** Your approvals still say "Process3", "BOB" and "layer close", and carry a dead clause on a reviewer's exemption. In settings.json the rule that allows pushing names the Process3 tool by its file path and must match Process4's tool, or no session can push; and two retired hooks (commands run before every command of every session) are still there.

**Proven and not proven.** About 700 merges with no review went through Process3's tool with no recorded refusal (measured). Process4's tool is unmeasured.

## J. What is kept from Process3

**The line-by-line account.** Your answers of 14 Nov move some of your 288 requirement lines between kept, changed and ended. They were not recounted for this draft; the appendix that lists them one by one will be redone to match it.

**A check that could stop work stays only if this document names it.** Named: the three tests, and the start-up comparison of your approvals (section L, item 11). The process's own tool has its tests, which run only at PROCESS (section E). The other checks Process3 had that could stop work end (section K). *Claude decided* who builds and commits built files: the module's own job, in its own pull request. This goes against a line you kept, that a job never commits a built file, and is open with you (section P).

**Your ledger.** It still shows "keep" or "modify" for every line this definition ends. Your ledger is yours to change.

**Kept, by theme.** Git and GitHub hold all state, with one writer per file. A session acts only on what it has read in full or measured. One total order of modules, one owner module per file, and requirements in a public and a private part under permanent numbers. The process stands only on measured platform behaviour. One short rulebook per role, at most ten rules. The product's CLAUDE.md stays under thirty lines. The process has its own repository and one fixed version for each tranche, moved only with your prior approval. The eight things you dropped in your ledger stay dropped.

**GitHub's published limits.** The fourth draft asked how they are kept to. Your hint of 14 Nov: "same as in process3". Claude reads this as: the way Process3 kept to them is carried over unchanged. Claude has not yet looked up what that way was. Process3's decision record quotes you on 9 Nov: "don't do it beyond just making sure that we don't exceed published limits".

**The tranche report.** One report, written once by ARCH at the tranche's end (*Claude decided* who), only from what git and GitHub already hold: time, work done and left, anything deferred and why, cost where it can be read ("unmeasured" otherwise), the overhead share, ARCH's idle time while work was ready, and your minutes. No number is a target. Nothing reads the report to decide anything.

## K. What ends, and why

**Under your decisions**

- **Layers.** Lines 7 and 24.
- **The full regression and whole-product checks before a release.** Line 6. Claude reads line 6 as also ending the option, in your ledger words of 31 Oct, to have them run "when I ask for one"; that is Claude's inference, not a decision of yours. *Claude decided* that your word to the coordinator still runs the internal walk at any time.
- **Deliberate-fault sampling of tests on payment and data paths.** The record of 13 Nov lists it as ended by line 5. That list is the recording session's own sentence, not one of the recorded lines of your decisions. It was never built.
- **Review by a fresh reviewer** (line 21), and a helper briefed to review (your "agreed" of 14 Nov, section C).
- **The other checks that could stop work.** The fourth draft's proposal 13: your words "three tests and no others" end the checks below, though your ledger still shows each as kept. Your answer of 14 Nov, exactly: "three tests and no others". Claude reads it as ending these checks; say if you meant otherwise:
  - the check that a job wrote only its own module's files (the rule itself stays: line 14 and your words in section C);
  - separate install and upgrade tests before a release;
  - three checks that ran beside a module's tests: that a job's new tests fail when its change is undone; a second run of the module tests on the merged result; and that built files match their sources;
  - the check of your credentials when a tranche opens; the check of the process version at a session's start; the check that the process files a product holds have not drifted; the guard on your approvals block inside Process3's record check; the format and coverage checks beside a module's tests; the re-run of checks when a tranche closes; and the check that no built file is committed.

  Measured: the only firings of the own-files check found in the record were three false alarms, and neither release test was ever built. One consequence: with the guard gone, nothing in git stops a session's pull request from changing your approvals; what remains is the permission checker.
- **A default of 24 live sessions** (your Foundations, 1 Nov). Line 9 makes it eight.
- **Updating the installer and website as part of ending a tranche** (your words of 8 Nov), on your words of 14 Nov: "installer and website are outside the tranche" (section B).
- **Parts of kept lines:** the word "layer" wherever it appears; tests run "at layer close" or "nightly"; the "one full test run" after a change across many modules.

**Proposed for ending by Claude.** These change lines you kept in your ledger or duties in your Foundations. The fifth draft ended them without asking you. They are now proposals for your yes or no (section P, the seven proposals). Until you answer, they are proposed for ending, not ended.

- **The first of your two health numbers,** false "done" claims caught by independent re-verification. Proposed for ending (proposal 1), because the re-verification it counts ended with lines 5 and 21. The second, the cost of each pull request that survives, stays as a reported number where cost can be read. Neither was ever produced in Process3.
- **Three measurements your ledger asked for,** proposed for ending unmeasured (proposal 2): an architecture session that keeps no memory between wakes (a session started by an alarm could not start sessions: 0 of 3, measured); trimming each role's principles by the line-by-line test (section L, item 8); and the share of ARCH's work that is passing things on.
- **Two duties from your Foundations,** proposed for ending (proposal 3); the fifth draft ended them under your words "three tests and no others", but you were not asked whether your words reach that far: counting refused acts and trying them again when a tranche opens and at each model release; and removing parts of the process one at a time at each model release to see whether they are still needed.
- **Two more duties from your Foundations stay,** neither as a check: the alarm for lack of progress is ROOT's hourly wake; and confirming that a session it started exists is part of the act of starting a session.

## L. Earlier requirements Claude proposes to end, or has kept, on the evidence

These too change lines you kept in your ledger. The fifth draft ended items 1 to 8 and item 10 without asking you. They are now proposals for your yes or no (section P, the seven proposals). Until you answer, they are proposed for ending, not ended.

1. **The job's written receipt** of the commands it ran. It caught nothing in 1,187 test runs (measured), and Process3's decision record, written by a session, quotes you on 9 Nov: "get rid of it completely". *Proposed for ending* (proposal 4).
2. **The set-up check before every job start.** It refused every job start after you applied new settings (measured). *Proposed for ending* (proposal 4). The fifth draft said it ended on your instruction of 9 Nov. That was wrong. Process3's decision record, under your quoted words ("Is this needed at all? If so, it must be done efficiently. If not, then cut it."), kept the check and had it run less often: once for each version of the process instead of before every job. Ending it was Claude's doing.
3. **The size cap on a module's requirements file.** Built as a refusal, it was overridden 32 times out of 32 (from the earlier review; not re-measured). *Proposed for ending* (proposal 6).
4. **Recording each job attempt's reading list and cost.** Made compulsory, the cost figure blocked every job completion for 45 minutes (measured). *Proposed for ending* as a duty on jobs, and the cost alarm in your ledger with it (proposal 5).
5. **The check that fails a commit adding an oversized file or a file in a temporary folder.** The record check it was part of gave 947 findings on its first run (measured). *Proposed for ending,* with the record check itself (proposal 6).
6. **The job record as a strictly formatted data file.** Your ledger asked for the experience to be measured; it never was. 105 of 508 merges changed nothing but these records (measured). *Proposed for ending,* on cost (proposal 5).
7. **Every rule must cite a measured failure or your decision.** Checks were added in 41% of Process3's merges both before and after 5 Nov, each with a citation (measured). *Proposed for ending* (proposal 7). Every process change now comes to you at PROCESS, whatever it cites.
8. **A line-by-line test of instruction files in place of a size limit.** It was only advice; the guide with no limit grew from 8 KB to 134 KB (measured). *Proposed for ending* (proposal 7).
9. **"Nothing is ever refused for size", for the process's own texts.** *Ended* for those texts only: the size limit on each role's starting text is among the tool's tests you agreed to (section E).
10. **The reading audit.** Never built. *Proposed for ending* (proposal 7). The rule itself stays (section J).
11. **The start-up comparison of your approvals.** Claude reads line 12 as covering it. *Kept,* with its cost stated in section I.
12. **Deploy tokens held as settings of the Claude cloud environment,** the only route measured to work, and **module tests run in two parts,** so that product code under test holds no access token. *Kept,* as part of the permission management you preserved.

## M. What does not exist yet

- **Where the work is kept.** Your words of 14 Nov: "The process3 repo is public because the development process that we're evolving is open-source software that's still in development. You have my approval to add any and all information related to the process4 update to the repo." *Claude decided:* the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. Claude reads the subtree of your second message as that folder.
- **No Process4 tool exists.** Process3's merge tool refuses for many reasons that end here. Process4 needs a new small tool that does only this: push; open a pull request and mark it ready; merge; start the next job; send notifications; and write the shared state.
- **No Process4 role texts exist, and no PROCESS lane.**
- **The product's repository is not converted.** Its CLAUDE.md on the tranche branch today tells a session whose prompt was not printed by Process3's tool: "Act only as it says; with none, act on nothing." So a ROOT you start with a plain prompt is told to do nothing. The test run must also report on pull requests that change no module, such as your approvals commit, or that commit cannot merge.
- **Nothing is built for:** the shared state; a start by you that lands on the newest approvals; a walk shared among several sessions; deployment as a step in a round; the release path; the stop on your word; the mechanical edit; the uses check that reads tests; or the route by which a process fault reaches PROCESS.

Builder: Claude, before anything is in force.

## N. What is not yet settled

The fourth draft listed fifteen things here. Thirteen were decided in the fifth draft's body, on your hints or by Claude. The notification, which the fifth draft kept here as under study, now rests on your words to the study session and of 15 Nov (section F); three parts of it are still open (1 below). Your answers of 14 Nov raised two more (2 and 3).

1. **The notification: what is still open.** What a told job does (line 10; not yet studied); who is told when the product's list of modules itself changes; and what becomes of a module that declares it uses another while no code of it does (section F).
2. **How two products share the eight slots.** You answered "across the account", and a session holds one repository, so it sees one product. Claude will settle this when a second product starts. With one product nothing changes.
3. **Who starts the watcher.** The note in your ledger, written in by the coordinator, says "by whoever starts ROOT", and you start ROOT. Read plainly, that makes starting the watcher an act of yours, and it is not in your list of acts. From 5 Nov, Process3 had ROOT start it (measured). If Claude's answer departs from that note, it will come to you as a proposal.

## O. What is not yet proven

Your Foundations say: "Nothing here is in force until it has run on a real tranche with the two health metrics measured." Claude has proposed ending the first of the two (section K; proposal 1 in section P); until you answer, your sentence stands as you wrote it. Each trial below could break its claim; none can prove it. Proof is the first real tranche. What is proven and not proven about the notification is in section F.

**Can be tried with nothing asked of you.** That the rule for who takes a free slot gives the same answer every time. That the internal walk finds the one known break between two modules, of 4 Nov, which module tests missed.

**Needs process3-probes, the repository you named, and sessions on your account.** The fourth draft's proposal 11: this trial, in which the whole chain of sessions builds a few small made-up modules, stands as the "one shadow of a representative slice" your ledger note asks for first, though it is weaker than a slice of the real product. You answered "agreed" on 14 Nov. Judged cost to you: one sitting of about half an hour, two session starts, one edit to your approvals and one "stop". (The fifth draft also counted one settings change, the default branch; Claude has withdrawn that.) Each claim gets one rehearsal unless a number is given.

- First: a ROOT started by your plain prompt fetches the newest copy of its branch and comes up on your newest approvals, also straight after an approvals commit, and starts ARCH and the coordinator.
- A merge with no review, by Process4's tool, passes the permission checker. Twenty or more merges, because the checker has passed and refused the same act minutes apart.
- A freed slot is refilled within minutes, and jobs obey a replaced ARCH. With no event, Process3 once noticed a finished job after 194 minutes.
- The shared state works, and the hourly alarm wakes a ROOT you started.
- A watcher takes over from a ROOT that has died: what it leaves behind, and how deep the new ROOT sits.
- A stop, a held merge, a module put first and a new slot number each work on your word, and the alarm does not undo a stop.
- Finished sessions do not use up the account's room. Process3 saw new starts fail silently at about 50 live sessions (one event).
- Several sessions share one walk by journey; sessions run a deployment and an external walk as a step in a round; the Cloudflare account bears the external walkers; and the tranche branch merges into the main branch.
- A mechanical edit across several modules merges once, with the touched modules' tests run and with none run.
- ARCH asks ROOT, ROOT starts PROCESS on the process's repository, and the coordinator talks to it.
- An account switch loses no work. It failed on 5 Nov and was cancelled on 7 Nov.
- Sessions started this way load your approvals and the deny list, also after an edit and a restart; a release can be prepared as far as your approval.

**Only the first real tranche can show**

- Whether a tranche can end (section D).
- Whether the checker goes on passing merges at a real rate. Twenty clean merges bound the refusal rate only below about 14% (estimated).
- How often a process fault stops work and so waits for you at PROCESS.
- Whether cost can be read for the tranche report. In Process3 it often could not.

**Risks with no trial**

- Nothing physical yet stops a session building a product from changing the process's files, or from moving to a changed process. In Process3, sessions made 270 of 296 process changes themselves and moved the version 116 times in nine days (measured). In your words of 14 Nov: "That rule exists only as text, and in Process3 text alone did not hold."
- A job's tests judge its own work. Your words of 14 Nov: "Yes, a job writes its own tests. That's an important responsibility." You have not spoken to the risk that follows. Beside it: 8,838 requirement numbers against 236 to 357 walk steps (measured), so about nineteen requirements in twenty (estimated) are looked at only by the job's own tests.
- Sessions write and count the walk's steps. A step that was loosened cannot be seen. A walk starts from a fresh copy and cannot see an upgrade breaking a user's existing data.
- A module's tests run only on its own job. A failure caused by another module's merge can sit unseen until a walk meets it.
- Most rules in this document are held by text alone, among them the rules against growth outside the process's own repository: product tests that serve the process, extra walk steps, demands written into another session's instructions, a helper briefed as a reviewer. In Process3 the one rule with a hard limit behind it held all week, and rules held by words drifted (measured).
- Why GitHub suspended the sessions' account on 6 Nov was never learned.

## P. Still open with you

These are the questions that are yours and that you have not yet answered. Each says what it is and, where there is one, Claude's recommendation. A recommendation is Claude's, not yours, and nothing here is decided until you answer. Questions you have already answered are in section B and are not repeated.

**The end of a tranche**

1. **What each walk is measured against, and which journey list counts.** The choices: the claude.ai pages; pages kept in the folder you named; or the folder's machine data, which you cannot read and which describes more than is built. Your approvals of 5 Nov say the design documents "are claude.ai artifacts, not repository files"; your words of 14 Nov say screens and journeys are kept in the folder. Claude's recommendation: pages in the folder, so that the repository records every change to what a walk is measured against; that needs one proposal to you about the words "never committed" in your approvals. On which journey list counts there is no recommendation yet: the lists of 27 and of 32 journeys have not yet been compared for you. (This is also the lanes question of where the Screens document and the journeys live.)
2. **What a tranche contains.** Either all open work, so that the first walk comes after about 177 jobs (estimated) and carries every flaw Process3 left; or a smaller content you name for each tranche. Claude's recommendation: a smaller content you name. Its cost is a decision from you at each tranche, and a clean walk of a part says less about the whole.
3. **What happens to a tranche that will not come clean.** Merged with its flaws, which sits against your words "So a release is always fully tested and walked successfully"; or dropped; or kept open. No recommendation: no tranche has ever been walked your way.
4. **Which journeys count toward "all journeys".** Of the 32, three begin at the website or the installer, which you put outside the tranche; six have steps only the AI assistant can do (one of them among the three); one more is connecting a Claude account. Claude's recommendation: a tranche's external walk follows every journey, and what it leaves out is named beforehand, so that leaving it out is neither counted as a flaw nor hidden as a note.
5. **Who runs the walks.** Your hint was "sessions". A line you kept in your ledger, and Process3 itself, had GitHub's machines run them, and that is the only form that has ever run. Whether a session's browser can reach the development site is unmeasured. Claude's recommendation: keep your hint, and let Claude try one walk from a session in the trial repository before the definition depends on it. That needs your go-ahead, because it starts a session and a deployment on your accounts.

**The rule that only PROCESS changes the process**

6. **Whether anything physical stands behind your rule.** Today it is held by words only, and your approvals in the process's repository let sessions merge there without a person. The four choices: words only, as now; your approvals reworded by you to say a process change is merged only on your word given at PROCESS; a GitHub rule so that only your account can update the branch of the process that products use, after which you also press merge on GitHub's website for each change you approve (this is the centre of the proposal withdrawn twice before); or the sessions' account loses the right to write to the process's repository at all. Claude's recommendation: the second now, and the third; the third has never been tried on your repositories. Also yours to say: whether pressing merge counts, for you, as one of the gates you have ruled out.

**The first hour**

7. **Your own acts in converting the repositories.** Not asked today. Some steps only you can do: new wording in your approvals, a changed list of forbidden commands, perhaps the GitHub rule in question 6. Your present approvals in the product forbid sessions to replace the required test run, so an edit of yours must come first there. Claude will bring you the full list of your acts, in order and in one piece, before asking for any of them.
8. **How new work is written into a module.** Your words of 14 Nov: "A job for module A isn't allowed to change module B. The only other way of editing a module is when a mechanical edit (like a word table change) makes the change." As worded, nobody but a module's own job may write a new requirement into it. Claude will bring this to you separately, with its options.

**The release**

9. **Which reading of "a clean development release walk" you meant.** Either the walk that already ended the tranche, so nothing further is walked; or, after the tranche ends, a development release is cut, installed on a test site and walked, and only then are the installer and the website updated. Claude's recommendation: the second. Under the first, three things reach a real team unwalked: the real installer placing the product into a Cloudflare account, an existing team's site being upgraded with its stored data in it, and the assistant working with a real AI model. The cost of the second is that all of it has to be built, and the installer's need for a person to sign in may mean an act from you at each release; that is not yet known.
10. **Whether "with AI on" still holds before the installer and website are updated.** Process3's decision record, written by a session, quotes you on 9 Nov: "Yes, the installer update and site update wait until a release walk with AI on is also clean." It costs you connecting an AI account. Claude's recommendation: yes, at a release only, since you have said a tranche can end without it.
11. **Whether an upgrade of an existing site is walked before a release,** or left to one module's own tests. Claude's recommendation: walked, as part of the same release walk.
12. **Where flaws go when a walk made after the tranche finds some.** No recommendation yet; it depends on your answer to question 9.

**Your requirement lines**

13. **The seven proposals** for the 33 lines of yours that the fifth draft ended without asking you; they are listed at the end of this section.
14. **Which document governs** where your ledger and your Foundations still say the opposite of the definition, for 75 of your lines. Claude's recommendation: a sentence saying the definition is followed from the day you accept it, with the ledger and the Foundations kept as the record of what you decided before; and only once the definition accounts for every line of yours, since otherwise the lines it does not state would vanish by default.
15. **Whether a job may commit built files** (files produced from other files). A line you kept says a job never does; the definition says it does (section J). With it comes the wording in your approvals that the large files a lane's tools build "are built at layer close, deploy and release, never committed": layers are ended, so "layer close" names something that no longer exists. Claude will bring new wording together with this question.
16. **Rewording a requirement.** One older line of yours lets the directing session reword a requirement and tell you in one line afterwards. Your rule of 14 Nov puts such a change to you first. Both cannot stand.

**Lanes** (section C)

17. **Who starts a lane.** Your Foundations: "BOB is the only creator of jobs and lanes". Your answer of 6 Nov as recorded: "BOB starts jobs and lanes, not ROOT". Your hint of 14 Nov has ROOT start PROCESS. Claude's recommendation: both stand. ARCH starts a product's design lanes; PROCESS is the one lane ROOT starts, because it belongs to the process and not to any one product. It needs only your yes.
18. **PROCESS and the two triage lanes.** On 6 Nov you kept a process triage lane and a product triage lane, each to study a problem and bring you options. Claude's recommendation: PROCESS takes the place of the process triage lane, and no product triage lane is started: Process3 built it and never once started a session for it, and in Process4 a flaw found by a walk already becomes work in the next round. That would end something you kept, so it needs your yes or no.
19. **Whether you work with design lanes directly.** On 5 Nov, as recorded, you described lanes' design documents as pages they "create/update/interact with me using". The session's record of 13 Nov has the coordinator as your front door. Claude's recommendation: you work with a lane through its design pages, and with PROCESS directly; everything else comes through the coordinator.
20. **Which lanes Civicsmith begins with.** Claude's recommendation: UX, investigation design and publication design, as on 6 Nov, and any further lane when you identify the need. It needs only your yes.
21. **Your approvals name "BOB".** They say lanes are "run under BOB"; the definition calls that session ARCH. Proposed: the approvals name ARCH when they are next edited. Nothing else about the sentence changes.

**Other matters**

22. **The record's line 11 and your words of 15 Nov.** Line 11 of the session's record of 13 Nov says: "Recognising that an interface changed must be proved rigorous and correct." Your words of 15 Nov: "there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface." Proposed: line 11 is replaced by your words of 15 Nov and your choice of the same day, so that the notice is a way of saving work and not a guarantee (section F).
23. **Tests for the process's own tool.** You agreed in the fourth draft's proposal 5 that the small tool sessions use has tests of its own, and in the same message wrote that there is no need for any more tests. Claude reads the two together this way: the tool's tests test no product and never run on a product's work, so the three tests stay three (section E). Say if you meant otherwise.
24. **A product question that will come to you.** Whether a member's own Claude sign-in through the runner still exists: one module still passes that sign-in to four addresses that now answer "not found", and its requirements file states both positions. Not decided here.

**The seven proposals for the 33 lines.** For each, yes means the ending stands; no means your lines stand as you wrote them. Until you answer, the lines are proposed for ending, not ended. Each proposal is written out in full and ready; say when you want them. Nine of the 33 are checks or re-tests that your "three tests and no others" may already end, but you were never asked whether your words reach that far.

1. **When Process4 counts as in force, and the first of your two numbers for judging the process** (5 lines): the first number, false "done" claims caught by a second look, is dropped, and nothing is in force until it has run on a real tranche.
2. **Three things to be measured on the first tranche** (5 lines): an architecture session that keeps no memory between wakes, trimming the principles each role loads, and the share of the architecture session's work spent passing things on; all three end unmeasured.
3. **Two duties repeated at each new model version and at each tranche's opening** (5 lines): taking parts of the process away one at a time to see what is still needed, and recording, counting and re-trying refusals of acts you approved.
4. **Two removals for which the fifth draft cited what Process3's decision record says you said on 9 Nov** (3 lines): the job's written receipt of its commands, and the set-up check before every job start, which that record in fact kept, run less often.
5. **Records and cost figures kept for each job** (5 lines): no per-job record of reading or cost, no cost alarm, and no strictly formatted job record.
6. **Size limits and checks on what goes into the repository** (4 lines): no size cap on a module's requirements file, no check on oversized or temporary files, and no second required "record" check.
7. **Rules about the process's own rules and instruction texts** (6 lines): every rule citing a measured failure or your decision, the line-by-line test of instruction files, and the audit of whether sessions read documents whole.

---
