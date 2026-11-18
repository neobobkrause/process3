# Part 7. The harness table for Claude Code

Length: 52 lines. Last section: "3. Not proven on Claude Code".

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
| Compaction | A full context is shrunk automatically, which loses what was read |
| The time a session can run one thing | About thirty minutes for one command, as recorded in the process before this one |
| Archiving | A session can be archived and unarchived |
| A notification to the owner | A push notification to his phone |
| The owner's standing page; a lane's design pages | Pages on claude.ai |
| The owner speaking to a role | He opens that role's session and types |
| Grouping sessions under a product | **Claude decided:** a tag naming the product, set on each session when it is started. Sessions can be listed by tag. Workers are not sessions and so carry none. Read in the session tools' own descriptions; not measured |
| The owner seeing each open job | **Claude decided:** each job's session is titled with its module's name, and the list of sessions shows each one's title and whether it is working, waiting or finished. Read in the session tools' own descriptions; whether the list he sees meets the rule is not measured |
| Starting instructions | The prompt a session is started with |
| Model and effort passed on | The starter names both when it starts a session. Read in the starting tool's own description; not measured |
| Planned replacement | The parent starts a fresh session and archives the old one |
| The limit on depth | One session reported a limit of eight (seen once). It bounds how many times a watcher can take over before the owner starts a fresh ROOT (part 4, section 6) |
| The shared state | Not carried by the harness. It is on GitHub (part 4, section 4) |
| Connecting the harness to GitHub | The owner connects his GitHub to Claude and installs Claude's GitHub App on the repository |
| A session's browser | A browser on the session's own machine. Not shown to reach the development site |
| A read-only copy of the process | **Unproven:** how a session that holds one repository fetches the process's copy without losing its deny list |
| What the subscription covers; cost | **Open (a session):** where cost can be read is not named anywhere read |

## 2. Reading, as measured

From the first measurement of 18 Nov, on one model with a 1,000,000-token window. The owner judged that measurement too weak to rely on; these are what it saw.

- A plain read returns a file whole up to 25,000 tokens. A larger file comes back cut, and the notice of the cut arrives apart from the read's result.
- A file over 256 KB is refused, with no lines returned.

## 3. Not proven on Claude Code

- Why the cloud once handed a session a copy of its branch about an hour old, and whether it still does.
- Whether approvals that reach a session after its start count the same as approvals read at the start.
- Whether a session's browser can reach the development site.
- How many live sessions the account bears. New starts once failed silently at about fifty.
