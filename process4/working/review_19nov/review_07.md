Length: 205 lines. Last section: "174. No session writes, edits or relays your approvals".

## Part 4. Roles and sessions (continued)

### 153. A job or walker that fills up; what a natural pause is
- **Where:** Part 4, section 11, "A job that reaches the fill level" and "A natural pause".
- **The design says:** "**A job that reaches the fill level** pushes, tells ARCH in one message, and stops. ARCH replaces it from the same branch. A walking session that reaches it writes its last lines in the walk's issue, tells ARCH, and stops; ARCH gives the areas not yet walked to a fresh session. A walking session starts no workers." "**A natural pause** is a moment between two pieces of work, with nothing half done and everything saved."
- **In practice:** A building or walking session whose memory is filling saves, says so, and is replaced.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." (`bob_words_17nov_compaction_avoidance.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 154. How ARCH hears your instructions, and who sends the "blocked" message
- **Where:** Part 4, section 11, "What ARCH learns from the coordinator" and "The one message when the process is completely blocked".
- **The design says:** "**What ARCH learns from the coordinator** (a held or approved merge, a module put first, a new slot number, a request for a full external walk) comes by the standing notes and a message." "**The one message when the process is completely blocked** is sent by the coordinator, or by ROOT where the coordinator is what has stopped."
- **In practice:** Your instructions reach ARCH both as a written note and a message; the coordinator (or ROOT) tells you when all is blocked.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 155. How the process's program is first built
- **Where:** Part 4, section 11, "The tool is first built".
- **The design says:** "**The tool is first built** by a session on the owner's word, before anything is in force. That session holds the process's repository alone. Until the tool exists it pushes to its own working branch and opens its pull requests by the harness's ordinary means. The owner changed his approvals in the process's repository on 19 Nov so that sessions merge their pull requests into main there once the required check `tool-tests` passes, without a person's review (**from a session's record:** the report of the session that directed this correction, 19 Nov ...). **Claude decided**, and withdrawn: that he merges each one himself. After the first build only PROCESS changes the tool."
- **In practice:** A session builds the program first; its changes are added once their own tests pass, with no review.
- **Where it came from:** Claude's own choice, and a session's report of 19 Nov about your change to your approvals. Not your typed words in any file here.
- **Your nearest words:** "I also suggest that we prioritize trying to get process4 development to the point that its constructs can be used for its further development." (`bob_words_17nov_fresh_context_and_process_self_development.md`)
- **Against your words:** Agrees in aim.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 156. What "at most ten rules" counts
- **Where:** Part 4, section 11, last point; also part 5, section 2 (table) and part 10, section 1, item 10.
- **The design says:** "**"At most ten rules"** counts the numbered rule lines of a starting text, the lines that say what the session never does among them. A line may hold closely related rules. ... What keeps a text short is its size limit. **From a session's record:** the handoff, line 48, which quotes him on 19 Nov: "Why are you asking me to count lines. You can do that, correct? Keep going." So the count is Claude's." Part 5, section 2: ""At most ten rules" is kept from the process before this one (the ledger, as the sixth draft keeps it, its line 434)."
- **In practice:** The limit of ten rules is counted by numbered lines, and a line may hold several related rules, so the real check on length is the size limit.
- **Where it came from:** The limit itself from the ledger lines; the way of counting is Claude's, on your 19 Nov words as Claude's handoff notes quote them. Neither is in a file of your typed words.
- **Your nearest words:** None found in your files. Claude's handoff notes quote you: "Why are you asking me to count lines. You can do that, correct? Keep going."
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 5. Reading in full, and the documents

