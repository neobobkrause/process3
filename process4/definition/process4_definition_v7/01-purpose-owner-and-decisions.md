# Part 1. Purpose, the owner, his decisions, and working principles

Length: 85 lines. Last section: "7. Known weaknesses of AI sessions".

## 1. What Process4 is for

- Process4 is the way AI sessions build a software product for the owner in a GitHub repository, and can do so with nobody watching. **From a session's record:** the record of 13 Nov, line 2.
- Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. **From a session's record:** the Foundations (`foundations.md`, line 38).
- The owner defines the product: its purpose, audiences, requirements, principles and broad design (**from a session's record:** the Foundations, `foundations.md`, line 32). The AI decides everything technical and tells him in plain words what it decided. **Owner:** "Decide technical matters yourself and tell me what you decided." (`bob_words_14nov_b.md`)
- Development work continues as long as there is work that can still be done productively, efficiently and safely. **From a session's record:** the design state, line 110.

## 2. Where the process stops

**From a session's record:** the design state, lines 108 and 124, for this section. His nearest words: "installer and website are outside the tranche" (`bob_words_14nov_c.md`).

- The process owns what can be proven in the repository and on the machines that run the tests.
- Promoting a release to installed sites, rolling one back, and support belong to the product's own procedures and to the owner. Production keys are never in the sessions' environment.
- For those three the process provides written procedures (part 3, section 8). The owner, or whoever runs the product, carries them out.

## 3. The owner's acts

| Act | When | Mark |
|---|---|---|
| Start ROOT | At each start or restart of development; after any full stop; and, as **Claude decided**, after each edit to his approvals (part 4, section 7) and when the harness's limit on depth is near (part 4, section 6) | **From a session's record:** the record of 13 Nov, line 16; "after any full stop", the design state, line 84 |
| Tell the coordinator things; give marked decisions and instructions | Whenever he chooses | **From a session's record:** the record of 13 Nov, line 17; the marks, the design state, line 47 |
| Approve or change ARCH's proposal for a tranche | Before each tranche opens | **From a session's record:** the design state, line 55 |
| Approve a public release | Once for each public release | **Owner:** sessions may never "publish a public release or promote a release to installed sites without my approval" (his approvals, Process3's `CLAUDE.md`) |
| At PROCESS: choose among the options offered for a process change, and approve a product's move to the changed process | Whenever a change is proposed | **Owner:** "for me to explore and ultimately choose"; "only with my prior approval" (`bob_words_14nov_b.md`) |
| Commit his standing approvals and the list of forbidden commands, in the product's repository and in the process's | At the start, then only when the wording must change | **Owner:** "O12: agreed" (`bob_words_14nov_c.md`), to the fourth draft's proposal 12 |
| Change a permission or rule setting in GitHub or in the hosting account | Very occasionally | **From a session's record:** the record of 13 Nov, line 1 |
| Connect the harness to GitHub, and enter the deploy token and other secret values, from a page the process writes | At the start of a product, at an account switch, and before a token expires | **Owner:** "O12: agreed" (`bob_words_14nov_c.md`); "before a token expires", **from a session's record:** the design state, line 127 |
| Connect an AI account to the development deployment | Before an external walk of journeys that use AI | **Owner:** "O12: agreed" (`bob_words_14nov_c.md`) |

- Each act with a known date appears on his standing page before the date, with the steps. **From a session's record:** the design state, line 127.
- Every reasonable effort is made to renew a token before it expires, so that no full stop is needed. Once a new token is in place, fresh sessions start with it before the old one expires. A full stop happens only if the token is not replaced in time. **From a session's record:** the design state, line 127. His words on renewal are about Codex only (`bob_words_16_17nov_codex_development.md`).
- A harness runs AI sessions only on what the owner's subscription covers. Anything that would cost more comes to him first. **From a session's record:** the design state, line 129. His words on it are a question (`bob_words_16_17nov_codex_development.md`).

## 4. How the owner's words become decisions

- A message of his that begins "Decision:" or "Instruction:" is copied exactly, with its date. Everything else is conversation. **From a session's record:** the design state, line 47. His own rule: "Only words I wrote count as my word." (`bob_words_14nov_b.md`)
- A session that thinks he has decided something without the mark asks him once whether to record it as a decision. **From a session's record:** the design state, line 47.
- No session writes its own summary of his words as his. **Owner:** "Never record your decision or your summary as mine." (`bob_words_14nov_b.md`)
- His latest statement replaces any earlier one, without a question to him. No session sets his older words against his newer ones. **From a session's record:** the design state, line 10.
- A decision about a product is made through the coordinator. A change to Process4 itself is made through PROCESS. Each keeps its own record and is its only writer (part 5, section 5). **From a session's record:** the design state, line 48. For PROCESS, **Owner:** "Process changes only happen in a separate process lane call PROCESS that I interact with." (`bob_words_14nov_b.md`)
- The coordinator is his front door. **Owner:** "Yes, the coordinator is the front door." (`bob_words_16_17nov_codex_development.md`)
- **Open (the owner):** he may watch, and sometimes speak to, ARCH and the lanes (**from a session's record:** the design state, line 49). His words: "But interacting with lanes is crucial, as this is where architecture and design decisions are made." (`bob_words_16_17nov_codex_development.md`)
- A marked message given to ARCH or a lane is followed, and passed to the coordinator exactly as typed for recording. He works with a lane through its design pages, and with PROCESS directly. **From a session's record:** the design state, line 49.

## 5. How things are put to the owner

- **Owner:** "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen." (`bob_words_14nov_b.md`, where it goes on "I have not read your working files.")
- A question is put to him inline, in one form: a title; the question; an explanation of the issue; options, each with its own identity; the recommendation and its reasons; and the freedom to set the options aside. **From a session's record:** the design state, line 50. His nearest words: "Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation." (`bob_words_14nov_b.md`)
- No technical question is brought to him. The AI decides it and reports it in one plain line. **Owner:** "Decide technical matters yourself and tell me what you decided." (`bob_words_14nov_b.md`)
- No session assures him that something will work. Each claim put to him says what is proven and what is not, names its source, and calls anything unread or unmeasured unknown. **Owner:** "Do not assure me that something will work. Say what is proven and what is not." (`bob_words_14nov_b.md`) The rest, **from a session's record:** the Foundations (`foundations_tranche_9nov.md`, line 133).
- One standing page always shows everything waiting for him. A notification goes to his phone when something arrives that only he can clear (**from a session's record:** the design state, line 51). **Claude decided:** the coordinator keeps the page and sends the notification; PROCESS and ROOT pass it what is theirs to show.
- He can see each open job's progress and status without speaking to it (part 4, section 9). **Owner:** "I rarely interact with jobs, but seeing their progress and status is important." (`bob_words_16_17nov_codex_development.md`)
- When the process is completely blocked he gets one plain message with a numbered list of what is his to do. In every other case the stop is recorded as a named blocker and other work goes on. **From a session's record:** the record of 13 Nov, line 2.

## 6. Working principles

- **Open (the owner):** every problem is either an architecture bug or an implementation error (**from a session's record:** the design state, line 106). His direction of 2 Nov, as the Foundations record it: "Every problem is an architecture bug" (`foundations.md`, line 38). **Reading:** an architecture bug is corrected by rewriting the part of the design it belongs to, never by appending to it; an implementation error is corrected in the code or text that has it.
- A workaround is not a fix. **From a session's record:** the Foundations (`foundations.md`, line 38).
- Two kinds of refusal are kept apart. An act the permission checker refused is never retried elsewhere. An act a session declined only because its instructions did not name it may be given to a new session whose instructions do. **From a session's record:** the Foundations (`foundations.md`, line 183).
- Workers are the standing way a long-lived role keeps heavy reading out of its own context: a narrow brief, a short answer in a set shape, and the worker ends when its work is done. A brief may hand the worker a decision to make, which it reports with its grounds. No worker is briefed to review another session's work. **Owner:** "the use of highly targeted and structured subagents to do research and complete tasks for the benefit of parents without clogging the parents' context window"; "these workers are also sometimes tasked with making material decisions based on information they gather" (`bob_words_17nov_codex_context.md`); "process4 has no need for subagents to stay alive once their initial scope of work is completed" (`bob_words_16_17nov_codex_development.md`); on review, "O9: agreed" (`bob_words_14nov_c.md`), to the fourth draft's proposal 9. The form of brief and answer, **from a session's record:** the design state, line 116.
- A hard open question gets a session of its own with a written brief and a bounded task, and ends with a written result once the result is usable. **From a session's record:** the design state, line 115. His nearest words: "Maybe we should create a separate session that focuses only on this issue" (`bob_words_14nov_c.md`).
- A session saves its work to the repository before its turn ends. **From a session's record:** the design state, line 134.
- A message from the session that directs a session is an instruction. A message from any other session is information. **From a session's record:** the design state, line 128.

## 7. Known weaknesses of AI sessions

Process4 steps around the situations where a known weakness does harm, and does not rely on repairing the harm afterwards (**from a session's record:** the design state, line 114). For each, the sign that it is near and what the session then does. **Claude decided** this first list; it grows only at PROCESS.

| Weakness | The sign | What the session does |
|---|---|---|
| A full context loses what was read | The fill level nears the stated level, or a natural pause comes | Writes what its successor needs and asks for a refresh (part 4, section 5) |
| A long text is scanned or searched, not read | A text or set is over its maximum; a read comes back cut or refused | Does not act on the part it has. Reads the rest in order, or gives the reading to workers with narrow briefs. If the text is a governing text over its maximum, tells ARCH |
| A claim is made that was not checked | It is about to tell the owner that something works or will work | Says what is proven, by what, and what is not (section 5) |
| Conversation is taken as a decision | The owner says something that sounds decided, without the mark | Asks once whether to record it (section 4) |
| Caution grows the process | It is about to add a test, check, gate, review or stop, or to write a demand into another session's instructions | Does not. Reports a process fault if one exists (part 6, section 6) |
| A refusal is worked around | The permission checker refuses an act | Does not reword it or hand it on. Three refusals in a row stop the session, which is replaced |
| A successor acts from memory it does not have | A session starts as the new holder of a role | Starts only from the shared state and the repository |
| The same correction fails again and again | A job's second correction fails | The job is replaced by a fresh session, which first works out why the corrections were made (part 4, section 10) |
| Work stops with nothing calling for it | It is about to end its turn while work remains that it can do | Goes on. A stop nothing called for is a process fault (part 4, section 10) |
