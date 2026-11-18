# Process4 readiness, 18 Nov 2026: is the design one coherent statement?

Length: 435 lines. Last section: "6. The three answers".

Written by a Claude worker session for the session judging readiness. It reports only what was read.

## 1. What was read, and what was not

- Read in full, every line: `process4/definition/process4_definition_v6.md` (597 lines, 93,937 bytes), called "v6" below.
- Read in full, every line: `process4/working/design_state_18nov.md` (143 lines, 19,928 bytes), called "DS" below.
- Unread: every other file. That includes each file the design state points to: `codex_shortcomings_to_fill.md`, `harness_separation/`, `reading_measurements/RESULTS.md` and `RERUN_PROMPT.md`, `owner_words/`, `evidence/foundations.md`, `evidence/foundations_tranche_9nov.md`, Bob's ledger, and the other files in `readiness_18nov/`. Where a rule depends on one of these, this report says "unread".
- "v6 35" means line 35 of the sixth draft. "DS 62" means line 62 of the design state.

## 2. How the table is built

The sixth draft is cut into 168 parts. A part is one definition, one named paragraph, one list or one question. Every non-blank line of the sixth draft belongs to exactly one part (checked by a count: 398 non-blank lines, 398 covered).

Each part gets one class:

- **STANDS**: nothing in the design state changes the rule the part carries.
- **CHANGED**: the design state changes it. This includes a question or proposal in the sixth draft that the design state has now answered.
- **REMOVED**: the design state takes it out of the design.
- **UNCLEAR**: the two files together do not say what the rule now is.

Three tags mark wording the design state says the design document must not carry. They do not change the class, because the rule itself is not changed:

- [product]: the part states facts of one product (DS 26).
- [host]: the part names one hosting provider (DS 31).
- [harness]: the part names Claude Code or something only Claude Code has (DS 33).

A part is classed by its main rule. Where the design state changes a part but leaves a hole in it, the part is CHANGED here and the hole is listed in section 6, answer 1.

Section B of the sixth draft is Bob's quoted words. DS 29 and DS 30 move all of it out of the design document into a record of decisions ordered by subject, and keep his dated words unedited. The classes given for section B are for the rule each part carries.

## 3. The sixth draft, part by part

### Opening and section A (v6 1-26)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| 0.1 | 1-3 | Title, date, author | STANDS | DS 9 names this draft as the base. |
| 0.2 | 5 | How to read: nothing in force; sections B, N, O and P as the map | CHANGED | DS 29: "carries none of the history of how the design got to its present state." DS 34: "Process4 is proposed (now), then on trial ..., then in force". Still nothing in force. The map no longer shows what is decided or open: the design state settles most of sections N and P. |
| 0.3 | 7 | Whose decision each thing is; ledger answers count | CHANGED | DS 10: "Bob's latest statement replaces any earlier one, without a question to him." DS 28: "Bob's ledger was a worksheet and is retired." DS 47: "A message of Bob's that begins "Decision:" or "Instruction:" is copied exactly, with its date. Everything else is conversation." The ledger is no longer a source; the newest statement rules. |
| 0.4 | 9 | What changed since the fifth draft | REMOVED | DS 29 (no history in the design document). |
| A.1 | 11-13 | What Process4 is for; a tranche reaches main only after the three tests | CHANGED | DS 56: "Every round's walks are partial, the first round included." DS 57: "A full external walk is opt-in. By default it is not made." DS 62: "He then chooses between merging it with its flaws named, with no release from it, and dropping it." A tranche can now reach main after partial walks, or with flaws named on Bob's choice. |
| A.2 | 15-17 | Session: "in Claude Code's cloud" | STANDS [harness] | |
| A.3 | 18 | Pull request | STANDS | |
| A.4 | 19 | Module; today's list of 220 does not fit | STANDS [product] | DS 41 adds that ARCH splits a module whose requirements file nears the maximum. DS 142 lists "files that no module owns" as still to be settled. |
| A.5 | 20 | Job | STANDS | |
| A.6 | 21 | Slot: eight, across the account | STANDS | |
| A.7 | 22 | Tranche: built on the tranche branch, reaches main as a whole | STANDS | DS 141 owes "A worked proposal on branches". |
| A.8 | 23 | Round: jobs, internal walk, deployment, external walk | CHANGED | DS 56. Both walks in a round cover only the areas ARCH names. |
| A.9 | 24 | Internal walk | CHANGED | DS 56; DS 58 says what a flaw is. Bob's sentence is kept; the walk is partial. |
| A.10 | 25 | External walk: "all journeys"; "its own Cloudflare account" | CHANGED [host] | DS 56, DS 57. "All journeys" now happens only in a full walk Bob asks for. |
| A.11 | 26 | Mechanical edit | STANDS | |

