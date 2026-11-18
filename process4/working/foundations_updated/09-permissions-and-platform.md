# Process4 Foundations, part 9: Permissions and the platform

Length: 88 lines. Last section: "The terms and their Claude Code constructs".

Much of this part depends on the harness. Each such statement is marked "Claude Code:". How Codex carries the same terms is for the design document's table for Codex.

## What holds a rule

Process4 holds its rules with four things.

- **Each session's instructions.** A session is started with instructions that name every act it may take.
- **Bob's standing approvals.** One block of text, in his own words, says what sessions may do without asking him and what they may never do.
- **The list of forbidden commands.** It takes commands away from every session outright.
- **GitHub's own rules.** These are Bob's settings.

Bob's approvals and the list of forbidden commands are protected by the permission checker alone. Nothing enforced by GitHub is added for the process's own rules (part 8).

Most rules in the design are held by instructions. The rule that a job writes only its own module's files is one. Bob's judgment is that this is enough for ordinary work: under Claude Code he saw jobs keep to their modules, and he counts enforcement by role as important and useful but not essential (`process4/owner_words/bob_words_16_17nov_codex_development.md`).

Permission management is Process3's, preserved. Measured: about 700 merges with no review went through Process3's tool with no recorded refusal. Process4's own tool is unmeasured.

## Bob's standing approvals

The approvals are recorded once, in Bob's own words, and reach every session, at every depth and in every successor. Bob commits them himself. No session writes, edits or relays them.

Claude Code: the approvals are a block of text in the repository's CLAUDE.md, which Bob commits on GitHub's website.

Claude Code: consent that is only quoted in a session's starting text does not count. Measured in Process3, as recorded in the working Foundations: sessions started by another session declined every merge asked of them on quoted consent, 11 of 11. The evidence file for that count was not found. With Bob's approvals committed to the repository, a confirming round saw no refusal in about 450 acts (measured).

Claude Code: the committed approvals also cover what no starting instructions foresaw. Measured in Process3, as recorded in the working Foundations: with them a session acted on its directing session's unforeseen request 10 of 10 times, and without them 0 of 10.

Claude Code: a session loads the approvals only when it starts (measured). Measured in Process3: each of Bob's five edits to his approvals stopped every long-lived session. So an edit to the approvals goes together with a restart of ROOT. What an edit does to a round that is running is a technical matter still owed (part 10).

Claude Code: a session reads the approvals from the copy of the repository it was handed at its start. Measured in Process3: that copy was once about an hour old and lacked approvals committed sixteen minutes earlier. Claude decided: ROOT's first act is to fetch the newest copy of its branch. Whether approvals that arrive after a session has started count the same as approvals read at the start is unproven.

## The list of forbidden commands, and GitHub's rules

Claude Code: the list of forbidden commands is the deny list in the repository's settings.json. A command on it is removed from the session outright (measured). The list takes away every direct push, every GitHub command, the ordinary merge commands, overwriting a branch's history, deleting branches, and writing files through GitHub's web interface.

So the process's tool is each session's only door to GitHub. Merging stays with that tool, the route Process3 measured.

Sessions act on GitHub as a second account, which can push and merge but cannot change settings. Bob acts as the owner. So GitHub itself keeps sessions out of settings and branch rules. No branch can be deleted or overwritten. The tranche branch takes a change only by pull request with its tests passing.

Claude Code: a session loads the list of forbidden commands only when it holds one repository (measured). So every session is started with one repository, from the newest commit of the tranche branch.

The process must be able to deploy by itself, because an external walk needs a deployment and the work runs with nobody watching. Bob's word on this, of 2 Nov, is recorded in `process4/evidence/foundations.md`. Secret values are kept away from product code. Claude Code: deploy tokens are held as settings of the cloud environment, the only route measured to work. Module tests run in two parts, so that product code under test holds no access token.

## Working with the permission checker

Claude Code: every session runs in Auto mode. It acts without asking a person, and an automatic permission checker run by the platform judges each risky act and may refuse it.

Claude Code: the checker's judgment is not fully steady. Measured in Process3: it passed and refused the same act minutes apart. Three working rules exist because of it.

- One judged act for each command. Measured: a judged act chained with another command was the one refused.
- A refused act is never reworded and never handed to another session.
- Three refusals in a row stop a session (measured). Such a session is replaced.

Estimated: twenty clean merges in the trial bound the refusal rate only below about 14%. Whether the checker goes on passing merges at a real rate can be shown only by the first real tranche.

## The platform

The process stands only on platform behaviour that has been measured. The measured behaviours it rests on are these, all Claude Code:

- A session can run one thing for about 30 minutes. Longer work runs on GitHub's machines or is shared among sessions.
- An alarm set by a session fires into that session when it is idle and resumes it. This is ROOT's hourly wake.
- A fresh session started by an alarm could not start sessions (0 of 3).
- New session starts failed silently at about 50 live sessions (one event). So finished sessions must not use up the account's room. Who closes a finished session is owed (part 10).
- Sessions are started only down to a limited depth. So sessions are at most three levels deep.

The process keeps to GitHub's published limits, in the way Process3 did. What that way was, and why GitHub suspended the sessions' account on 6 Nov, are owed (part 10).

Every account, setting and branch rule the process depends on is part of the design. The few steps that are Bob's are listed on one page the process writes, each with its reason.

## The terms and their Claude Code constructs

| Term used in these parts | Claude Code construct |
| --- | --- |
| Session | One conversation in Claude Code's cloud |
| Helper | A worker started inside a session, which ends with its task |
| Bob's standing approvals | A block of text in the repository's CLAUDE.md |
| The product's instruction file | The repository's CLAUDE.md |
| The list of forbidden commands | The deny list in the repository's settings.json |
| The permission checker | The automatic checker of Auto mode |
| The hourly alarm | A scheduled task bound to ROOT's session |
| Settings of the cloud environment | Values Bob enters into Claude's cloud environment |
| Notification to Bob's phone | A push notification from a session |

The Codex constructs are not given here. They belong to the design document's table for Codex.
