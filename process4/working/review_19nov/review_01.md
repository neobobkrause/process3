Length: 226 lines. Last section: "22. Product decisions go through the coordinator, each record with one writer".

# Rules in the Process4 design that are not in your own words

Written by Claude, 19 Nov 2026, for Bob. Nothing in the design has been changed.

## What this list is, and how to answer

Every rule in the Process4 design (the seventh draft, in eleven parts) carries a mark saying where it comes from. A rule marked "Owner" is in your own typed words. This list is every rule with any other mark: those Claude chose itself ("Claude decided"); those taken from a record a session wrote, not from your typed words ("From a session's record"); Claude's interpretations of your words that you have not confirmed ("Reading"); and matters the design leaves open for you ("Open (the owner)"). It does not list lines marked only "Unproven", which say what has never been shown to work, nor lines that report facts about a harness, GitHub or Cloudflare.

There are 204 items, in the order of the design's parts. Where the same rule appears in more than one part, it is listed once, at its first place, and the item names the other places.

Each item gives: where the rule is; the design's exact words; what it means in practice; where it came from; your own nearest typed words, quoted exactly with the file they are in (or "None found"); whether it agrees with, goes beyond, or differs from your words; and your three choices.

**To answer,** give the item number and one of: **Accept** (it stands as written), **Change** (say to what), or **Remove**. For example: "12: Accept. 31: Change to ... . 40: Remove." Items you do not mention stay as they are, still unconfirmed by you.

**The records named.** Where an item says a rule came from a record a session wrote, these are the records:
- **Claude's notes of 18 Nov** (`design_state_18nov.md`, "the design state"): written by Claude from your answers in the review of 18 Nov. What you typed that day was not kept.
- **The 13-14 Nov record**: a session's record of your decisions of 13 and 14 Nov, kept in the sixth draft. You called them "my decisions of 13-14 Nov" without seeing its wording.
- **The Foundations** (`foundations.md`, `foundations_tranche_9nov.md`): written by a session from your ledger. Where they quote you, that is counted as your words; their own sentences are not.
- **The ledger lines** (`ledger_lines.md`); **Claude's handoff notes** of 18 and 19 Nov; and **Process3's decision record**.

"Your nearest words" are taken from the files of your typed words in `process4/owner_words/`, and in a few places from your standing approvals in Process3's `CLAUDE.md` or from the Foundations' quotations of you, as named. A tranche is one batch of product work; a pull request is a proposed change that is tested and then added; a slot is room for one building session; a job is one session's work on one part (module) of the product; a walk checks the product against the screens document (internal) or the user journeys (external).


## Part 0. The index and the words used