### Section B, Bob's decisions (v6 28-169)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| B.1 | 28-40 | Second message of 14 Nov | CHANGED | v6 35 "a tranche only ends when an external walk ... completes without flaws ... So a release is always fully tested and walked successfully." DS 56, DS 57 and DS 62 change when a tranche ends. DS 68: "Any tranche that has ended can be released, on Bob's approval, once an install and an update have each been run and confirmed successful. Neither is walked." The other items stand. |
| B.2 | 42-53 | Third and fourth messages | CHANGED | v6 49 says what a told job does "is still open" and that line 11 "stands". DS 21: "The notice to user modules is a way of saving work, not a guarantee. A notified job checks only the changed parts and runs only the tests that relate to them." v6 53 (the folder) is confirmed by DS 59. |
| B.3 | 55-73 | Answers to the thirteen proposals | CHANGED | Row 2 (only a job or a mechanical edit edits a module): DS 75 "ARCH writes and rewords the requirement text in a module's file". Row 3: settled by DS 21. Row 5: DS 19 "The size of a role's starting text is not a refusal among the tool's tests". Row 7: DS 83 "The watcher is kept, and ROOT starts it." Row 10: DS 57 ""Lists no flaw and leaves out no step that the walk before it made" applies to full walks." Row 13: DS 18 confirms Claude's reading, and DS 16 brings back an install and an update before a release. Rows 1, 4, 6, 8, 9, 11, 12 stand. |
| B.4 | 75-95 | Fifth and sixth messages | CHANGED | v6 83 "installer and site updates wait for a clean development release walk". DS 63: "There is no walk outside a tranche." DS 68: "Neither is walked." There is no release walk now. What the installer and site updates wait for is a hole (answer 1, item 13). |
| B.5 | 97-115 | Words to the session that studied the notification | STANDS | DS 17 and DS 21 repeat them. |
| B.6 | 117-133 | Words of 15 Nov | STANDS | |
| B.7 | 135-169 | The session's record, lines 1 to 24 | CHANGED | Line 1 (Bob's only acts) and line 2 (waits only when blocked): DS 55 "Bob approves or changes it", DS 76 "comes to Bob first", DS 62 "goes on in rounds until Bob says". Line 6: DS 16. Line 11: replaced by DS 21 under DS 10. Line 12: DS 19 and DS 91. Line 14: DS 75. Line 18: DS 68 and DS 108. Line 5 was already corrected inside v6. Lines 3, 4, 7 to 10, 13, 15 to 17, 19 to 24 stand. |

### Section C, who does what (v6 171-239)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| C.1 | 171-186 | Bob's acts | CHANGED [host] [harness] | The design state adds acts: DS 55 (approve each tranche's proposal), DS 57 (ask for a full walk), DS 62 (say when, and choose), DS 76 (rewordings that change the product), DS 90 "Bob rewords his approvals in the process's repository", DS 97 (one question at each new model version), DS 124 "Bob, or whoever runs the product, carries the procedures out", DS 127 (dated acts, token renewal), DS 34 (acceptance, and his word for "in force"). |
| C.2 | 188 | ROOT | CHANGED | DS 83: "The watcher is kept, and ROOT starts it." DS 84: "Bob starts ROOT, and ROOT rebuilds everything from the shared state and the repository." |
| C.3 | 190 | The watcher; who starts it "not yet settled" | CHANGED | DS 83. ROOT starts it. What a takeover does is owed (DS 140). |
| C.4 | 192 | The coordinator | CHANGED | DS 47 (the two marks), DS 48 "Each keeps its own record and is its only writer", DS 49 "He may watch and sometimes speak to ARCH and to lanes", DS 50 (one form for a question), DS 51 (standing page, phone notice), DS 61 (account after each round). |
| C.5 | 194 | ARCH | CHANGED | DS 82: "Whatever has one right answer is done by the process's tool: who takes a free slot, when a notice is sent and to whom, whether a round's jobs are done. ARCH's session keeps what needs judgment." DS 75 (writes requirement text). DS 55, DS 56 (proposes the tranche, names the areas). DS 60 "ARCH's session makes the development deployment." DS 81, DS 86, DS 125, DS 41. |
| C.6 | 196 | A job | STANDS | DS 75 adds that the job marks a requirement met in its own pull request. |
| C.7 | 198 | A worker; uses taken from the ledger | CHANGED | DS 116: "Workers are the standing way a long-lived role keeps heavy reading out of its own context ... A brief may hand the worker a decision to make, which it reports with its grounds." |
| C.8 | 200 | Lanes: "proposed, and waiting for your answers" | UNCLEAR | Reading one: DS 9 makes the sixth draft the design, and DS 49, 58, 85 and 86 speak of lanes as existing, so the lane rules at v6 202-229 are the design. Reading two: v6 200 says "nothing here is your decision until you say so"; the design state records answers to questions 17, 18 and 19 only; so the rest of the lane text is still a proposal. |
| C.9 | 202 | What a lane is | STANDS | Subject to C.8. |
| C.10 | 204 | Which lanes; "For Civicsmith the lanes are ..." | STANDS [product] | DS 85 agrees that ARCH starts them. |
| C.11 | 206 | One session per lane | STANDS | |
| C.12 | 208 | Qualification | STANDS | |
| C.13 | 210 | What a lane decides | STANDS | |
| C.14 | 212 | Questions reach a lane "only through ARCH"; ARCH "keeps the final say" | CHANGED | DS 49: "A marked message given to ARCH or a lane is followed ... He works with a lane through its design pages". DS 86: "A lane decides design in its area. ARCH decides whether and when a design is built and whether it can be built as given. A design ARCH cannot build goes back to the lane." Bob also reaches a lane; ARCH's say is about building, not about the design. |
| C.15 | 214 | How a lane's work is merged | STANDS | |
| C.16 | 216 | The UX lane keeps the two walk documents | CHANGED | DS 59: "pages kept in the product repository's folder. During a tranche they change only to correct an error a walk has shown". DS 58: "Where ARCH judges the document wrong and the product right, the UX lane corrects the document." |
| C.17 | 218 | PROCESS | STANDS | DS 85, DS 49 agree. DS 115 adds lanes of its own. |
| C.18a | 220-222 | A lane takes no job slot; "three for Civicsmith" | STANDS [product] | |
| C.18b | 223-225 | Lane depth; one session per lane; fresh lane session | STANDS | |
| C.18c | 226 | "Every question ARCH puts to a lane, and every answer, is written in the shared record." | UNCLEAR | DS 118: "What sessions say to each other, and the process's running records, never build up as files or commits in a repository." Reading one: the questions and answers are no longer kept. Reading two: they are kept in one record rewritten in place, so only the latest stays. |
| C.18d | 227-229 | Tranche report lists UX changes; when a lane ends; PROCESS follows lane rules | STANDS | DS 59 and DS 61 add the same naming after each round. |
| C.19 | 231 | Walking sessions use the job slots | STANDS | DS 60 agrees. |
| C.20 | 233 | Model and effort | STANDS | DS 129 adds the subscription limit. |
| C.21 | 235 | Shared state: where it is and the six things it holds | UNCLEAR | DS 118: "the shared state is a small fixed set of records, each rewritten in place, and messages are not stored as files." DS 142 lists "what the shared state holds" among matters still to be settled. Reading one: the six things at v6 235 stand, in the shape DS 118 gives. Reading two: what it holds is open. v6 235 also puts "your instructions quoted exactly" there, while DS 48 gives the coordinator and PROCESS each a record of their own. |
| C.22 | 237 | Modules with requirements and no code; "29 among the 220 ... left by the size cap (proposed for ending)" | CHANGED [product] | DS 41: "A module's requirements file is kept under the maximum as a rule ARCH applies. When a file nears it, ARCH splits the module into two real modules." The cap is not ended; a split now makes real modules. |
| C.23 | 239 | Three levels deep; none starts its own replacement | STANDS | DS 80 "It asks its parent" agrees. |

