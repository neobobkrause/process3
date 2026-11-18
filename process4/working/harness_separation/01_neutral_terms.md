# Harness-neutral terms, and what carries each on Claude Code and on Codex

Length: 77 lines. Last section: "5. What the table shows".

Written by a Claude worker on 18 Nov 2026 for the session continuing the Process4 design. A worker's findings, not Bob's words. The neutral terms are the worker's suggestions.

## 1. How to read this

Each row is one thing the design relies on that the two harnesses do differently. The Claude Code column says what the sixth draft uses; numbers in brackets are line numbers of `definition/process4_definition_v6.md`. The Codex column says what the Codex files show. The last column labels the Codex entry:

- **Measured**: an experiment on Codex observed it.
- **Measured, second-hand**: an earlier Codex trial observed it; its evidence is in the trial repository (`process3-probes`), and only a summary is in this repository. I did not read the evidence.
- **Documented**: in the harness's documentation or public source, not run here.
- **Proposed**: someone's recommendation.
- **Unknown**: no file says.

Short names for sources, all inside `process4/`:

- *feasibility*: `working/codex-first-class-feasibility-20261117.md`
- *blocker*: `working/codex-first-class-session-creation-blocker-20261117.md`
- *cross-tree result*: `working/cross-tree-front-door-test-result-20261117.md`
- *register*: `working/codex_design_conversation_register_20261117.md`
- *window note*: `working/codex-gpt6-context-window-investigation-20261117.md`
- *study*: `working/codex-context-study-20261117/REPORT.md`
- *trial notes*, *instruction notes*, *protocol*: `bootstrap-context-source-notes.md`, `instruction-source-notes.md` and `protocol.json` in the study's `evidence/` folder
- *Bob on Codex*: `owner_words/bob_words_16_17nov_codex_development.md`

One fact shapes most rows. Every Codex trial ran inside one chat that Bob opened, called the owner console. Everything a trial started was a child of that chat. A session started by another session and listed on its own, as on Claude Code, could not be made (feasibility, lines 3 and 11).

## 2. The table

