Length: 248 lines. Last section: "201. The order of your acts to start a product".

## Part 6. What holds a rule, the tool, and changing the process (continued)

### 175. Sentences in your committed approvals that Claude wrote
- **Where:** Part 6, section 2, second and fifth points.
- **The design says:** "The blocks he committed on 19 Nov for the process's repository and the trial repository were written by Claude as edits of his 8 Nov text. Sentences there in his first person that Claude wrote are Claude's words, not his; each is named in `process4/working/readiness_19nov/attribution_audit_2.md`, sections C1 and C2." "As first committed they said, in a sentence Claude wrote in his first person, that he merges each pull request there himself".
- **In practice:** The approvals you committed on 19 Nov contain sentences in your voice that Claude wrote, among them "They merge nothing.", "I merge each of their pull requests myself, on GitHub's website." (since changed by you) and, for the test repository, "Until the process's tool exists, the one session I start for the first trial may, without the tool, ..." and the paragraph on the tool and the fetch.
- **Where it came from:** Claude's own words, written in your first person.
- **Your nearest words:** Your 8 Nov approvals, of which these blocks are edits (listed sentence by sentence in that audit).
- **Against your words:** Goes beyond them, in your voice.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 176. Your approvals are protected by the permission checker alone
- **Where:** Part 6, section 2, fourth point.
- **The design says:** "The approvals and the list of forbidden commands are protected by the permission checker alone. **From a session's record:** the design state, line 91."
- **In practice:** Only the platform's safety check stops a session changing your approvals; nothing on GitHub does.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 91. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 177. A process change is merged only on your word at PROCESS
- **Where:** Part 6, section 2, fifth point.
- **The design says:** "The approvals he committed in the process's repository say nothing of PROCESS. ... as he changed them on 19 Nov, sessions merge there into main once the required check `tool-tests` passes, without a person's review (part 4, section 11). **From a session's record:** the design state, line 90: a process change is merged only on the owner's word given at PROCESS. Nothing enforced by GitHub is added for this."
- **In practice:** A change to the process is to be added only when you say so at PROCESS, but your current approvals there let sessions add changes once their tests pass.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 90. Not your typed words.
- **Your nearest words:** "Process changes only happen in a separate process lane call PROCESS that I interact with." and "for me to explore and ultimately choose" (`bob_words_14nov_b.md`)
- **Against your words:** Agrees with your words; differs from your approvals as now committed.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 178. Where your approvals live, and how you change them
- **Where:** Part 6, section 2, sixth and seventh points.
- **The design says:** "**Claude decided** where they live: in the product's repository on the tranche branch, carried to the main branch by each tranche's merge, so that every session starts from a commit that holds them; and in the process's repository on its main branch." "**Claude decided:** his two files are first committed on the main branch, and the tranche branch is made from it. A later edit is a pull request on the tranche branch that he opens and merges himself, after telling the coordinator to stop (part 4, section 7)."
- **In practice:** You put your two approvals files in place at the start; to change them later you halt work and make the change yourself.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 179. The wording of your approvals for Process4
- **Where:** Part 6, section 2, last point; also part 10, section 1, item 8.
- **The design says:** "**Open (the owner):** the wording of his approvals and forbidden commands for Process4. A proposal for him to adopt or change, with each change from the present wording, is in `process4/working/design_work_18nov/owner_acts_and_approvals.md`. Until he commits his own wording, no session can run under Process4."
- **In practice:** Nothing runs under Process4 until you write and commit your own approvals.
- **Where it came from:** Open for you; the proposal is Claude's.
- **Your nearest words:** "Experience in Claude tells me that it's very important that you get this right. So don't guess or assume." (`bob_words_16_17nov_codex_development.md`, said of Codex's grants)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 180. What the banned-commands list takes away, and the one exception
- **Where:** Part 6, section 3, first point.
- **The design says:** "**Claude decided**, carried from the sixth draft, for this line and the next: the list of forbidden commands takes these away from every session outright: every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface. So the tool is each session's only door to GitHub. **Claude decided** the one exception: a session's first command fetches its read-only copy of the process, the tool with it, and that fetch is not made by the tool."
- **In practice:** Sessions can reach GitHub only through the process's own program, except for fetching that program at the start.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 181. A second GitHub account for the sessions
- **Where:** Part 6, section 3, second point (covered by the mark on the first).
- **The design says:** "Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a session's change only by pull request with its required test run passing. The owner commits his approvals and forbidden commands himself."
- **In practice:** Sessions work under a separate GitHub account of yours that cannot change settings or delete anything.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 182. Obeying GitHub's slow-down replies
- **Where:** Part 6, section 3, last point.
- **The design says:** "Obeying the rate-limit responses, **from a session's record:** the same line of the Foundations."
- **In practice:** When GitHub says "slow down", sessions wait.
- **Where it came from:** A session's record: the Foundations. Not your typed words. (Keeping within GitHub's limits is yours, as the Foundations quote you.)
- **Your nearest words:** "I'd suggest that the tooling limit usage to 80% or 90% of github's published limits." (your words, quoted in the Foundations, `foundations_tranche_9nov.md`, line 71)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 183. Working rules that exist because of the permission checker
- **Where:** Part 6, section 4.
- **The design says:** "**Claude decided**, carried from the sixth draft. The third rests on a measurement the Foundations record (`foundations_tranche_9nov.md`, line 194), not on a ruling." "One judged act for each command." "A refused act is never reworded or handed to another session." "Three refusals in a row stop a session, which is replaced."
- **In practice:** Sessions do one risky thing per command, never try a refused act another way, and are replaced after three refusals in a row.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 184. What the process's program does
- **Where:** Part 6, section 5, first point.
- **The design says:** "**Claude decided:** the tool is the process's own small program. It does only this: make a branch; push; open a pull request, mark it ready, and close it; merge; prepare a release and, on the owner's approval, publish it; choose the next job and write its starting instructions; write out a module's interface listing and send notices; ... and, on GitHub's machines, set the scope of the required run and run the tests chosen (part 2, section 7)."
- **In practice:** One small program does all the process's bookkeeping and all its dealings with GitHub.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "used by our build tools to determine whether the domain or range has changed so that user modules need to be updated." (`bob_words_14nov_notice_session.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 185. The program has tests of its own
- **Where:** Part 6, section 5, third point.
- **The design says:** "The tool has tests of its own. They test no product, run only when PROCESS changes the process, and never run on a product's work (**from a session's record:** the design state, line 20). **Claude decided:** the changes recorded when the notice's method was proven become tests of the tool."
- **In practice:** The process's own program is tested when the process changes, never during product work.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 20), not your typed words; the last sentence is Claude's own choice.
- **Your nearest words:** "There will be no additional tests added to the process than the 3 already identified." (`bob_words_15nov_main.md`)
- **Against your words:** Differs in part: these are tests beyond your three, though never on product work.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 186. The AI builds the program before anything is in force
- **Where:** Part 6, section 5, fourth point.
- **The design says:** "**Claude decided:** the AI builds the tool, before anything is in force."
- **In practice:** The program is written by an AI session first.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I also suggest that we prioritize trying to get process4 development to the point that its constructs can be used for its further development." (`bob_words_17nov_fresh_context_and_process_self_development.md`)
- **Against your words:** Agrees in aim.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 187. How a process fault travels to PROCESS
- **Where:** Part 6, section 6, second point.
- **The design says:** "A fault goes from the session that met it to ARCH, from ARCH to the coordinator, and from the coordinator to PROCESS (**from a session's record:** the design state, line 92)."
- **In practice:** A building session that finds a fault in the process tells ARCH, which tells the coordinator, which tells PROCESS.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 92. Not your typed words.
- **Your nearest words:** "M2: There are communication channels between module jobs and ARCH, and between ARCH and the coordinator. ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS." (`bob_words_14nov_c.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 188. A fault is described once and passed on unchanged
- **Where:** Part 6, section 6, third point.
- **The design says:** "**Claude decided:** the fault's description is written once by the session that met it and passed on unchanged."
- **In practice:** Each session in the chain passes on the first session's own account, not its own retelling.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 189. A fault that stops work waits for you; other work goes on
- **Where:** Part 6, section 6, last point.
- **The design says:** "**Claude decided**, from his words in section 7: a process fault that stops work waits for the owner at PROCESS. Other work goes on."
- **In practice:** If a fault in the process blocks something, that part waits for you while everything else continues.
- **Where it came from:** Claude's own choice, drawn from your words.
- **Your nearest words:** "Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 190. A change may only correct or remove what is broken
- **Where:** Part 6, section 7, first point after your words.
- **The design says:** "It may only correct or remove what is broken: **from a session's record:** the record of 13 Nov, line 20."
- **In practice:** A process change can mend or take away, never add.
- **Where it came from:** A session's record: the 13-14 Nov record, line 20. Not your typed words. (No new test, gate, review or stop is yours.)
- **Your nearest words:** "Do not add tests, gates, reviews or checks." (`bob_words_14nov_b.md`)
- **Against your words:** Goes beyond them: yours forbid adding tests and checks, not every addition.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 191. "No change" is always an option
- **Where:** Part 6, section 7, second point after your words.
- **The design says:** ""No change" is always among the options. **From a session's record:** the Foundations (`foundations.md`, line 38; `foundations_tranche_9nov.md`, line 44), in their own words, addressed to him under "your direction, 2 Nov": caution is a cost, paid only against a measured failure or his word, and the default answer to a finding with nothing measured behind it is no change. These are not his typed words."
- **In practice:** Every proposed process change you are shown includes leaving things as they are.
- **Where it came from:** A session's record: the Foundations' own sentences. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 192. PROCESS works in the process's own repository
- **Where:** Part 6, section 7, fifth point after your words.
- **The design says:** "ROOT starts PROCESS. PROCESS works in the process's own repository (**from a session's record:** the design state, line 85), with the owner directly."
- **In practice:** PROCESS works on the process's own project, not the product's.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 85. Not your typed words.
- **Your nearest words:** "Process changes only happen in a separate process lane call PROCESS that I interact with." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 193. Only one PROCESS at a time
- **Where:** Part 6, section 7, sixth and seventh points after your words.
- **The design says:** "**Claude decided:** a ROOT that finds PROCESS already running, by the record PROCESS keeps in the process's repository, starts no second and passes the matter to the one that runs." "**Claude decided:** PROCESS runs as one session at a time, keeps its own folder in the process's repository, and records its research there before it proposes."
- **In practice:** There is never more than one PROCESS, and it writes down its research before putting options to you.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "ARCH can ask ROOT to start PROCESS if it isn't already running" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 194. Only your own typed words count as approval of a change
- **Where:** Part 6, section 7, eighth point after your words.
- **The design says:** "**Claude decided:** PROCESS writes the owner's approving words into the record of the change, exactly as typed, with the date. Nothing else counts as approval."
- **In practice:** A process change is approved only by your words, kept exactly as you typed them.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Only words I wrote count as my word." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 195. PROCESS starts its own lanes
- **Where:** Part 6, section 8, first point.
- **The design says:** "PROCESS may have lanes of its own for standing subjects, as needed. ... **Reading:** PROCESS starts its own lanes."
- **In practice:** PROCESS itself opens design lanes for subjects such as context or permissions.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** "your work to continue as PROCESS, with lanes, as needed" (`bob_words_17nov_fresh_context_and_process_self_development.md`)
- **Against your words:** Agrees, and goes a little beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 196. One question to you when a new AI model arrives
- **Where:** Part 6, section 8, second point.
- **The design says:** "When a new model version arrives, PROCESS puts one question to the owner: which parts of the process, and which working rules that exist because of the permission checker, may no longer be needed. Nothing is removed or tried unless he says so. **From a session's record:** the design state, line 97."
- **In practice:** With each new AI model you are asked what might now be dropped.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 97. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 7. The harness table for Claude Code

### 197. The product's instruction file stays under thirty lines
- **Where:** Part 7, section 1, table, row "Instruction files loaded at start".
- **The design says:** "The product's `CLAUDE.md` stays under thirty lines (**from a session's record:** the Foundations, `foundations_tranche_9nov.md`, line 184)"
- **In practice:** The file every Claude session reads first in the product is kept very short.
- **Where it came from:** A session's record: the Foundations, line 184. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 198. Grouping a product's sessions by a label
- **Where:** Part 7, section 1, table, row "Grouping sessions under a product".
- **The design says:** "**Claude decided:** a tag naming the product, set on each session when it is started. Sessions can be listed by tag. Workers are not sessions and so carry none. Read in the session tools' own descriptions; not measured"
- **In practice:** Every session started for a product carries the product's name as a label; that would include the watcher, walking sessions and PROCESS.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Again, I see no need for subagents to be members of a project. Only jobs, lanes, ARCH, ROOT, and the process coordinator sessions should be kept in the project." (`bob_words_17nov_project_membership.md`)
- **Against your words:** Differs: your list leaves out the watcher, walking sessions and PROCESS.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 199. Seeing each open job by its title
- **Where:** Part 7, section 1, table, row "The owner seeing each open job".
- **The design says:** "**Claude decided:** each job's session is titled with its module's name, and the list of sessions shows each one's title and whether it is working, waiting or finished. Read in the session tools' own descriptions; whether the list he sees meets the rule is not measured"
- **In practice:** You would see each building session in your list of sessions under its part's name, with whether it is working, waiting or done.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I rarely interact with jobs, but seeing their progress and status is important." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees in aim.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 200. Where cost can be read
- **Where:** Part 7, section 1, table, last row; also part 10, section 2, item 3.
- **The design says:** "**Open (a session):** where cost can be read is not named anywhere read"
- **In practice:** Nobody yet knows where the design could read what the work costs; a session is to find out.
- **Where it came from:** Left open for a session, not for you.
- **Your nearest words:** "Are you in fact designing something that will require additional costs outside of the subscription?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 201. The order of your acts to start a product
- **Where:** Part 7, section 4.
- **The design says:** "**Claude decided** the order. **Unproven:** none of it has been carried out for Process4." Ten acts follow, from "1. Have a second GitHub account for the sessions." to "10. Once the required test run has reported for the first time, make the rule for the main and tranche branches: change by pull request only, with that run passing."
- **In practice:** These are the ten things you would do yourself, in this order, before any product can be built.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "O12: agreed" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