### Section D, how work flows (v6 241-281)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| D.1 | 241-252 | The life of one job, eight steps | CHANGED | DS 82 (quoted at C.5). Who takes a slot, when a notice goes and to whom, and whether the jobs are done are the tool's work, not ARCH's judgment. |
| D.2 | 254 | The eight slots | STANDS | Two products sharing them is still not settled (v6 498). |
| D.3 | 256 | When a module's work is finished | UNCLEAR | Reading one: v6 256 stands and the tool applies it (DS 82). Reading two: it is open, because DS 142 lists "when a round's jobs are done" among matters still to be settled. |
| D.4 | 258 | A job stopped by another module's flaw | STANDS | |
| D.5 | 260 | The mechanical edit | STANDS | v6 itself leaves the test run on it undecided ("either ... or"). |
| D.6a | 262-266, 269 | A round: jobs, internal walk, deployment and external walk | CHANGED | DS 56: "ARCH names the areas a round's updates affect before each walk. A partial walk is without flaws when it lists no flaw in the areas it was given." DS 58 (what a flaw is; the rest is an observation). |
| D.6b | 267 | "The tranche ends only when an external walk completes without flaws." | UNCLEAR | Reading one: the tranche ends when one round's partial external walk lists no flaw in the areas it was given (DS 56). Reading two: it ends only when the journeys named before it opened have completed (DS 55: "which journeys are expected to complete at its end"). By default no full walk is made (DS 57), and neither file says what shows that the named journeys complete. |
| D.7 | 271 | Who runs a walk and the deployment (open in v6) | CHANGED [host] | DS 60: "Walking sessions make both walks ... ARCH's session makes the development deployment." |
| D.8 | 273 | Where the walks' documents are; three journey lists | CHANGED [product] | DS 59 (pages in the product repository's folder). DS 143: "For the Civicsmith conversion plan: which journey list counts." |
| D.9 | 275 | What "without flaws" means | CHANGED | DS 57 keeps the v6 meaning for full walks only. DS 56 gives partial walks their own. |
| D.10 | 277 | A tranche that will not come clean: "not defined" | CHANGED | DS 62: "A tranche that does not come clean goes on in rounds until Bob says. He then chooses between merging it with its flaws named, with no release from it, and dropping it." |
| D.11 | 279 | The tranche merges into main as a whole | CHANGED | DS 62 adds the merge with flaws named. DS 70 adds the urgent fix (a hole: answer 1, item 15). |
| D.12 | 281 | A release | CHANGED | DS 68 (quoted at B.1). DS 71: "Built files are never committed. They are built at each walk, deployment and release." DS 124 (written procedures and release notes). |

### Sections E to H (v6 283-398)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| E.1 | 283-289 | The three tests, Bob's words | CHANGED | DS 16: "Before a release, an install and an update are each confirmed to have succeeded. Nothing more". Three tests, plus two confirmations before a release. |
| E.2 | 291 | Module tests | CHANGED | DS 17: "Module tests give appropriate coverage of the code, demonstrate correct results, show that error conditions are properly identified and communicated, and check bounds ... This is a duty of the job, held by its instructions; nothing measures it." |
| E.3 | 292 | Internal walk; "or at any time on your word" | CHANGED | DS 63: "the sixth draft's internal walk "at any time on your word" is removed." DS 56 (partial). |
| E.4 | 293 | External walk | CHANGED | DS 56, DS 57, DS 62. |
| E.5 | 295 | The uses check reads tests too; 122 pairs to correct | STANDS [product] | |
| E.6 | 297 | Tests and steps exist only to prove a product requirement | STANDS | |
| E.7 | 299 | The tool's own tests, "the size limit on each role's starting text among them" | CHANGED | DS 19 (quoted at B.3). DS 20 confirms the rest. |
| F.1 | 301-309 | The notification: what it is | STANDS | |
| F.2 | 311-317 | What it cannot do | STANDS | DS 21 agrees. |
| F.3 | 319-326 | What counts as a change to the interface | STANDS | |
| F.4 | 328-338 | How it is found; who is told; the two refusals | STANDS | |
| F.5 | 340-350 | Claude decided, nine items | STANDS | Items 6 and 7 name TypeScript and JavaScript (answer 3). |
| F.6 | 352-356 | Still open, three items | CHANGED | Item 1: DS 21 gives the rule; DS 139 owes "A design for how a notified job picks the tests that relate to a changed entry." Items 2 and 3 are still open (DS 142: "the notification's two smaller open parts"). |
| F.7 | 358-362 | Proven and not proven | STANDS | |
| G.1 | 364-366 | A job fails its tests | STANDS | |
| G.2 | 368 | A session dies or fills up | CHANGED | DS 80: "Each long-lived role is refreshed on purpose, at a natural pause in its work or at a stated fill level, whichever comes first. It asks its parent. Its successor starts only from the shared state and the repository." |
| G.3 | 370 | The process itself has a fault | STANDS | DS 92, DS 126 agree. |
| G.4 | 372 | The process is completely blocked | CHANGED | DS 50, DS 51: "One standing page always shows everything waiting for Bob. A notification goes to his phone when something arrives that only he can clear." |
| G.5 | 374 | A stop on Bob's word | CHANGED | DS 134: "A stop on Bob's word takes effect in the turn in which a session receives it." DS 84: after a full stop the one way back is Bob starting ROOT. |
| H.1 | 376-380 | How the process is changed, Bob's words | STANDS | |
| H.2 | 382 | The rule PROCESS works under | STANDS | |
| H.3 | 384-387 | What follows | STANDS | |
| H.4 | 389 | Two more rules for PROCESS | STANDS | DS 133 adds one use of "no change". |
| H.5 | 391-398 | How PROCESS is started and reached | CHANGED | DS 92: "A process fault goes from ARCH to the coordinator to PROCESS ... its description is written once by the session that met it and passed on unchanged." DS 47 sets the mark for an approval. |

