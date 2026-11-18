# Part 7. The harness table for Claude Code

Length: 41 lines. Last section: "3. Not proven on Claude Code".

Everything in this part is specific to Claude Code.

## 1. What carries each term

| Term in parts 1 to 6 | On Claude Code |
|---|---|
| Session | A session in Claude Code's cloud, handed a copy of one repository when it starts |
| The owner's standing approvals | A block of the owner's own words in the repository's `CLAUDE.md`, read once when a session starts |
| Forbidden commands | The deny list in the repository's `settings.json`. A session that holds more than one repository loads no deny list |
| Unattended mode and the permission checker | Auto mode: the platform's automatic checker judges each risky act and may refuse it |
| One session starting another | A separate session on the account, started by a session |
| A message; interrupting | A message sent to a session wakes it. A session can be interrupted |
| Scheduled wake | A scheduled task on the account |
| Secret values, the deploy token among them | Settings of Claude's cloud environment, entered by the owner. The only route measured to work |
| Instruction files loaded at start | `CLAUDE.md` and `settings.json`. The product's `CLAUDE.md` stays under thirty lines |
| Worker | A helper the session starts inside itself. A worker cannot start workers (seen once) |
| Fill level | The session can read how full its context is |
| Archiving | A session can be archived and unarchived |
| A notification to the owner | A push notification to his phone |
| The owner's standing page; a lane's design pages | Pages on claude.ai |
| The owner speaking to a role | He opens that role's session and types |
| Grouping sessions under a product | **Open (a session):** what carries it on Claude Code is not named anywhere read |

## 2. Reading, as measured

From the first measurement of 18 Nov, on one model with a 1,000,000-token window. The owner judged that measurement too weak to rely on; these are what it saw.

- A plain read returns a file whole up to 25,000 tokens. A larger file comes back cut, and the notice of the cut arrives apart from the read's result.
- A file over 256 KB is refused, with no lines returned.
- A session reported a depth of sessions with a limit of eight (seen once). This bounds how many times a watcher can take over before the owner starts a fresh ROOT (part 4, section 6).

## 3. Not proven on Claude Code

- Why the cloud once handed a session a copy of its branch about an hour old, and whether it still does.
- Whether approvals that reach a session after its start count the same as approvals read at the start.
- Whether a session's browser can reach the development site.
- How many live sessions the account bears. New starts once failed silently at about fifty.