### 1. The design called "the process4 requirements"
- **Where:** Part 0, section 1, first point.
- **The design says:** "This is the design of Process4, in eleven parts. It is what sessions follow. **From a session's record:** the design state, line 27, calls it "the process4 requirements"; in his words (`bob_words_14nov_b.md`) that phrase names Process4's requirements, not this document."
- **In practice:** If this document counts as "the process4 requirements", every later process change must keep meeting everything in it, including the rules you never ruled on.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 27. Not your typed words.
- **Your nearest words:** "The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval)." (`bob_words_14nov_b.md`)
- **Against your words:** Differs: your phrase names Process4's requirements, not this design document.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 2. Proposed, then on trial, then in force
- **Where:** Part 0, section 2.
- **The design says:** "Process4 is **proposed** now. **From a session's record:** the design state, line 34: it is **on trial** from the owner's acceptance, used for the trial repository and the first real tranche, and **in force** after the first real tranche ends, on his word. He has not ruled on this in typed words."
- **In practice:** Process4 would be tried on the test repository and on the first real batch of product work, and would only become the rule once that batch is finished and you say so.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 34. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 3. Which roles count as long-lived
- **Where:** Part 0, section 6, "Long-lived role".
- **The design says:** "**Claude decided:** every standing role, and a lane that is kept running, is long-lived; a job and a walking session are not."
- **In practice:** ROOT, the watcher, the coordinator, ARCH, PROCESS and a running lane are refreshed with a written handover; a job or a walking session simply ends or is replaced.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Just to name it - all of these sessions may need to stay active beyond the completion of their initial scope of work. So these are truly and fully interactive sessions." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 4. A role's starting text is its starting instructions
- **Where:** Part 0, section 6, "Starting instructions".
- **The design says:** "**Reading:** a role's starting text is the same thing for a standing role, and a role's principles are the rules in that text."
- **In practice:** What you have called a role's principles would be the short text each role's session is started with, held to its size limit.
- **Where it came from:** A reading of your words by Claude, not confirmed by you.
- **Your nearest words:** "limits on the size and complexity of process4's principals of operation" (`bob_words_17nov_codex_context.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 5. What a process fault is
- **Where:** Part 0, section 6, "Process fault".
- **The design says:** "**Claude decided** the wording: a fault in the process itself and not in the product: a rule of this design that cannot be kept, a fault in the tool, or a stop that nothing called for."
- **In practice:** These three kinds of trouble go to PROCESS, where only you can approve a fix; trouble in the product is fixed by the product's own sessions.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 6. What an architecture bug and an implementation error are
- **Where:** Part 0, section 6, "Architecture bug and implementation error".
- **The design says:** "**Reading:** an architecture bug is a fault in the design itself; an implementation error is a fault in code or text that does not follow the design (part 1, section 6)."
- **In practice:** Every problem would be sorted into one of the two kinds, and each kind is mended differently (see the item on part 1, section 6).
- **Where it came from:** A reading by Claude, not confirmed by you.
- **Your nearest words:** None found in your typed words. The Foundations record your direction of 2 Nov as "Every problem is an architecture bug" (`foundations.md`, line 38).
- **Against your words:** Differs from your direction as the Foundations record it.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 7. The shared state is a small fixed set of records
- **Where:** Part 0, section 6, "Shared state".
- **The design says:** "**Claude decided** its form: a small fixed set of records (part 4)."
- **In practice:** What every role needs to know (who holds which role, what work waits, whether you have stopped work) is kept in a few records that are rewritten in place rather than piling up.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "I think that Codex needs to be careful about using github as a communications channel. An earlier version of my development process tool used github for process communication and bookkeep, which bloated the repo and added 1,000's of files that are useless but can't be deleted cleanly." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees with your caution, and goes beyond it.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 8. What a product's process settings file holds
- **Where:** Part 0, section 6, "Process config".
- **The design says:** "**Claude decided** what it holds (each field is in the build text `02-the-forms.md`): the process version it runs on, the default slot number, its lanes, its hosting provider and development account, the folder of the walks' documents, the commands that build, serve and walk the product on one machine, the most external walkers, and the language reader the tool uses."
- **In practice:** Each product has one short settings file, and these are the things it names; among them, the folder where the screens and journeys are kept is a setting rather than a fixed place.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "screens and journeys are kept in docs/development/ux-substrate/ in the product repo" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them; on the folder it differs, leaving to a setting what you named.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 1. Purpose, the owner, his decisions, and working principles

### 9. AI sessions build the product with nobody watching
- **Where:** Part 1, section 1, first point.
- **The design says:** "Process4 is the way AI sessions build a software product for the owner in a GitHub repository, and can do so with nobody watching. **From a session's record:** the record of 13 Nov, line 2."
- **In practice:** The sessions are meant to keep working without you or anyone else at the screen.
- **Where it came from:** A session's record: the 13-14 Nov record, line 2. Not your typed words.
- **Your nearest words:** "I'm looking for you to run your assessment end-to-end without stopping to give me progress reports and ask whether you should continue." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees in spirit.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 10. The one output of the process
- **Where:** Part 1, section 1, second point.
- **The design says:** "Its one output is product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. **From a session's record:** the Foundations (`foundations.md`, line 38)."
- **In practice:** The process is judged only by working product reaching the finished copy fast and cheaply and staying there.
- **Where it came from:** A session's record: the Foundations' own sentence, line 38. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 11. What the owner defines
- **Where:** Part 1, section 1, third point.
- **The design says:** "The owner defines the product: its purpose, audiences, requirements, principles and broad design (**from a session's record:** the Foundations, `foundations.md`, line 32)."
- **In practice:** These five things are yours; everything technical is the AI's.
- **Where it came from:** A session's record: the Foundations, line 32. Not your typed words. (The next sentence, that the AI decides technical matters, is yours.)
- **Your nearest words:** "Decide technical matters yourself and tell me what you decided." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees, and goes beyond them in listing what is yours.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 12. Work goes on while it can be done well
- **Where:** Part 1, section 1, fourth point.
- **The design says:** "Development work continues as long as there is work that can still be done productively, efficiently and safely. **From a session's record:** the design state, line 110."
- **In practice:** Sessions do not stop for a report or a pause while useful work remains.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 110. Not your typed words.
- **Your nearest words:** "Why have you stopped? (That's a real question.)" and "Can you correct the conditions that caused you to stop so that it doesn't happen going forward?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees in spirit.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 13. Where the process stops, and support beyond it
- **Where:** Part 1, section 2; the same rule in part 3, section 8.
- **The design says:** "The process owns what can be proven in the repository and on the machines that run the tests." "Promoting a release to installed sites, rolling one back, and support belong to the product's own procedures and to the owner. Production keys are never in the sessions' environment." "For those three the process provides written procedures (part 3, section 8). The owner, or whoever runs the product, carries them out." Part 3, section 8: "For each product the process keeps a short written procedure for each of three things: promoting a release to installed sites; rolling one back; and handling a problem reported from an installed site."
- **In practice:** Sessions never touch the sites real users use. They write down the steps for putting out a release, going back, and handling a user's problem, and you (or whoever runs the product) carry them out.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, lines 108 and 124. Not your typed words.
- **Your nearest words:** "2. installer and website are outside the tranche" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 14. When you start ROOT
- **Where:** Part 1, section 3, table, first row; also part 4, sections 6 and 7.
- **The design says:** "At each start or restart of development; after any full stop; and, as **Claude decided**, after each edit to his approvals (part 4, section 7) and when the harness's limit on depth is near (part 4, section 6)". Mark: "**From a session's record:** the record of 13 Nov, line 16; "after any full stop", the design state, line 84".
- **In practice:** You start the first session yourself at the start, after everything has been halted, after you change your approvals, and when the chain of sessions has grown too deep.
- **Where it came from:** The first two from sessions' records (the 13-14 Nov record, line 16; Claude's notes of 18 Nov, line 84), not your typed words; the last two Claude's own choice.
- **Your nearest words:** "M10: ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json" (`bob_words_14nov_c.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 15. Telling the coordinator things, and the marks on decisions
- **Where:** Part 1, section 3, table, second row.
- **The design says:** "Tell the coordinator things; give marked decisions and instructions | Whenever he chooses | **From a session's record:** the record of 13 Nov, line 17; the marks, the design state, line 47"
- **In practice:** You talk to the coordinator whenever you like; what you want recorded as a decision you mark as one.
- **Where it came from:** Sessions' records: the 13-14 Nov record, line 17; Claude's notes of 18 Nov, line 47. Not your typed words.
- **Your nearest words:** "Yes, the coordinator is the front door." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees on the coordinator; the marks go beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 16. You approve each tranche's plan before it opens
- **Where:** Part 1, section 3, table, third row; part 3, section 1, first point.
- **The design says:** "Before a tranche opens, ARCH proposes in a few plain lines what it is for and which journeys are expected to complete at its end, naming any journey left out and why. The owner approves or changes it. **From a session's record:** the design state, line 55."
- **In practice:** Before each batch of work starts, ARCH tells you in a few lines what it is for and which user journeys should work at its end, and you approve or change that.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 55. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 17. Changing a permission or rule setting
- **Where:** Part 1, section 3, table, seventh row.
- **The design says:** "Change a permission or rule setting in GitHub or in the hosting account | Very occasionally | **From a session's record:** the record of 13 Nov, line 1"
- **In practice:** Only you change who may do what on GitHub or the hosting account, and rarely.
- **Where it came from:** A session's record: the 13-14 Nov record, line 1. Not your typed words.
- **Your nearest words:** In your standing approvals (Process3's `CLAUDE.md`), sessions may never "change permission or repository settings".
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 18. Renewing a token before it expires, and dated acts on your page
- **Where:** Part 1, section 3, table, eighth row, and the first two points under the table.
- **The design says:** ""before a token expires", **from a session's record:** the design state, line 127". "Each act with a known date appears on his standing page before the date, with the steps." "Every reasonable effort is made to renew a token before it expires, so that no full stop is needed. Once a new token is in place, fresh sessions start with it before the old one expires. A full stop happens only if the token is not replaced in time. **From a session's record:** the design state, line 127. His words on renewal are about Codex only"
- **In practice:** When a key you entered is due to run out, the steps to renew it appear on your page in advance; if you renew it in time, nothing halts.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 127. Not your typed words.
- **Your nearest words:** "It might be reasonable to ask me to be involved in refreshing the token before the 30 day expiration date. But the Codex version of process4 must recognize and cleanly support that act." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them: your words are about Codex only.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 19. Nothing that costs more than the subscription
- **Where:** Part 1, section 3, third point under the table.
- **The design says:** "A harness runs AI sessions only on what the owner's subscription covers. Anything that would cost more comes to him first. **From a session's record:** the design state, line 129. His words on it are a question"
- **In practice:** Nothing is set up that adds a bill beyond your subscription without asking you first.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 129. Not your typed words.
- **Your nearest words:** "Are you in fact designing something that will require additional costs outside of the subscription?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Goes beyond them: your words are a question.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 20. Only messages marked "Decision:" or "Instruction:" are recorded
- **Where:** Part 1, section 4, first and second points.
- **The design says:** "A message of his that begins "Decision:" or "Instruction:" is copied exactly, with its date. Everything else is conversation. **From a session's record:** the design state, line 47." "A session that thinks he has decided something without the mark asks him once whether to record it as a decision. **From a session's record:** the design state, line 47."
- **In practice:** To make something a recorded decision you start the message with "Decision:" or "Instruction:"; if you seem to decide something without it, you are asked once whether to record it.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 47. Not your typed words.
- **Your nearest words:** "Only words I wrote count as my word. Never record your decision or your summary as mine." (`bob_words_14nov_b.md`)
- **Against your words:** Goes beyond them: the two marks are not in your words.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 21. Your latest word replaces your earlier word
- **Where:** Part 1, section 4, fourth point.
- **The design says:** "His latest statement replaces any earlier one, without a question to him. No session sets his older words against his newer ones. **From a session's record:** the design state, line 10."
- **In practice:** When you say something new on a matter, it stands, and no session asks you to square it with what you said before.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 10. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 22. Product decisions go through the coordinator, each record with one writer
- **Where:** Part 1, section 4, fifth point.
- **The design says:** "A decision about a product is made through the coordinator. A change to Process4 itself is made through PROCESS. Each keeps its own record and is its only writer (part 5, section 5). **From a session's record:** the design state, line 48."
- **In practice:** Your decisions about a product are given to and written down by the coordinator; your decisions about the process, by PROCESS.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 48 (the PROCESS half is yours).
- **Your nearest words:** "Yes, the coordinator is the front door." (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