### 157. A session acts only on what it has read in full
- **Where:** Part 5, section 1, first point.
- **The design says:** "A session acts only on what it has read in full or measured. **From a session's record:** the Foundations (`foundations_tranche_9nov.md`, line 133)."
- **In practice:** No session acts on a document it has only skimmed.
- **Where it came from:** A session's record: the Foundations, line 133. Not your typed words.
- **Your nearest words:** "My Claude experience confirms that incomplete reading (scanning) to be a very significant danger that must be mitigated." (`bob_words_17nov_codex_context.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 158. Size limits on what is read, how they are chosen, and the stricter set used on both
- **Where:** Part 5, section 1, second to fourth points.
- **The design says:** "Every text a session must read in full, and every set of texts read together, is kept below a measured maximum size. Nothing can ensure a full reading; keeping below the maximum reliably results in one. **From a session's record:** the design state, lines 38, 39 and 120, for this line and the next two." "The maximums and the fill level are chosen by one yardstick: after a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level." "The Codex maximums are used on both harnesses, because they rest on real measurements and Codex context windows are in effect the more constrained."
- **In practice:** Documents are kept small enough to be read whole, with room left for real work; the tighter Codex limits apply on Claude as well.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, lines 38, 39 and 120. Not your typed words.
- **Your nearest words:** "What they require is sufficient token to perform enough useful - and correct! - work to justify the investment of time and tokens, all while protecting development from damage caused by things like document scanning, compaction, and other context management shortcomings." (`bob_words_17nov_compaction_avoidance.md`); "I also agree that it's not necessarily the case that Codex needs exactly the same context rules as Claude." (`bob_words_17nov_codex_context.md`)
- **Against your words:** Agrees with your aim; using one set of limits on both goes beyond your words.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 159. Each governing text states its length and last section at the top
- **Where:** Part 5, section 1, last point.
- **The design says:** "**Claude decided:** each governing text says at its top how long it is and what its last section is."
- **In practice:** A reader can tell at once whether it got the whole text.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 160. The four size values stand provisionally, "on the owner's word"
- **Where:** Part 5, section 2, opening and table.
- **The design says:** "All four are **provisional**. **From a session's record:** the design state, line 43: they stand, on the owner's word of 18 Nov, until a second measurement reports. His typed words of that day are not kept. **Reading:** these four are the current values the design state records him as agreeing to use for now." The table: "24,000 bytes"; "175,000 bytes"; "4,096 bytes, and at most ten rules"; "40 percent". Of the first: "in a first measurement that, by the design state (line 43), the owner judged too weak to rely on".
- **In practice:** Until a second measurement, one document may be at most 24,000 bytes, a set read together at most 175,000, a role's starting text at most 4,096, and a session is refreshed at 40 percent full.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 43), not your typed words; your words of that day were not kept. Also a reading by Claude. Only the 40 percent is in your words.
- **Your nearest words:** "This research confirms process4's policy of refreshing sessions when the context window exceeds 40% or more." (`bob_words_17nov_compaction_avoidance.md`)
- **Against your words:** Agrees on 40 percent; the other three go beyond your typed words.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 161. A role's starting text: 4,096 bytes
- **Where:** Part 5, section 2, table, third row.
- **The design says:** "4,096 bytes, and at most ten rules | Proposed by Claude. "At most ten rules" is kept from the process before this one ... Not measured"
- **In practice:** Each role's starting text is limited to about four thousand characters. (How the ten rules are counted is under part 4 above.)
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "limits on the size and complexity of process4's principals of operation" (`bob_words_17nov_codex_context.md`)
- **Against your words:** Goes beyond them: no figure is yours.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 162. Where no fill level can be read, refresh only at a pause
- **Where:** Part 5, section 2, last point.
- **The design says:** "**Claude decided:** where a harness shows no fill level (part 8), the refresh comes only at a natural pause."
- **In practice:** On Codex, where a session cannot see how full it is, sessions are refreshed at quiet moments only.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "If a Codex-based process4 is even a possibility requires that we be able to avoid compaction entirely, because any work that happens after an unrecognized compaction could cause (silent) damage that difficult/impossible to recover from." (`bob_words_17nov_compaction_avoidance.md`)
- **Against your words:** Falls short of them: a pause alone does not show that compaction is avoided.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 163. Principles kept short, or brought to you
- **Where:** Part 5, section 3, first point.
- **The design says:** "Each role's principles are concise, sufficient for the role to be performed correctly, and unambiguously clear. Whenever they are changed, every effort is made to keep them short enough to be read in full and not scanned. Where that cannot be done, the matter comes to the owner to find a solution (**from a session's record:** the design state, line 40). **Reading:** PROCESS brings it to him."
- **In practice:** If a role's rules cannot be kept short, PROCESS asks you how to proceed.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 40), not your typed words, and a reading by Claude.
- **Your nearest words:** "limits on the size and complexity of process4's principals of operation" (`bob_words_17nov_codex_context.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 164. A starting text's size is a rule, not a refusal
- **Where:** Part 5, section 3, second point.
- **The design says:** "**Claude decided:** the size of a role's starting text is a rule, not a refusal among the tool's tests."
- **In practice:** Nothing blocks an over-long starting text; it is simply a rule to keep it short.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Do not add tests, gates, reviews or checks." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 165. Two documents, and the ledger retired
- **Where:** Part 5, section 4, first and second points. The section is marked "**From a session's record:** the design state, lines 25 to 33 and 130".
- **The design says:** "The owner's ledger was a worksheet and is retired." "There are two documents. This design document defines the design and is what sessions follow. A background document gives the background and context; it is the Foundations (written by a session from the owner's ledger) brought up to date with the design."
- **In practice:** Your ledger is no longer kept; the design and a background document replace it.
- **Where it came from:** A session's record: Claude's notes of 18 Nov. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 166. How the design document is written and kept up to date
- **Where:** Part 5, section 4, third to last points.
- **The design says:** "The design document names no product and carries no history. Its body, parts 1 to 6, names no hosting provider and uses harness-neutral terms. A table for each harness and for each hosting provider follows the body." "Where one harness's side of the design is not yet known or not yet built, the design notes the shortcoming plainly and leaves it for the owner's work on that harness's account to fill (part 8)." "Each harness's own files are kept apart in the process's repository, and a change for one harness never alters the other's." "The design document is kept up to date with the owner's decisions in the same step as each decision is recorded."
- **In practice:** One design covers both Claude and Codex, with what is unknown about Codex left for you to find from your own account.
- **Where it came from:** A session's record: Claude's notes of 18 Nov. Not your typed words.
- **Your nearest words:** "Confirm that changes being added to the process3 repo in support of a Codex-based development process are NOT overwriting the Claude Code support, correct?" (`bob_words_16_17nov_codex_development.md`)
- **Against your words:** Agrees on keeping the two apart; the rest goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 167. Who keeps your decisions, and where
- **Where:** Part 5, section 5, first point. The section is marked "**From a session's record:** the design state, lines 29, 30 and 48, except where marked."
- **The design says:** "The owner's decisions about the Process4 design are kept in the process's repository, by PROCESS. His decisions about a product are kept by the coordinator. Each record has one writer. **Claude decided:** a product's record is kept in that product's repository."
- **In practice:** PROCESS writes down your process decisions; the coordinator writes down your product decisions, kept with the product.
- **Where it came from:** A session's record (Claude's notes of 18 Nov), not your typed words; where a product's record is kept is Claude's own choice.
- **Your nearest words:** "Only words I wrote count as my word. Never record your decision or your summary as mine." (`bob_words_14nov_b.md`)
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 168. How the record of your decisions is written
- **Where:** Part 5, section 5, second to fourth points.
- **The design says:** "A record is ordered by subject. Each entry states the rule as it now stands, and a decision that changes an entry rewrites it in place." "The owner's exact dated words are kept and never edited." "A rewritten entry is shown to the owner once before it stands."
- **In practice:** The record shows each rule as it now stands, keeps your exact words with their date, and you see each rewritten entry once.
- **Where it came from:** A session's record: Claude's notes of 18 Nov. Not your typed words.
- **Your nearest words:** "Only words I wrote count as my word. Never record your decision or your summary as mine." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees, and goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 169. ARCH's own record of technical decisions
- **Where:** Part 5, section 5, last point.
- **The design says:** "**Claude decided:** ARCH's technical decisions are written in a second record in the product's repository, of which ARCH is the only writer."
- **In practice:** ARCH's technical choices are kept apart from your decisions.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "Decide technical matters yourself and tell me what you decided." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 170. Each product's ranking page, and its order
- **Where:** Part 5, section 6.
- **The design says:** "Each product has one short page, kept by ARCH and read by every role, that ranks its kinds of governing text: mission, principles, standards, requirements, design decisions. **Reading:** mission is highest and design decisions lowest." "A lower one never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH." "**From a session's record:** the design state, line 125, for this section."
- **In practice:** One page says which of the product's documents wins when two disagree.
- **Where it came from:** A session's record (Claude's notes of 18 Nov, line 125), not your typed words; the order is a reading by Claude.
- **Your nearest words:** "It's essential that the resulting workflow give proper consideration and abide by the mission, principals, standards, requirements, and design decisions documented in the canon." (`bob_words_16_17nov_codex_development.md`); "I'm open to the addition of a canon authority map. The model must not mistake a local implementation decision for permission to violate a higher-level principle." (`bob_words_17nov_codex_context.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 171. Where the Process4 work is kept now
- **Where:** Part 5, section 7, first two points.
- **The design says:** "The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The work for both harnesses is on that same branch." "The owner's typed words are in `process4/owner_words/`. ..." Marked "**From a session's record:** the design state, lines 101 and 102, for the first two lines."
- **In practice:** All the Process4 work sits in one folder of the Process3 project.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, lines 101 and 102. Not your typed words.
- **Your nearest words:** "You can create a subtree in the process3 repo for the container being used to update to process4." (`bob_words_14nov_b.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

## Part 6. What holds a rule, the tool, and changing the process

### 172. Only three things hold a rule; the rest is text
- **Where:** Part 6, section 1, first and second points.
- **The design says:** "**Claude decided**, carried from the sixth draft, for this line and the next: three things hold a rule whatever a session intends: the owner's standing approvals, judged by the permission checker; the list of forbidden commands; and GitHub's own rules, which are the owner's settings." "Every other rule in this design is held by text: by a session's instructions and by this document. That is a known limit. Rules held by text alone drifted in the process before this one."
- **In practice:** Only your approvals, the list of banned commands and GitHub's settings truly stop a session; every other rule depends on the session obeying what it was told.
- **Where it came from:** Claude's own choice.
- **Your nearest words:** "The hardest open problem: today nothing physically stops a session adding a test or a check to the process. That rule exists only as text, and in Process3 text alone did not hold." (`bob_words_14nov_b.md`)
- **Against your words:** Goes beyond them, and leaves the problem you named as it was.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 173. The program guards against mistakes, not attacks
- **Where:** Part 6, section 1, last point; also section 5, sixth point.
- **The design says:** "The tool guards against mistakes, and not against a session that sets out to defeat it. That too is a known limit. **From a session's record:** the design state, line 133." Section 5: "PROCESS answers a finding against the tool that needs a deliberate attack with "no change" unless the owner says otherwise. **From a session's record:** the design state, line 133."
- **In practice:** A weakness that only a deliberately misbehaving session could use is left alone unless you say otherwise.
- **Where it came from:** A session's record: Claude's notes of 18 Nov, line 133. Not your typed words.
- **Your nearest words:** None found.
- **Against your words:** Goes beyond them.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.

### 174. No session writes, edits or relays your approvals
- **Where:** Part 6, section 2, first point.
- **The design says:** "No session writes, edits or relays it (**from a session's record:** the Foundations, `foundations.md`, line 183)."
- **In practice:** Only you put your approvals in place.
- **Where it came from:** A session's record: the Foundations, line 183. Not your typed words. (That you commit them yourself is yours: "O12: agreed".)
- **Your nearest words:** "O12: agreed" (`bob_words_14nov_c.md`)
- **Against your words:** Agrees.
- **Your choice:** Accept as it stands / Change (say to what) / Remove.
