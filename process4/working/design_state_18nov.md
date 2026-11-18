# Process4 design state, 18 Nov 2026

Length: 144 lines. Last section: "15. Owed, not yet done".

Written by Claude from Bob's answers in the review session of 18 Nov 2026. This is a working brief for sessions that continue the design. It is not the design document.

## 0. How to read this

- The design is the sixth draft (`process4/definition/process4_definition_v6.md`) as amended by everything below. Where they differ, this file rules.
- Bob's latest statement replaces any earlier one, without a question to him. Do not set his older words against his newer ones, and do not reopen anything settled here.
- Plain words. No reference codes. Bob defines the product; the AI decides technical matters and reports them.
- "Reading:" marks an interpretation by Claude that Bob has not yet confirmed.

## 1. Testing (Bob's ruling, closed)

- The tests are module tests, the internal walk and the external walk. Before a release, an install and an update are each confirmed to have succeeded. Nothing more: no further test phases, gates or reviews.
- Module tests give appropriate coverage of the code, demonstrate correct results, show that error conditions are properly identified and communicated, and check bounds. A test does not fail because it got a different but still valid response. This is a duty of the job, held by its instructions; nothing measures it.
- Every other check Process3 had that could stop work has ended. There is no full regression, on request or otherwise.
- Claude decided, from that ruling: the start-up comparison of Bob's approvals is not kept as a check. An edit to his approvals goes with a restart of ROOT by the one way back (section 8). The size of a role's starting text is not a refusal among the tool's tests; it is kept short by the rule in section 3.
- The process's own tool has tests of its own. They test no product, run only when PROCESS changes the process, and never run on a product's work.
- The notice to user modules is a way of saving work, not a guarantee. A notified job checks only the changed parts and runs only the tests that relate to them.

## 2. Documents

