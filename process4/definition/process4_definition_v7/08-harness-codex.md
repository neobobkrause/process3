# Part 8. The harness table for Codex

Length: 50 lines. Last section: "3. What the owner fills".

Everything in this part is specific to Codex. Where the Codex side is not known or not built, this part says so plainly and leaves it for the owner's work on his OpenAI account. "Not known" means no record shows it; it does not mean Codex cannot do it.

## 1. What carries each term

| Term in parts 1 to 6 | On Codex | How it is known |
|---|---|---|
| Session | A chat the owner opens himself, or a child started inside a chat | Measured |
| The owner's standing approvals | Not known | |
| Forbidden commands | Not known | |
| Unattended mode and the permission checker | Not known. No record names a mode or a checker | |
| One session starting another | A child inside the starter's own chat. A session listed on its own, started by another session, could not be made from a hosted session | Child: measured. Separate session: measured as blocked |
| A message | A follow-up task to a child in the same chat wakes it. Across two chats it fails | Measured |
| Interrupting a running session | Not known | |
| Scheduled wake | Scheduled runs exist. Whether a wake reaches a child or only the owner's chat is not known | Documented |
| Secret values | Not known | |
| Instruction files loaded at start | `AGENTS.md`, one for each folder from the repository's root to the working folder, sharing one budget of 32 KiB by default; bytes past it are cut off; an edit is not picked up by a running session | Documented. The hosted limit was not measured |
| Worker | A child started with a fresh history | Measured |
| Fill level | None in a hosted session. No sign of a compaction either | Measured as absent |
| Compaction | Automatic at 90 percent of the window. A hosted session gives no sign of one | Documented |
| The time a session can run one thing | Not known | |
| Planned replacement | A fresh child with a record of its role. Replacing a top-level chat was not tried | Measured for a child |
| Archiving | Not available to a hosted session | Measured as absent |
| A notification to the owner | Not known | |
| The shared state | In the one trial, a file on the host, not on GitHub | Documented |
| The owner speaking to a role | Through the chat he opened only | Measured |
| Depth of sessions | Four: the owner's chat, ROOT, ARCH and the coordinator, jobs | Measured, second-hand |
| Model and effort passed on | Not known | |
| The owner's standing page; a lane's design pages | Not known | |
| Grouping sessions under a product | Not known | |
| The owner seeing each open job | Not known | |
| Starting instructions | Not known beyond the instruction files above | |
| Reading a file | A shell command with an output limit in tokens. Over the limit the start and end arrive, the middle does not, and the command reports success | Measured |

## 2. Rules of this design that Codex cannot yet be shown to keep

- **A refresh at a stated fill level.** No fill level can be read, so only the natural pause can trigger a refresh. The rule that compaction is never needed (part 5, section 1) is therefore met only by frequent refreshes at pauses. The owner's words: a Codex-based process "requires that we be able to avoid compaction entirely". Nothing signals a compaction if one happens.
- **The three things that hold a rule** (part 6, section 1). What carries the approvals, the forbidden commands and the permission checker is not known.
- **A message wakes its receiver at once.** Shown only for a child in the same chat.
- **Each role as a session of its own that the owner can open.** On Codex every role was a child inside one chat.
- **Grouping a product's sessions, and archiving finished ones.**
- **A notification to the owner's phone.**
- **Renewing the sign-in before it expires,** which the owner expects Codex to need and the process to support cleanly. How is not known.

## 3. What the owner fills

The list of what the design needs that nothing shows for Codex is kept in the working folder as `codex_shortcomings_to_fill.md`. As each is filled, the row above is rewritten in place.