| Neutral term | Claude Code, as the sixth draft uses it | Codex | Codex label and source |
| --- | --- | --- | --- |
| The owner's standing approvals | A block of Bob's own words in CLAUDE.md, committed by Bob on GitHub's website, read once when a session starts (183, 406) | Nothing shown. Bob asked whether Codex has "similar support" and asked for a proposal on grants. No answer or proposal is in this repository. The study warns not to assume that Claude's "CLAUDE.md and settings.json mechanisms map to Codex". | Unknown. Bob on Codex, lines 31 and 33; study, line 104 |
| The list of forbidden commands | The deny list in settings.json; loaded only by a session that holds one repository (410, 414) | Nothing shown. The trial's controller "may be bypassable by inherited raw tools". The trial's own proposal says "no physical credential/tool isolation is established". | Unknown. Register, line 42; trial notes, line 27 |
| Permission handling for unattended work | Auto mode: the platform's permission checker judges each risky act and may refuse it (404) | No Codex file names a mode or a checker. | Unknown |
| Starting a session on a repository | A session in Claude Code's cloud, handed a copy of one repository at its start. Bob starts ROOT with a plain prompt (17, 188, 414, 416) | (a) A chat Bob opens himself. (b) A Codex Cloud task in a published environment tied to a repository. | (a) Measured: the trials ran in such chats. (b) Documented; no Cloud task was ever submitted. Feasibility, lines 11 and 12 |
| One session starting another | A separate session on the account, at most three levels deep (188, 194, 239) | A native child inside the starter's own tree. A separately listed session: not possible from a hosted session in the tested runtime. | Child: measured (study, line 67). Separate session: measured as blocked before any was made (blocker, line 11); documented through a command-line route and through "dots" (feasibility, lines 9 and 13) |
| A message from one session to another | A message sent to a session, which wakes it (250, 416) | A follow-up task to a child in the same tree wakes it. A plain message "alone does not wake idle recipients". Across two trees it fails. The owner console is not woken by a message. | Follow-up: measured (study, line 67); and second-hand, about 8 to 14 seconds to first action (register, line 33). Plain message: an assumption written in the trial's role instructions (trial notes, line 22). Across trees: measured failure, "live agent path ... not found" (cross-tree result, line 10). Console: not shown (trial notes, lines 25 and 27) |
| Interrupting a running session | ARCH interrupts each job when Bob says stop (374) | Not shown. "No ... in-flight interruption ... proved." | Unknown. Study, line 67 |
| An alarm, or scheduled wake | A scheduled task on the account; it wakes ROOT each hour (188, 374) | Scheduled runs "target existing chats or produce runs surfaced in Scheduled". The trial has a "Hourly/ten-minute safety continuation". | Documented (feasibility, line 14); the trial's timer is measured, second-hand (register, line 32). Whether a wake reaches a child or only the console: unknown |
| Secret values, such as a deploy token | Settings of Claude's cloud environment, entered by Bob; "the only route measured to work" (184, 481) | No Codex file says. | Unknown |
| Instruction files loaded at start | CLAUDE.md and settings.json, read once at start (406); the product's CLAUDE.md under thirty lines (434) | AGENTS.md. One file for each folder from the repository's root to the working folder, all sharing one budget of 32 KiB by default; bytes past it are cut off; an edit is not picked up by a running session. | Documented, and read in public source. Study, lines 102 to 104; instruction notes, lines 5 to 8. The hosted cap was not measured (study, line 218) |
| A helper started inside a session | A worker the session starts inside itself (198) | A native child started with a fresh history. | Measured. Study, lines 53 to 55; protocol, line 6 |
| Context-fill measurement | The session can see how full its context is (368 says "fills up"; Bob's "Keep your context under 70%" in `HANDOFF.md`, line 14) | Hosted session: none. "No current-context meter exposed to the acting agent." Command-line client: a status command. | Hosted: measured as absent (study, line 136). Command-line: documented, never run |
| Automatic shrinking of a full context | Bob: past 75% Claude "would garbage collect" (Bob on Codex, line 75) | Automatic compaction at 90% of the window. No compaction was seen, and a hosted session gives no sign of one. | Documented, public source (window note, line 19). Study, lines 129 and 136 |
| Planned replacement of a session | The parent starts a successor, which begins from the shared state and GitHub (368; design state, section 8) | A fresh child, plus a role record with a generation number. The old child, asked again, declined as stale. | Measured for a child while the console was active (study, lines 67 and 76). The record is "supervisor-written, not platform authentication". Replacing a top-level chat: not exercised (study, line 68) |
| Archiving a finished session | Archive, with unarchive (Bob's approvals in the process repository's CLAUDE.md; Bob on Codex, line 67) | The command-line client "advertises ... archive and unarchive". "The available native tools have no archive/close operation." | Documented; measured as not available to a hosted session. Study, lines 123 and 150 |
| A notification to the owner | A push notification to Bob's phone (Bob's approvals; design state, section 4) | Not shown. In the trial, "idle owner-visible notification may wait". | Unknown. Trial notes, line 27 |
| The shared state | One place on GitHub in the product's repository, written only through the process's tool (235) | A local state file on the host, 512 KiB at most, with a record for each role. Not on GitHub. | Documented, the trial's own source. Study, line 154; trial notes, lines 7 and 12 |
| Bob speaking to a role | Bob opens that role's session and types | Through the owner console only: "not a separate interactive composer for every child". | Measured (register, line 26). Speaking to a role directly: unknown |
| Depth of sessions | Three levels: ROOT; ARCH and the coordinator; jobs (239) | Four: the owner console; ROOT; ARCH and the coordinator; jobs. The watcher sits beside ROOT. | Measured, second-hand, on a read-only fixture (trial notes, line 26) |
| Model and effort handed to a started session | Each session passes Bob's suggestion on (233) | The trial's children ran with "no model/effort overrides". A hosted child shows "no verified live model identifier". | Unknown. Protocol, line 6; window note, line 46 |
| Reading a file | Not described in the sixth draft | A shell command with an output limit in tokens. Over the limit, the start and end arrive, the middle does not, and the command reports success. | Measured. Study, lines 61 and 62 |

## 3. Things only Codex has

These have no counterpart in the sixth draft.

- **Renewing the sign-in.** Bob expects that Codex's authorization may need renewing "before the 30 day expiration date", and that the process "must recognize and cleanly support that act" (Bob on Codex, line 29). How is unknown. One trial found the command-line client "Logged in using ChatGPT" while its request to list Cloud tasks was refused with "401 Unauthorized" (blocker, lines 10 and 11).
- **Grouping sessions in a project.** Bob: "Only jobs, lanes, ARCH, ROOT, and the process coordinator sessions should be kept in the project" (`owner_words/bob_words_17nov_project_membership.md`, line 7). Whether a hosted child can be put in a project is unknown.
- **Dots.** A documented other way to start separate, visible Cloud conversations. Not verified on Bob's account (feasibility, line 13).

## 4. Things only Claude Code has shown

- Sessions that are separate, listed on their own, started by other sessions, and open to Bob directly.
- Approvals and forbidden commands that the platform itself reads and enforces.
- A fill level the session can read.

## 5. What the table shows

This section is my interpretation.

1. Of the twenty-one rows, an experiment recorded in this repository observed a Codex carrier for six: a chat Bob opens, a child started by a session, a follow-up message to a child, a helper, the replacement of a child, and the reading of a file. For three more the observation is second-hand: the trial's timer, the four levels, and Bob speaking to a role through the console.
2. The three rows that hold a rule in place on Claude Code, which are the approvals, the forbidden commands and the permission checker, are all unknown on Codex.
3. On Codex one construct, the native child, carries what Claude Code keeps apart: a session started by another session, and a helper inside a session.
4. Where a row says "unknown", the files do not say Codex cannot do it. The study's words: "They are not affirmative findings that Codex cannot support those operations" (study, line 220).