- Two documents. A design document that defines the Process4 design, and a background document that gives the background and context.
- The design document names no product. Civicsmith's own facts and conversion steps go to a separate Civicsmith conversion plan.
- The design document is "the Process4 requirements" and is what sessions follow.
- Bob's Foundations, brought up to date with the design, become the background document. Bob's ledger was a worksheet and is retired.
- Bob's decisions about the Process4 design are kept in the repository. The design document is kept up to date so that it reflects them, in the same step, and carries none of the history of how the design got to its present state.
- The record of decisions is ordered by subject. Each entry states the rule as it now stands, and a decision that changes an entry rewrites it in place. Bob's exact dated words are kept and never edited. A rewritten entry is shown to Bob once before it stands.
- The body of the design names no hosting provider. Whatever depends on where a product is hosted and released (the development site, deploying, the deploy token, the hosting account's limits, installing and updating) is stated in neutral terms, with a table for each hosting provider saying what carries each term. Cloudflare is the first. Support for other hosting is not built now; the design is written so that it can be added.
- Where the Codex side of the design is not yet known or not yet built, the design notes the shortcoming plainly and leaves it for Bob's work on the OpenAI account to fill. The list is `process4/working/codex_shortcomings_to_fill.md`.
- Harness-neutral terms in the body of the design, with a table for each harness (Claude Code, Codex) saying which construct carries each term. Anything specific to Claude Code, such as CLAUDE.md and settings.json, is marked as specific to Claude Code.
- Process4 is proposed (now), then on trial (from Bob's acceptance, used for the trial repository and the first real tranche), then in force (after the first real tranche ends, on Bob's word).

## 3. Reading in full

- Every text a session must read in full, and every set of texts read together, is kept below a measured maximum size. Nothing can ensure a full reading; keeping below the maximum reliably results in one.
- The Codex maximums are used, because they rest on real measurements and Codex context windows are in effect more constrained than Claude Code's. The values are not yet settled. The figures found so far are in `process4/working/harness_separation/`; they are sizes shown to work, and none is a size at which reading was shown to fail.
- Each role's principles are concise, sufficient for the role to be performed correctly, and unambiguously clear. Whenever they are changed, every effort is made to keep them short enough to be read in full and not scanned. Where that cannot be done, the matter comes to Bob to find a solution. Reading: PROCESS brings it to him.
- A module's requirements file is kept under the maximum as a rule ARCH applies. When a file nears it, ARCH splits the module into two real modules. Nothing refuses a job or a merge.
- Claude's addition: each governing text says at its top how long it is and what its last section is.
- Provisional values, on Bob's word of 18 Nov after the first measurement: "let's use these current values for now so that we move forward with the next task". Reading: "these current values" are the four put to him: a single text, 24,000 bytes; a set, 175,000 bytes; a role's starting text, 4,096 bytes and at most ten rules; the fill level, 40 percent. The 40 percent is also in Bob's own words of 17 Nov: "process4's policy of refreshing sessions when the context window exceeds 40% or more". They stand until a second measurement reports. Bob judged the first measurement too weak to rely on. Its results are in `process4/working/reading_measurements/RESULTS.md`; the second is briefed in `reading_measurements/RERUN_PROMPT.md`.

## 4. How Bob's words become decisions

- A message of Bob's that begins "Decision:" or "Instruction:" is copied exactly, with its date. Everything else is conversation. A session that thinks Bob has decided something without the mark asks once: "Shall I record that as a decision?"
- A decision about a product being built is made through the coordinator. A change to Process4 itself, which is not a product, is made through PROCESS. Each keeps its own record and is its only writer.
- The coordinator is Bob's front door. He may watch and sometimes speak to ARCH and to lanes. A marked message given to ARCH or a lane is followed, and passed to the coordinator exactly as typed for recording. He works with a lane through its design pages and with PROCESS directly.
- A question is put to Bob inline, in one form: a title, the question, an explanation of the issue, options each with its own identity, the recommendation and its reasons, and the freedom to set the options aside.
- One standing page always shows everything waiting for Bob. A notification goes to his phone when something arrives that only he can clear.

## 5. Tranche, rounds and walks

- Before a tranche opens, ARCH proposes in a few plain lines what it is for and which journeys are expected to complete at its end, naming any journey left out and why. Bob approves or changes it.
- Every round's walks are partial, the first round included. ARCH names the areas a round's updates affect before each walk. A partial walk is without flaws when it lists no flaw in the areas it was given.
- A full external walk is opt-in. By default it is not made. If Bob asks the coordinator for one before a round's partial walks come clean, it is made, and the tranche ends only if it is clean. "Lists no flaw and leaves out no step that the walk before it made" applies to full walks.
- A flaw is one of three things: the workflow as built does not match the Screens document; a journey cannot be completed; a journey completes with a wrong result. Anything else a walker notes goes to ARCH as an observation and does not hold the tranche. Where ARCH judges the document wrong and the product right, the UX lane corrects the document.
- The Screens document and the journeys are pages kept in the product repository's folder. During a tranche they change only to correct an error a walk has shown, and each such change is named in the account after the round.
- Walking sessions make both walks, and they walk the product being developed, whatever product that is. ARCH's session makes the development deployment.
- After each round the coordinator gives Bob a short account: jobs done, flaws found, flaws carried over, observations set aside, changes to the walks' documents, rewordings made, and cost where it can be read. Nothing waits on it.
- A tranche that does not come clean goes on in rounds until Bob says. He then chooses between merging it with its flaws named, with no release from it, and dropping it.
- There is no walk outside a tranche. The only walk made on Bob's word is the opt-in full external walk; the sixth draft's internal walk "at any time on your word" is removed. There are no triage lanes.
- The report written once at a tranche's end stands as the sixth draft has it, beside the account after each round.

## 6. Release

- Any tranche that has ended can be released, on Bob's approval, once an install and an update have each been run and confirmed successful. Neither is walked.
- Reading: the install and update run on a development account; "successful" means the installer or updater finishes without error and the site it produced starts; on a failure no release is offered and the fault becomes work in the next tranche.
- An urgent fix is a tranche whose content is that fix alone.
- Built files are never committed. They are built at each walk, deployment and release.

## 7. Work and requirements

- ARCH writes and rewords the requirement text in a module's file, and touches no code and no tests. The module's job marks a requirement met in its own pull request.
- A rewording that changes what the product does comes to Bob first. One that only says the same thing more clearly is made, and told to him in the account after the round.

## 8. Sessions and roles

- Each long-lived role is refreshed on purpose, at a natural pause in its work or at a stated fill level, whichever comes first. It asks its parent. Its successor starts only from the shared state and the repository.
- ARCH is long-lived.
- Whatever has one right answer is done by the process's tool: who takes a free slot, when a notice is sent and to whom, whether a round's jobs are done. ARCH's session keeps what needs judgment. The share of ARCH's work that is passing things on is measured on the first tranche.
- The watcher is kept, and ROOT starts it. Its takeover is designed and rehearsed in the trial.
- After any full stop there is one way back: Bob starts ROOT, and ROOT rebuilds everything from the shared state and the repository. A switch of account adds only Bob's own acts in the new account.
- ARCH starts a product's design lanes. ROOT starts PROCESS. PROCESS works in the process's own repository.
- A lane decides design in its area. ARCH decides whether and when a design is built and whether it can be built as given. A design ARCH cannot build goes back to the lane.

## 9. What holds a rule

- Bob rewords his approvals in the process's repository to say a process change is merged only on his word given at PROCESS. Nothing enforced by GitHub is added.
- His approvals and the list of forbidden commands are protected by the permission checker alone.
- A process fault goes from ARCH to the coordinator to PROCESS. Claude decided: its description is written once by the session that met it and passed on unchanged.

## 10. Left out of Process4

- The count of false "done" claims; a session with no memory between wakes; the line-by-line test of instruction files; the job's written receipt; the set-up check before a job starts; per-job records of reading and cost, the cost alarm and the fixed-format job record; the record check and the check for oversized or temporary files; the rule that every rule cites a measured failure; the reading audit.
- In place of the two duties repeated at each new model version: when a new model version arrives, PROCESS puts one question to Bob about which parts of the process, and which working rules that exist because of the permission checker, may no longer be needed. Nothing is removed or tried unless he says so.

## 11. Where things are

- The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The Codex work is on that same branch.
- Bob's typed words are in `process4/owner_words/`. The working Foundations are `process4/evidence/foundations.md` and `process4/evidence/foundations_tranche_9nov.md`.

## 12. Working principles (Bob, 18 Nov)

- Every problem is either an architecture bug or an implementation error. Reading: an architecture bug is corrected by rewriting the part of the design it belongs to, never by appending to it; an implementation error is corrected in the code or text that has it.
- A workaround is not a fix.
- Where the process stops. It owns what can be proven in the repository and on the machines that run the tests. Promoting a release to installed sites, rolling one back, and support belong to the product's own procedures and to Bob, and production keys are never in the sessions' environment. Process4 provides the appropriate level of support for promoting to installed sites, for rollback and for support. That level is written procedures (section 14).
- Two kinds of refusal are kept apart. An act the permission checker refused is never retried elsewhere. An act a session declined only because its instructions did not name it may be given to a new session whose instructions do.
- Development work continues as long as there is work that can still be done productively, efficiently and safely.

## 13. Taken from Bob's own statements of 14 to 17 Nov

- Process4 steps around the situations where a known weakness of AI sessions does harm, and does not rely on repairing the harm afterwards. For each such weakness the design names the sign that it is near and what the session then does.
- Process4 develops itself. PROCESS may have lanes of its own for standing subjects, as needed. A hard open question gets a session of its own with a written brief and a bounded task, and ends with a written result once the result is usable. Reading: PROCESS starts its own lanes.
- Workers are the standing way a long-lived role keeps heavy reading out of its own context: a narrow brief, a short answer in a set shape, and the worker ends when its work is done. A brief may hand the worker a decision to make, which it reports with its grounds.
- No session assures Bob that something will work. Each claim put to him says what is proven and what is not, names its source, and calls anything unread or unmeasured unknown.
- What sessions say to each other, and the process's running records, never build up as files or commits in a repository. Claude decided: the shared state is a small fixed set of records, each rewritten in place, and messages are not stored as files.
- Bob can see each open job's progress and status without speaking to it. A product's ROOT, ARCH, coordinator, lanes and jobs are grouped under that product; workers are left out. A finished session is archived, not deleted. Claude decided: the session that started a session archives it.
- The maximums and the fill level are chosen by one yardstick: after a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level.

## 14. Decided from ideas (Bob, 18 Nov)

- Support beyond the process is written procedures. For each product the process keeps a short written procedure for promoting a release to installed sites, for rolling one back, and for handling a problem reported from an installed site. With each release it writes what changed, what the update does to stored data, and how to go back. Bob, or whoever runs the product, carries the procedures out.
- Each product has one short page, kept by ARCH and read by every role, that ranks its kinds of governing text: mission, principles, standards, requirements, design decisions. A lower one never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH.
- A stop that nothing called for is a process fault. Some need no change to Process4, for example a stop caused by a compaction; then the stopped session is woken or replaced. Each such case may be studied and reported to PROCESS. Any change to Process4 is explained to Bob, who decides whether and how the process is updated. Reading: while Process4 is on trial every such stop is reported to PROCESS; the simpler handling applies once it is beyond trial.
- Each act of Bob's with a known date appears on his standing page before the date, with the steps. Every reasonable effort is made to renew a token before it expires, so that no full stop is needed. Sessions other than ROOT and the watcher are relatively short-lived, so once a new token is in place, fresh sessions start with it before the old one expires. A full stop happens only if the token is not replaced in time. Reading: a role such as ARCH lasts, while its sessions are refreshed often.
- A message wakes its receiver at once. Whatever the receiver needs is saved before the message is sent. A message from the directing session is an instruction; a message from any other session is information. Where a harness has not been shown to wake a session at once, that is noted as a shortcoming.
- A harness runs AI sessions only on what Bob's subscription covers. Anything that would cost more comes to him first.
- Each harness's own files are kept apart in the process's repository, and a change for one harness never alters the other's.
- Where it is in doubt how a change will affect the product, and inspecting or testing the code cannot settle it, the walks exercise the running workflow concerned; if it does what is expected, there is no problem. Reading: this adds no test; it is part of what ARCH names for a round's walks. It is not stated as a habit in any role's principles.
- Every kind of standing note in the shared state says what ends it, and the tool removes the note when that comes true.
- The tool guards against mistakes, and not against a session that sets out to defeat it. That is a known limit. PROCESS answers a finding that needs a deliberate attack with "no change" unless Bob says otherwise.
- A session saves its work to the repository before its turn ends. A stop on Bob's word takes effect in the turn in which a session receives it.

## 15. Owed, not yet done

- The values of the maximums, to fill the design's named blanks. Provisional values are in section 3. Still owed: a second measurement that can be relied on, run by another session in the `process3-probes` repository.
- A design for how a notified job picks the tests that relate to a changed entry.
- The design of the watcher's takeover.
- A worked proposal on branches and where Bob's approvals live, with each act asked of him.
- Technical matters Claude settles and reports: when a round's jobs are done; who can read the deploy token; who decides an interface between two modules; files that no module owns; which copy a job's tests run against; what the shared state holds; loops with no end; what an edit to Bob's approvals does to a running round; why the sessions' account was suspended on 6 Nov (how Process3 kept to GitHub's limits is answered in the working Foundations: it used 80 to 90% of the published limits and obeyed GitHub's rate-limit responses); the notification's two smaller open parts.
- Settled by Claude on 18 Nov and written in the seventh draft: how two products share the slots (each product's config names its share); who is told when the module list changes; a declared use that no code makes; where each loop ends.
- For the Civicsmith conversion plan: which journey list counts.