### Sections I and J (v6 400-438)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| I.1 | 400-402 | Permission management preserved | CHANGED | DS 19: "the start-up comparison of Bob's approvals is not kept as a check." DS 91: "His approvals and the list of forbidden commands are protected by the permission checker alone." |
| I.2 | 404 | Auto mode and the checker | STANDS [harness] | |
| I.3 | 406 | Standing approvals live in CLAUDE.md | UNCLEAR [harness] | Reading one: v6 183 and 406 stand (CLAUDE.md in the product's repository and the process's). Reading two: it is open, because DS 141 owes "A worked proposal on branches and where Bob's approvals live, with each act asked of him." |
| I.4 | 408 | After an edit: a long-lived session compares and does nothing | CHANGED | DS 19: "An edit to his approvals goes with a restart of ROOT by the one way back (section 8)." The comparison is gone. What the edit does to sessions already running is owed (DS 142). |
| I.5 | 410 | The deny list | STANDS [harness] | |
| I.6 | 412 | GitHub's own rules | STANDS | DS 90: "Nothing enforced by GitHub is added." |
| I.7 | 414 | How a session must be started; instructions "name every act it may take" | CHANGED [harness] | DS 43 gives a provisional limit: "a role's starting text, 4,096 bytes and at most ten rules". DS 109: "An act a session declined only because its instructions did not name it may be given to a new session whose instructions do." |
| I.8 | 416 | ROOT's first act is to fetch the newest copy | STANDS [harness] | The account of 5 and 8 Nov is history (DS 29). |
| I.9 | 418 | The process reaches a session as a read-only copy at one fixed version | STANDS | |
| I.10 | 420 | Working rules because of the checker | CHANGED | DS 109: "Two kinds of refusal are kept apart. An act the permission checker refused is never retried elsewhere." |
| I.11 | 422 | Wording changes only Bob can make | CHANGED [harness] | DS 90 adds one rewording. DS 71 settles the built-files wording. The full list is owed (DS 141). |
| I.12 | 424 | Proven and not proven | STANDS | |
| J.1 | 426-428 | The line-by-line account of 288 lines "will be redone" | UNCLEAR | Reading one: no longer owed, since the ledger is retired (DS 28) and DS section 15 does not list it. Reading two: still owed, since nothing in the design state removes the promise. |
| J.2 | 430 | Checks that stay; the job commits built files | CHANGED | DS 19 removes the approvals comparison. DS 71: "Built files are never committed." |
| J.3 | 432 | Your ledger | REMOVED | DS 28: "Bob's ledger was a worksheet and is retired." |
| J.4 | 434 | Kept, by theme; "one writer per file"; "at most ten rules" | CHANGED [harness] | DS 75 gives a module's requirements file two writers (ARCH writes the text, the job marks it met). DS 38 to DS 43 add maximum sizes. |
| J.5 | 436 | GitHub's published limits: "Claude has not yet looked up what that way was" | CHANGED | DS 142: "it used 80 to 90% of the published limits and obeyed GitHub's rate-limit responses". The Foundations file it cites is unread. |
| J.6 | 438 | The tranche report | STANDS | DS 64: "stands as the sixth draft has it". |

