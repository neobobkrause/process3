# Part 6. What holds a rule, the tool, and changing the process

Length: 72 lines. Last section: "8. Process4 develops itself".

## 1. What holds a rule

- Three things hold a rule whatever a session intends: the owner's standing approvals, judged by the permission checker; the list of forbidden commands; and GitHub's own rules, which are the owner's settings.
- Every other rule in this design is held by text: by a session's instructions and by this document. That is a known limit. Rules held by text alone drifted in the process before this one.
- The tool guards against mistakes, and not against a session that sets out to defeat it. That too is a known limit.

## 2. The owner's standing approvals

- They are a block of text in the owner's own words, saying what sessions may do without asking him and what they may never do. He commits it himself, on GitHub's website. No session writes, edits or relays it.
- A session loads the approvals only when it starts. **Claude decided:** an edit therefore goes with a restart of ROOT (part 4, section 7), and no session compares the approvals it loaded with the newest.
- The approvals and the list of forbidden commands are protected by the permission checker alone.
- In the process's repository the approvals say that a process change is merged only on the owner's word given at PROCESS. Nothing enforced by GitHub is added for this.
- **Claude decided** where they live: in the product's repository on the tranche branch, carried to the main branch by each tranche's merge, so that every session starts from a commit that holds them; and in the process's repository on its main branch.
- **Claude decided:** his two files are first committed on the main branch, and the tranche branch is made from it. A later edit is a pull request on the tranche branch that he opens and merges himself, after telling the coordinator to stop (part 4, section 7).
- The ordered list of his acts to start a product is in part 7, section 4, for Claude Code. For Codex it is not known (part 8).
- **Open (the owner):** the wording of his approvals and forbidden commands for Process4. A proposal for him to adopt or change, with each change from the present wording, is in `process4/working/design_work_18nov/owner_acts_and_approvals.md`. Until he commits his own wording, no session can run under Process4.

## 3. Forbidden commands and GitHub's rules

- The list of forbidden commands takes these away from every session outright: every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface. So the tool is each session's only door to GitHub.
- Sessions act as a second GitHub account that can push and merge but cannot change settings. No branch can be deleted or overwritten. The tranche branch takes a session's change only by pull request with its required test run passing. The owner commits his approvals and forbidden commands himself.
- GitHub's published limits are kept to: sessions stay within them with a margin and obey GitHub's own rate-limit responses.

## 4. Working rules that exist because of the permission checker

- One judged act for each command.
- A refused act is never reworded or handed to another session.
- Three refusals in a row stop a session, which is replaced.

## 5. The tool

- The tool is the process's own small program. It does only this: make a branch; push; open a pull request, mark it ready, and close it; merge; prepare a release and, on the owner's approval, publish it; choose the next job and write its starting instructions; write out a module's interface listing and send notices; decide when a module's work is finished and a round's jobs are done; read a pull request's test results, and count failed runs on a job's pull request; write a job's kind and record on its pull request; list a told job's related tests; list the modules a round changed and the areas they name, for ARCH to choose from; open and close a walk's issue, and write and read what is in it; read and write the shared state, removing a standing note when what ends it comes true and refusing a second live session for a lane; and, inside a module's own tests, check declared uses and make the two refusals the owner approved (part 2, section 6); and, on GitHub's machines, set the scope of the required run and run the tests chosen (part 2, section 7). Its commands, one for each act, are in the build text `01-the-tool-and-the-required-run.md`.
- It refuses nothing for size, and holds none of the checks the process before this one had that could stop work.
- The tool has tests of its own. They test no product, run only when PROCESS changes the process, and never run on a product's work. **Claude decided:** the changes recorded when the notice's method was proven become tests of the tool.
- The AI builds the tool, before anything is in force.
- A product names one fixed version of the process in its process config, and a tranche runs on that one version from open to close. Each session fetches a read-only copy of it.
- PROCESS answers a finding against the tool that needs a deliberate attack with "no change" unless the owner says otherwise.
- **Unproven:** the tool is not built. Whether merges made by it pass the permission checker at a real rate is unmeasured.

## 6. A process fault

- No session building a product fixes a process fault or works round it.
- A fault goes from the session that met it to ARCH, from ARCH to the coordinator, and from the coordinator to PROCESS. ARCH asks ROOT to start PROCESS if it is not running.
- **Claude decided:** the fault's description is written once by the session that met it and passed on unchanged.
- A process fault that stops work waits for the owner at PROCESS. Other work goes on.

## 7. How the process is changed

The owner's words, in full:

"Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."

What follows from them:

- A change must not add a new test, gate, review or stop. It may only correct or remove what is broken.
- "No change" is always among the options. His written instructions, as a field report quotes them: "caution is a cost, paid only against a measured failure or your word", and "the default answer to a finding with nothing measured behind it is no change".
- Any change to Process4 is explained to the owner, who decides whether and how the process is updated.
- No session building a product may change the process, add a test, check, gate or review to it, or adopt a changed process on its own. ARCH moves a product to a changed process only with the owner's prior approval, by the means PROCESS proposes.
- ROOT starts PROCESS. PROCESS works in the process's own repository, with the owner directly. The coordinator can talk to it.
- **Claude decided:** a ROOT that finds PROCESS already running, by the record PROCESS keeps in the process's repository, starts no second and passes the matter to the one that runs. **Unproven** with two products.
- **Claude decided:** PROCESS runs as one session at a time, keeps its own folder in the process's repository, and records its research there before it proposes.
- **Claude decided:** PROCESS writes the owner's approving words into the record of the change, exactly as typed, with the date. Nothing else counts as approval.
- **Unproven:** nothing physical stops a session building a product from changing the process's files, or from moving to a changed process.

## 8. Process4 develops itself

- PROCESS may have lanes of its own for standing subjects, as needed. **Reading:** PROCESS starts its own lanes.
- When a new model version arrives, PROCESS puts one question to the owner: which parts of the process, and which working rules that exist because of the permission checker, may no longer be needed. Nothing is removed or tried unless he says so.