### Sections K and L (v6 440-481)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| K.1 | 440-444 | Layers end | STANDS | |
| K.2 | 445 | Full regression ends; Bob's word "still runs the internal walk at any time" | CHANGED | DS 18: "There is no full regression, on request or otherwise." DS 63 removes the walk on his word. |
| K.3 | 446 | Deliberate-fault sampling ends | STANDS | |
| K.4 | 447 | Fresh-reviewer review ends | STANDS | |
| K.5 | 448-454 | The other checks that could stop work, "separate install and upgrade tests before a release" among them | CHANGED | DS 18 confirms the list as ended. DS 16 and DS 68 bring back an install and an update, run and confirmed, before a release. |
| K.6 | 455 | 24 live sessions becomes eight | STANDS | |
| K.7 | 456 | Installer and website outside the tranche | STANDS | |
| K.8 | 457 | Parts of kept lines | STANDS | |
| K.9a | 459-461 | The first health number, proposed for ending | CHANGED | DS 96 leaves out "The count of false "done" claims". Ended. |
| K.9b | 461, second sentence | The second health number, the cost of each surviving pull request, "stays" | UNCLEAR | DS 96 leaves out "per-job records of reading and cost". A job is one pull request (v6 20). Reading one: the number stays as a figure in the account and report (DS 61: "cost where it can be read"). Reading two: it went with the per-job cost records. |
| K.10 | 462 | Three measurements proposed for ending | CHANGED | DS 96 ends two. DS 82 keeps the third: "The share of ARCH's work that is passing things on is measured on the first tranche." |
| K.11 | 463 | Two duties at each model release, proposed for ending | CHANGED | DS 97: "PROCESS puts one question to Bob about which parts of the process ... may no longer be needed. Nothing is removed or tried unless he says so." |
| K.12 | 464 | Two more duties stay | STANDS | |
| L.0 | 466-468 | Items 1 to 8 and 10 are proposals | CHANGED | DS 96 and DS 41 answer them. |
| L.1 | 470 | The job's written receipt | CHANGED | DS 96. Ended. |
| L.2 | 471 | The set-up check before a job starts | CHANGED | DS 96. Ended. |
| L.3 | 472 | The size cap on a requirements file, proposed for ending | CHANGED | DS 41 (quoted at C.22). Not ended: kept as a rule ARCH applies. "Nothing refuses a job or a merge." |
| L.4 | 473 | Recording reading list and cost; the cost alarm | CHANGED | DS 96. Ended. |
| L.5 | 474 | The oversized-file check and the record check | CHANGED | DS 96. Ended. |
| L.6 | 475 | The fixed-format job record | CHANGED | DS 96. Ended. |
| L.7 | 476 | Every rule cites a measured failure | CHANGED | DS 96. Ended. |
| L.8 | 477 | The line-by-line test of instruction files | CHANGED | DS 96. Ended. DS 38 to DS 43 put maximum sizes in its place. |
| L.9 | 478 | The size limit on a role's starting text "is among the tool's tests" | REMOVED | DS 19: "not a refusal among the tool's tests; it is kept short by the rule in section 3." |
| L.10 | 479 | The reading audit | CHANGED | DS 96. Ended. |
| L.11 | 480 | The start-up comparison of approvals, "Kept" | REMOVED | DS 19. |
| L.12 | 481 | Deploy tokens as settings of the Claude cloud environment; tests in two parts | STANDS [harness] [host] | DS 142 lists "who can read the deploy token" as still to be settled. |

### Sections M to O (v6 483-536)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| M.1 | 483-485 | Where the work is kept | STANDS | DS 101 repeats it. |
| M.2 | 486 | The new tool "does only this": six things | CHANGED | DS 82 adds deciding who takes a slot, when and to whom a notice goes, and whether a round's jobs are done. DS 132: "the tool removes the note when that comes true." |
| M.3 | 487 | No role texts, no PROCESS lane | STANDS | |
| M.4 | 488 | The product's repository is not converted | REMOVED | DS 26: "Civicsmith's own facts and conversion steps go to a separate Civicsmith conversion plan." |
| M.5 | 489-491 | Nothing is built for ... | STANDS | |
| N.1 | 493-497 | The notification: what is still open | CHANGED | As F.6. |
| N.2 | 498 | How two products share the eight slots | STANDS | Still not settled. The design state is silent. |
| N.3 | 499 | Who starts the watcher | CHANGED | DS 83. ROOT. |
| O.1 | 501-503 | "Nothing here is in force until it has run on a real tranche with the two health metrics measured" | CHANGED | DS 34: "on trial (from Bob's acceptance, used for the trial repository and the first real tranche), then in force (after the first real tranche ends, on Bob's word)." DS 96 drops the first metric. |
| O.2 | 505 | Can be tried with nothing asked of Bob | STANDS | |
| O.3 | 507-520 | The trial in process3-probes | STANDS [host] | DS 83 and DS 138 add two things to it. |
| O.4 | 522-527 | Only the first real tranche can show | STANDS | |
| O.5 | 529-536 | Risks with no trial | STANDS [product] | DS 90 confirms the first. |

### Section P, still open with Bob (v6 538-595)

| Part | v6 lines | What it is | Class | Design-state line, and what the part now means |
| --- | --- | --- | --- | --- |
| P.0 | 538-540 | "Questions ... you have not yet answered" | CHANGED | DS 10: "do not reopen anything settled here." Most are answered. |
| P.1 | 542-544 | What each walk is measured against; which journey list | CHANGED [product] | DS 59: pages in the folder. DS 143 sends the journey list to the Civicsmith conversion plan, still owed. |
| P.2 | 545 | What a tranche contains | CHANGED | DS 55: "ARCH proposes in a few plain lines what it is for and which journeys are expected to complete at its end, naming any journey left out and why. Bob approves or changes it." |
| P.3 | 546 | A tranche that will not come clean | CHANGED | DS 62. |
| P.4 | 547 | Which journeys count | CHANGED [product] | DS 55. |
| P.5 | 548 | Who runs the walks | CHANGED | DS 60. |
| P.6 | 550-552 | Whether anything physical stands behind the rule | CHANGED | DS 90: "Bob rewords his approvals in the process's repository to say a process change is merged only on his word given at PROCESS. Nothing enforced by GitHub is added." |
| P.7 | 554-556 | Bob's own acts in converting the repositories | STANDS | Still owed (DS 141). |
| P.8 | 557 | How new work is written into a module | CHANGED | DS 75. |
| P.9 | 559-561 | Which reading of "a clean development release walk" | CHANGED [host] | DS 68: "Neither is walked." DS 63. |
| P.10 | 562 | Whether "with AI on" holds before installer and website are updated | UNCLEAR | Neither file mentions it after v6. Reading one: DS 63 and DS 68 end it, since there is no walk at a release. Reading two: it lives on as a matter of which journeys ARCH names for a tranche (DS 55). |
| P.11 | 563 | Whether an upgrade is walked before a release | CHANGED | DS 68: run and confirmed, not walked. |
| P.12 | 564 | Where flaws go from a walk after the tranche | CHANGED | DS 63: no such walk. DS 69 (a Reading): an install or update fault "becomes work in the next tranche". |
| P.13 | 566-568 | The seven proposals (pointer) | CHANGED | See P.25. |
| P.14 | 569 | Which document governs | CHANGED | DS 27: "The design document is "the Process4 requirements" and is what sessions follow." DS 28. |
| P.15 | 570 | Whether a job may commit built files | CHANGED | DS 71. Never. |
| P.16 | 571 | Rewording a requirement | CHANGED | DS 76: "A rewording that changes what the product does comes to Bob first. One that only says the same thing more clearly is made, and told to him in the account after the round." |
| P.17 | 573-575 | Who starts a lane | CHANGED | DS 85: "ARCH starts a product's design lanes. ROOT starts PROCESS." |
| P.18 | 576 | PROCESS and the two triage lanes | CHANGED | DS 63: "There are no triage lanes." |
| P.19 | 577 | Whether Bob works with design lanes directly | CHANGED | DS 49. |
| P.20 | 578 | Which lanes Civicsmith begins with | REMOVED | DS 26. Not answered in either file. |
| P.21 | 579 | Bob's approvals name "BOB" | STANDS | Still open. The design state is silent. |
| P.22 | 581-583 | Line 11 against the words of 15 Nov | CHANGED | DS 21, under DS 10. |
| P.23 | 584 | Tests for the process's own tool | CHANGED | DS 20 states Claude's reading as part of the closed ruling. |
| P.24 | 585 | A product question (a member's Claude sign-in) | REMOVED | DS 26. |
| P.25 | 587-595 | The seven proposals for the 33 lines | CHANGED | 1: DS 96 and DS 34. 2: DS 96 ends two, DS 82 keeps the third. 3: DS 97. 4, 5, 7: DS 96. 6: DS 41 keeps the size cap as a rule; DS 96 ends the other two. |

## 4. New matter: design-state rules with no place in the sixth draft

Each of these has no part of the sixth draft to attach to. A builder finds it only in the design state.

Documents and wording
- DS 25, 28: two documents, a design document and a background document.
- DS 26: the design document names no product; a separate Civicsmith conversion plan.
- DS 27: the design document is "the Process4 requirements".
- DS 29, 30: a record of decisions ordered by subject, rewritten in place, each rewritten entry shown to Bob once.
- DS 31: no hosting provider in the body; neutral terms; a table for each hosting provider.
- DS 32, 33: the Codex harness; harness-neutral terms; a table for each harness. The sixth draft never mentions Codex (checked by search).
- DS 34: three stages: proposed, on trial, in force.

Reading in full
- DS 38 to 43, DS 120: a measured maximum size for every text and set of texts; the Codex maximums; a fill level; each governing text stating its length and last section; four provisional values; the yardstick for choosing them.

Bob's words and what reaches him
- DS 47: the marks "Decision:" and "Instruction:".
- DS 50, 51: one form for a question; a standing page; a notice to his phone.
- DS 61: an account after each round.
- DS 117: no session assures him something will work.
- DS 119: he can see each job's progress; sessions grouped under a product; finished sessions archived.
- DS 127: his dated acts shown ahead of time; token renewal.

Tranche, walks and release
- DS 55: ARCH's proposal before a tranche opens.
- DS 56, 57: partial walks; the opt-in full external walk.
- DS 58: the three kinds of flaw; observations.
- DS 59: the walk documents change during a tranche only to correct an error a walk has shown.
- DS 70: the urgent fix.
- DS 108, 124: where the process stops; written procedures for promoting, rolling back and support; notes with each release.
- DS 131: where a change's effect is in doubt, the walks exercise that workflow.

Sessions, tool and records
- DS 80: refresh on purpose at a pause or a fill level.
- DS 82: the tool does whatever has one right answer.
- DS 84: one way back after a full stop.
- DS 114: for each known weakness of AI sessions the design names the sign and what the session then does.
- DS 115: Process4 develops itself; PROCESS's own lanes; a session of its own for a hard question.
- DS 118: nothing builds up as files or commits; the shared state is a fixed set of records.
- DS 125: one page per product ranking its kinds of governing text.
- DS 126: a stop nothing called for is a process fault.
- DS 128: a message wakes its receiver at once; instruction against information.
- DS 129, 130: subscription only; each harness's files kept apart.
- DS 132, 133, 134: what ends a standing note; the tool guards against mistakes only; work saved before a turn ends.
- DS 106, 107, 110: architecture bug or implementation error; a workaround is not a fix; work continues while there is work.

## 5. Lines inside the design state that pull against each other

1. **What "the design" is.** DS 9: "The design is the sixth draft ... as amended by everything below." DS 5: "It is not the design document." DS 27: "The design document is "the Process4 requirements" and is what sessions follow." DS 26, 29, 31 and 33 set rules for the design document that the sixth draft does not meet (it names Civicsmith, Cloudflare and Claude Code, and carries history). So the design state both names the sixth draft as the design and describes a design document that is neither of the two files.
2. **Maximum size against the design itself.** DS 38: "Every text a session must read in full ... is kept below a measured maximum size." DS 43 gives a provisional 24,000 bytes for a single text. The sixth draft is 93,937 bytes (measured). DS 27 says the design document is what sessions follow.
3. **A flawed tranche and release.** DS 62: "merging it with its flaws named, with no release from it". DS 68: "Any tranche that has ended can be released". Neither says whether a tranche merged with flaws has "ended", or whether the next tranche, built on a main branch that now holds those flaws, can be released.
4. **Closed rule, owed design.** DS 14 and DS 21 give "A notified job ... runs only the tests that relate to them" as a closed ruling. DS 139 owes "A design for how a notified job picks the tests that relate to a changed entry."
5. **Long-lived and short-lived.** DS 81: "ARCH is long-lived." DS 127: "Sessions other than ROOT and the watcher are relatively short-lived". They meet only through a Reading at DS 127 that Bob has not confirmed.
6. **Refresh of ROOT.** DS 80: "Each long-lived role is refreshed on purpose ... It asks its parent." DS 127 treats ROOT and the watcher as the sessions that last. ROOT has no parent session (Bob starts it, DS 84).
7. **Nothing builds up, yet things must be saved.** DS 118: "messages are not stored as files" and records "never build up as files or commits". DS 128: "Whatever the receiver needs is saved before the message is sent." DS 92: a fault's description "is written once ... and passed on unchanged." DS 80: a successor "starts only from the shared state and the repository." Neither file says where the saved content goes.
8. **Settled, yet unconfirmed.** DS 10: "do not reopen anything settled here." DS 12: "Reading:" marks an interpretation "Bob has not yet confirmed." Eight rules are Readings: DS 40, 43, 69, 106, 115, 126, 127, 131. The four provisional sizes (DS 43) and the meaning of a successful install and update (DS 69) are among them.
9. **Marked words against this file's own source.** DS 47: only a message beginning "Decision:" or "Instruction:" is a decision; "Everything else is conversation." DS 5 says the file is written "from Bob's answers in the review session", and DS 43 quotes an unmarked sentence as his word. The file does not say whether his answers of 18 Nov carried the mark.
10. **Every round partial, and a full walk.** DS 56: "Every round's walks are partial". DS 57 allows a full external walk in a round on Bob's asking. DS 57 also says "the tranche ends only if it is clean" without saying whether, after that walk finds flaws, the full walk is made again.
11. **Flaws outside the given areas.** DS 56: a partial walk is without flaws "when it lists no flaw in the areas it was given." DS 58: a flaw is any of three things, and only "anything else" is an observation. A journey that fails outside the given areas is a flaw by DS 58 and does not count by DS 56.
12. **The walk documents during a tranche.** DS 59: "During a tranche they change only to correct an error a walk has shown". DS 49: Bob "works with a lane through its design pages" and a marked message to a lane "is followed". DS 86: "A lane decides design in its area."
13. **Whose procedures.** DS 108: promoting, rollback and support "belong to the product's own procedures and to Bob". DS 124: "For each product the process keeps a short written procedure". Neither says which role writes them.
14. **Work continues, and a tranche waits.** DS 110: "Development work continues as long as there is work that can still be done". DS 55: before a tranche opens Bob "approves or changes" the proposal. DS 61 says of the round account "Nothing waits on it"; no such line is given for DS 55.
15. **Named blanks.** DS 138: "The values of the maximums, to fill the design's named blanks." The sixth draft has no such blanks. The design with blanks is neither of the two files.
16. **Nothing more, and before-it-stands steps.** DS 16: "Nothing more: no further test phases, gates or reviews." DS 30: "A rewritten entry is shown to Bob once before it stands." DS 55 and DS 76 put a proposal and some rewordings to Bob first. DS 16 sits under "Testing", so it may be read as about tests only; the file does not say.

## 6. The three answers

### Answer 1. Could a builder who read both files in full tell, for every part of the process, what the rule is?

No. The places where they could not, each with its evidence:

*Parts classed UNCLEAR in section 3 (nine)*

1. Whether the lane rules are the design or still a proposal (v6 200; DS 9, 49, 85, 86).
2. Whether lane questions and answers are recorded (v6 226; DS 118).
3. What the shared state holds, and where Bob's instructions sit (v6 235; DS 48, 118, 142).
4. When a module's work, and so a round's jobs, are done (v6 256, 265; DS 82, 142).
5. When a tranche ends (v6 267; DS 55, 56, 57).
6. Where Bob's approvals live, and on which branches (v6 183, 406, 414; DS 141).
7. Whether the line-by-line account of Bob's 288 lines is still owed (v6 428; DS 28).
8. Whether the second health number stays (v6 461; DS 61, 96).
9. Whether "with AI on" holds before a release (v6 562; DS 55, 63, 68).

*Holes inside parts the design state changed*

10. A flaw of the three kinds found outside a partial walk's areas: does it hold the tranche (DS 56, 58).
11. A full external walk that finds flaws: made again, or once (DS 57).
12. A tranche merged with flaws: has it "ended", and what later release may carry (DS 62, 68).
13. What a release is as an act of the process. v6 158 says a public release means updating the installer and a website page; v6 83 has those wait for "a clean development release walk"; DS 63 and 68 say there is no such walk; DS 108 puts promoting to installed sites with the product and Bob and says "production keys are never in the sessions' environment". Reading one: on Bob's approval ARCH publishes the release, installer and website page included. Reading two: the process stops at a built and approved release, and Bob carries out the rest from the written procedure.
14. The install and the update: who runs them, and what an update is run against when no earlier release exists (DS 68; DS 69 is a Reading).
15. An urgent fix while a tranche is open. v6 279: "The main branch never moves while a tranche runs." DS 70: "An urgent fix is a tranche whose content is that fix alone." Reading one: one tranche at a time, so the fix waits or the open tranche is set aside. Reading two: the fix runs beside the open tranche and main moves under it.
16. How ROOT and the watcher are refreshed, and what a takeover does (v6 190, 239, 368; DS 80, 127, 140).
17. Who starts a job session: ARCH (v6 248) or the tool (v6 486 "start the next job"; DS 82).
18. How ARCH's requirement text reaches the tranche branch, which "takes a change only by pull request with its tests passing" (v6 412; DS 75).
19. Where new UX design is written while a tranche runs (v6 194 "prepares what the next round or tranche needs"; DS 59).
20. Where the content of messages and handovers is saved (DS 80, 92, 118, 128).
21. Whether "every requirement is tested at the module's interface and proven met" (v6 291) still binds a job beside DS 17's "appropriate coverage of the code".
22. Which tests run when a notified job's pull request is marked ready, and what the merge needs (v6 291, 412; DS 21, 139).
23. What an edit to Bob's approvals does to sessions already running, now the comparison is gone (v6 408; DS 19, 142).
24. Who starts PROCESS's own lanes (a Reading) and the one-question sessions (DS 115).
25. Which role writes and keeps the release procedures and release notes (DS 108, 124).
26. Who keeps the standing page and where it is (DS 51, 127).
27. The known weaknesses, their signs and what a session then does: DS 114 says the design names them; neither file names one, and DS section 15 does not list it as owed.
28. The maximum sizes: provisional, resting on a Reading, from a measurement Bob "judged ... too weak to rely on" (DS 39, 43, 138). The measurement files are unread.
29. The Codex side: DS 32 and 33 call for tables and noted shortcomings; neither file has them. The list file is unread.
30. Which rules are firm: the eight Readings (conflict 8).

*Left open by the sixth draft and not answered by the design state*

31. How two products share the eight slots (v6 498).
32. Which test run a mechanical edit needs: every touched module's tests, or none (v6 260).
33. Who is told when the module list changes; a module that declares a use no code makes (v6 355-356; DS 142).
34. Bob's own acts in converting the repositories; the approvals' wording "BOB" (v6 556, 579; DS 141).

*Named by the design state itself as owed (DS 138 to 143)*

35. A second measurement of the maximums; the notified job's test choice; the watcher's takeover; branches and approvals; and ten technical matters: when a round's jobs are done, who can read the deploy token, who decides an interface between two modules, files no module owns, which copy a job's tests run against, what the shared state holds, loops with no end, an approvals edit during a round, the account suspension of 6 Nov, the notification's two open parts. Also, for the conversion plan, which journey list counts.

### Answer 2. How much of the sixth draft is no longer the design?

Counts of the 168 parts (section 3):

| Class | Parts | Non-blank lines of v6 | Bytes of v6 |
| --- | --- | --- | --- |
| STANDS | 66 | 158 | 34,598 |
| CHANGED | 86 | 224 | 53,180 |
| REMOVED | 7 | 7 | 3,084 |
| UNCLEAR | 9 | 9, and one sentence of line 461 | 2,873 |

So 102 of 168 parts (61 percent) are changed, removed or unclear, and they hold 240 of the 398 non-blank lines. The line and byte figures overstate the change: a part counts as CHANGED when one sentence in it is changed. Of the 66 parts that stand, 11 carry a tag (product, host or harness wording that DS 26, 31 or 33 says the design document must not carry as written).

Where the change falls: section P (questions) has 21 of 26 parts changed; section L, 10 of 13; section D, 8 of 13; section C, 9 of 26. Section F (the notification) and section H (how the process is changed) stand almost whole: one part changed in each.

CHANGED line ranges: 5, 7, 11-13, 23-25, 28-40, 42-53, 55-73, 75-95, 135-169, 171-186, 188, 190, 192, 194, 198, 212, 216, 237, 241-252, 262-266, 269, 271, 273, 275, 277, 279, 281, 283-289, 291-293, 299, 352-356, 368, 372, 374, 391-398, 400-402, 408, 414, 420, 422, 430, 434, 436, 445, 448-454, 459-463, 466-468, 470-477, 479, 486, 493-497, 499, 501-503, 538-540, 542-548, 550-552, 557, 559-561, 563, 564, 566-571, 573-577, 581-584, 587-595.

REMOVED lines: 9, 432, 478, 480, 488, 578, 585.

UNCLEAR lines: 200, 226, 235, 256, 267, 406, 426-428, 461 (second sentence), 562.

Beyond these classes, DS 29 takes history out of the design document. History is spread through parts of every class (for example v6 9, 47-48, 73, 190, 273, 416, 471). It was not counted line by line.

### Answer 3. What in the sixth draft is specific to one product or one hosting provider?

DS 26: "The design document names no product." DS 31: "The body of the design names no hosting provider."

*One hosting provider (Cloudflare), by name*

- v6 25: the development site "in its own Cloudflare account".
- v6 141 and 177: Bob's acts are changes to "GitHub or Cloudflare settings".
- v6 271: how many external walkers "the Cloudflare account can bear", and Bob's words on its limits.
- v6 516: "the Cloudflare account bears the external walkers".
- v6 561: the installer "placing the product into a Cloudflare account".

*Hosting matters stated in one provider's or one harness's terms, without the neutral wording DS 31 asks for*

- v6 184 and 481: the deploy token entered into and held in "Claude's cloud environment".
- v6 82, 83, 158, 281, 456, 547, 561, 562: release stated as an installer and a page of a website.

*One product (Civicsmith), by name*

- v6 204: "For Civicsmith the lanes are UX, investigation design and publication design."
- v6 222: "three for Civicsmith".
- v6 578: which lanes Civicsmith begins with.

*One product's facts, without its name*

- v6 19: the list of 220 modules, seven without code, four new, about 50 files with no module.
- v6 237: 29 of the 220 hold requirements and no code.
- v6 53, 273, 544: the folder `docs/development/ux-substrate/`, its state on two branches, the three journey lists of 27, 27 and 32.
- v6 295: 122 pairs of undeclared test imports and who corrects them; 3,029 import statements.
- v6 356, 362: 510 and about 74 of 2,707 notifications.
- v6 446: "payment and data paths".
- v6 488: the product's CLAUDE.md on the tranche branch and what it tells a session.
- v6 532: 8,838 requirement numbers against 236 to 357 walk steps.
- v6 545: about 177 jobs before the first walk.
- v6 547: which of the 32 journeys begin at the website or installer or need the AI assistant.
- v6 81, 182, 562: an AI account connected to the deployment; "with AI on".
- v6 561: "an existing team's site", "the assistant working with a real AI model".
- v6 585: a member's own Claude sign-in through the runner.
- v6 347-348: the tool is "TypeScript's reader, reading plain JavaScript". This fits only a product written in that language. It names no product.

*Not covered by either rule, noted for completeness*

- GitHub is named on 24 lines of the sixth draft. DS 31 speaks of where a product "is hosted and released", and the design state itself names GitHub (DS 90, 142). Neither file says GitHub is to be written in neutral terms.
- Claude Code and what only it has (DS 33, a third rule of the same kind): v6 17, 155, 183, 184, 404, 406, 410, 414, 416, 422, 434, 481, 488; and claude.ai pages at v6 273 and 544.
