# Seventh draft rechecked: corrections made, and the parts against each other

Length: 197 lines. Last section: "4. Counts".

Written by a checking session on 18 Nov 2026. It reports only what it read. It does not judge the design and proposes nothing.

Short names: **v7 02:27** means line 27 of the file in `process4/definition/process4_definition_v7/` whose name starts with 02, as the file stands now. **v6** is `process4/definition/process4_definition_v6.md`. **DS** is `process4/working/design_state_18nov.md`. **The earlier check** is `draft7_check_sixth_draft.md` in this folder. Its line numbers are for the draft before correction; the numbers here are for the draft now.

## 1. Line counts read

| Text | Lines | Bytes |
|---|---|---|
| v7 `00-index.md` | 82 | 7,913 |
| v7 `01-purpose-owner-and-decisions.md` | 79 | 8,064 |
| v7 `02-modules-jobs-tests-and-the-notice.md` | 102 | 11,580 |
| v7 `03-tranche-rounds-walks-and-release.md` | 72 | 7,380 |
| v7 `04-roles-and-sessions.md` | 132 | 12,879 |
| v7 `05-reading-and-documents.md` | 60 | 5,136 |
| v7 `06-rules-permissions-and-changing-the-process.md` | 69 | 7,331 |
| v7 `07-harness-claude-code.md` | 43 | 2,996 |
| v7 `08-harness-codex.md` | 46 | 3,782 |
| v7 `09-hosting-cloudflare.md` | 27 | 2,108 |
| v7 `10-open-and-unproven.md` | 90 | 6,723 |
| v7, all eleven | 802 | 75,892 |
| The earlier check | 164 | |

The eleven parts are 802 lines together, not 1,065 and not 902.

Read only as single passages, to judge a correction: v6 lines 183, 206, 224, 226, 297, 325, 438, 462; DS lines 64 and 136 to 143; one line of `process4/owner_words/bob_words_14nov_b.md` (line 30).

## 2. A. Each finding of the earlier check

One line each. The number is the earlier check's own.

### Its section 3, LOST

1. Who merges a job. **Corrected.** v7 02:27: "**ARCH merges it** into the tranche branch with the tool, the only way a session can merge."
2. A test runs only for a reason. **Corrected.** v7 02:54: "A test runs only when there is a fully informed reason to run it."
3. Module tests are fast. **Corrected.** v7 02:56: "They \"must be complete yet fast and efficient\"."
4. Comments and the tool inform module tests. **Corrected.** v7 02:57: "The structured comments and the tool can also inform module tests, so that boundaries are properly checked."
5. The tranche report lists the UX lane's changes. **Corrected.** v7 03:53: "and every change the UX lane made during the tranche to the two documents the walks are measured against".
6. One session for each lane held by a record. **Partly corrected.** v7 04:56: "One session for each lane is held by the lanes record: the tool does not start a second while the first is recorded as live." v6 224 had the record "written before the session is started"; that is not said. The new sentence also has the tool starting a lane, which other lines deny (B, item 3).
7. PROCESS follows the lane rules. **Corrected.** v7 06:62: "PROCESS runs as one session at a time, keeps its own folder in the process's repository, and records its research there before it proposes."
8. A lane decides wording. **Corrected.** v7 04:50: "A lane decides design and wording in its area, within the product's principles."
9. ARCH gives a lane enough to decide. **Corrected.** v7 04:52: "which passes each on with enough context to decide".
10. Only two refusals. **Corrected.** v7 02:60: "Only these two refusals stand; no other is built into module tests."
11. A comment ties each call by name to the list. **Corrected.** v7 02:83: "and each shared piece that carries a call by name has one comment tying the name to that list."
12. What the tool's own tests are made from. **Corrected.** v7 06:36: "**Claude decided:** the changes recorded when the notice's method was proven become tests of the tool."
13. Where the Process4 work is kept. **Corrected.** v7 05:58: "the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository."
14. Who builds, and when. **Corrected.** v7 06:37: "The AI builds the tool, before anything is in force."
15. How the owner commits his approvals. **Corrected.** v7 06:13: "He commits it himself, on GitHub's website."
16. The meaning of "pull request". **Corrected.** v7 00:68: "**Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging."
17. Trial item, the slot rule. **Corrected.** v7 10:72: "13. The rule for who takes a free slot gives the same answer every time."
18. Trial item, the hosting account bears the walkers. **Corrected.** v7 10:73: "14. The hosting account bears the external walkers."
19. Trial item, the account switch. **Corrected.** v7 10:74: "15. An account switch loses no work." (This addition does not agree with v7 10:55; see B, item 4.)

### Its section 6, an unclear part settled without a mark

20. Questions to a lane and their answers. **Partly corrected.** The mark is added, v7 04:58: "**Reading:** the questions ARCH puts to a lane, and its answers, are not kept as a running record." Part 10 does not name this reading; v7 10:16 names for part 4, section 3 only "the lane rules he has not confirmed one by one".

### Its section 7, new decisions with no mark

1. The process config. **Corrected.** v7 00:82: "**Claude decided** what it holds: the process version it runs on, the default slot number, its lanes, ...". "Default" now sets it apart from the slot number in the standing notes (04:76).
2. The language reader. **Corrected.** v7 02:87: "**Claude decided:** which language reader the tool uses is a fact of the product, named in its process config."
3. Handover rewritten before asking. **Corrected.** v7 04:89: "**Claude decided:** before it asks, the role rewrites its handover record."
4. ROOT replaces the watcher. **Corrected.** v7 04:90: "**Claude decided:** ROOT replaces the watcher, and ROOT itself is refreshed by the watcher (section 6)."
5. Any session may start workers. **Corrected.** v7 04:27: "A long-lived role or a job | Its own workers". (v7 04:15 still says more loosely "a helper a session starts inside itself"; B, item 7.)
6. Two additions to how things are put to the owner. **Corrected.** v7 01:47 is now his own words: "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen." (found in `owner_words/bob_words_14nov_b.md` line 30). v7 01:48 no longer has "and what it gives and costs": "options, each with its own identity; the recommendation and its reasons".
7. A refresh only at a pause where no fill level shows. **Corrected.** v7 05:25: "**Claude decided:** where a harness shows no fill level (part 8), the refresh comes only at a natural pause."
8. Where the two records of decisions are kept. **Corrected.** v7 05:45: "**Claude decided:** a product's record is kept in that product's repository." v7 05:49: "**Claude decided:** ARCH's technical decisions are written in a second record in the product's repository".
9. A new trial item, install and update. **Corrected.** v7 10:58 now marks the whole list: "**Claude decided** this list."
10. The rule for open design work. **Corrected.** The sentence is gone. v7 10:21 now reads only: "For a session to do, and to report."
11. "Public" dropped from the approval of a release. **Corrected.** v7 01:25: "Approve a public release | Once for each public release". v7 00:69: "**Release:** a public version of the product offered for installing. A development release, made only for development, is not one."
12. What saves a message's content. **Corrected.** v7 04:116: "**Claude decided:** it is saved in the sender's pull request, in the repository, or in a record of the shared state".
13. Details of the development site. **Corrected.** v7 09:18 heads them "## 2. Claude decided". On who can read the deploy token (DS 141), v7 09:21 now says: "Only ARCH's instructions name deploying. Nothing physical keeps the token's value from another session in the same environment."
14. Dropped mark: tests and steps that jobs write. **Partly corrected.** v6 297 marks the whole paragraph as Claude's. v7 02:61 marks only its last rule: "A module's tests and a walk's steps are product work. Each exists only to prove a product requirement, which it names. **Claude decided:** a test or step that serves the process is not allowed." The first two sentences stand before the mark.
15. Dropped mark: walking sessions use the slots. **Corrected.** v7 02:48: "**Claude decided:** walking sessions use the slots, since a walk is made when no job is open."
16. Dropped mark: the mechanical edit made as one change and merged once. **Corrected.** v7 02:99: "**Claude decided:** a worker in ARCH's session makes it as one change covering every affected module, and it is merged once; and the moment".
17. Dropped mark: who archives. **Corrected.** v7 04:92: "**Claude decided:** the session that started a session archives it; where the starter is gone, ROOT does."
18. Dropped mark: length at the top of each governing text. **Corrected.** v7 05:11: "**Claude decided:** each governing text says at its top how long it is and what its last section is."
19. Dropped mark: no start-up comparison, no size refusal. **Corrected.** v7 05:30: "**Claude decided:** the size of a role's starting text is a rule, not a refusal among the tool's tests." v7 06:14: "**Claude decided:** an edit therefore goes with a restart of ROOT (part 4, section 7), and no session compares the approvals it loaded with the newest."

### Its section 8, one remark inside the list of marked decisions

- Who settles two open items (ARCH in part 2, "a session" in part 10). **Not corrected.** v7 02:49: "**Open (ARCH, when a second product starts):**". v7 02:75: "**Open (ARCH):**". v7 10:21: "For a session to do, and to report."

### Its section 9, seen in passing

- 9a. The mechanical edit in the trial, "with the touched modules' tests run and with none run" (v6 517). **Not corrected.** v7 10:68: "9. A mechanical edit across several modules merges once."
- 9b. The deny list and the prepared release in the trial list (v6 520). **Not corrected.** v7 10:60 has the approvals only; the release is only at v7 10:46, as unproven.
- 9c. The trial showing that the wake does not undo a stop (v6 514). **Not corrected.** v7 10:65: "6. A stop, a held merge, a module put first and a new slot number each work on the owner's word." It stays only at v7 10:47.
- 9d. The figure of about thirty minutes. **Corrected.** v7 07:23: "About thirty minutes for one command, as recorded in the process before this one".
- 9e. That a change to the words stating a bound is a change to the interface (v6 325). **Not corrected.** Still only implied, by v7 02:70 and 02:81 ("A bound that a kind of value cannot express is written on its own marked line in the comment.").
- 9f. The tranche report's "overhead share, ARCH's idle time while work was ready" (v6 438). **Not corrected.** v7 03:53 has neither. DS 64 says the report "stands as the sixth draft has it". v6 462, which I read for this, proposes ending three other measurements and names neither of these two. Nothing in the draft or DS shows a choice to leave them out.
- 9g. Whether a lane is kept running, as a measurement for the end of the first tranche (v6 206). **Not corrected.** v7 04:48 has only "is ARCH's call, judged by cost". Part 10, section 5 does not list it.
- 9h. Three sentences that looked new and were not. **No correction called for.**
- 9i. Two facts with no source read. **Not corrected** (unchanged). v7 03:40: "No walk of either kind has ever been made by a session." v7 09:26: "took 60 and 64 minutes on GitHub's machines". I did not look for their source.
- 9j. The list of what the tool "does only". **Not corrected.** v7 06:34 still leaves out the two refusals, the check of declared uses, and removing a standing note. See B, item 2.

## 3. B. The eleven parts against each other

### 3.1 The same rule stated differently in meaning

1. **Whether tests run on the tranche's pull request into the main branch.** v7 03:50: "ARCH merges the tranche branch into the main branch as a whole, by pull request. None of the tests runs on that pull request." v7 02:101: "The required test run reports on every pull request, and passes at once when no module's code or tests changed." The tranche's pull request changes module code, so by 02:101 it does not pass at once; by 03:50 nothing runs.
2. **What the tool does.** v7 06:34: "It does only this: push; open a pull request and mark it ready; merge; choose the next job and write its starting instructions; write out a module's interface listing and send notices; decide when a module's work is finished and a round's jobs are done; count failed runs on a job's pull request; and read and write the shared state." Against it: v7 02:60: "Inside a module's own tests the tool may refuse a structured comment that disagrees with the module's code, and may refuse the module's code where it disagrees with a provider's stated interface." v7 04:64: "the tool removes the note when that comes true." v7 04:56: "the tool does not start a second while the first is recorded as live."
3. **Who starts a lane's session.** v7 04:56: "the tool does not start a second while the first is recorded as live." v7 04:17: "ARCH's session makes the start, because only a session can start a session." v7 04:25: "ARCH | Jobs, walking sessions, the product's lanes".
4. **What the trial asks of the owner.** v7 10:55: "It needs the owner for one sitting: session starts, one edit to his approvals, one stop, and three short marked instructions." v7 10:74 (added in correction): "15. An account switch loses no work." v7 04:111: "A switch of account adds only the owner's own acts in the new account." The sitting does not count those acts.
5. **Whether the design document names a hosting provider.** v7 05:38: "The design document names no product and no hosting provider, uses harness-neutral terms with a table for each harness". v7 00:12: "Parts 1 to 6 name no hosting provider and use harness-neutral terms." v7 09:5: "Everything in this part is specific to Cloudflare". Part 5 says the whole document; part 0 says parts 1 to 6.
6. **Which sessions are roles.** v7 00:51: "A job, a walking session and a worker hold no standing role." v7 04:29: "roles sit at most three levels deep: ROOT; then ARCH, the coordinator, the watcher and PROCESS; then jobs, walking sessions and lanes." Also v7 00:50 lists "a lane" among the roles, while v7 00:51 lists "the standing roles" without it, and v7 02:48 says "Lane sessions, the standing roles and workers use no slot". Small.
7. **Who may start a worker.** v7 00:53: "a helper that a long-lived role or a job starts inside itself". v7 04:15: "a helper a session starts inside itself". Small.
8. **Who settles two open items.** As in A above: v7 02:49 and 02:75 say ARCH; v7 10:21 says "a session". Small.
9. **A requirement cited in part 8 that no other part states.** v7 08:36: "The owner's requirement that compaction be avoided entirely on Codex". In parts 1 to 6 compaction appears only at v7 04:129 ("for example a stop caused by a compaction") and in the words list.

### 3.2 Cross-references

Every "part N, section M" points to a section that exists. These do not hold what is claimed:

1. v7 10:17: "**Codex** (part 8): everything marked not known, from his OpenAI account; and which Codex model the process is to use." Part 8 says nothing of which model; its nearest row is v7 08:31: "Model and effort passed on | Not known".
2. v7 10:29, under "Open design work": "The written procedures for promoting, rolling back and support, for each product (part 3, section 8)." Part 3, section 8 does not mark them open. v7 03:71: "For each product the process keeps a short written procedure for each of three things".
3. v7 04:14: "A walking session is started by ARCH for a walk and uses a job slot (part 3)." The rule that it uses a slot is in part 2, section 5 (v7 02:48). Part 3 has only v7 03:39: "at most as many walking sessions as there are slots". Small.

### 3.3 "Length ... Last section ..." headers

None is wrong. All eleven give the line count that I counted and the true last section. Each part is also under 24,000 bytes and the set under 175,000 (v7 00:13).

### 3.4 Terms used in parts 1 to 10 that "Words used" does not define

1. **"Declared uses".** v7 02:59: "a check that the module's declared uses match its imports." Nothing says where or how a module declares a use.
2. **"Language reader".** v7 02:87 and 00:82: "the language reader the tool uses". Not explained anywhere.
3. **"The account", "account switch", "an AI account".** v7 00:58: "Eight by default, counted across the account." v7 04:111: "A switch of account". v7 04:75: "A stop on the owner's word, naming the account". v7 01:30: "Connect an AI account to the development deployment". v7 10:90: "the sessions' account". Which account is meant is never said; the draft also has a development account, a hosting account and a GitHub account. The same word also means a report: v7 03:44: "a short account".
4. **"Trial repository".** v7 00:17: "used for the trial repository and the first real tranche". v7 10:55: "The trial runs in the trial repository".
5. **"A role's starting text", "starting instructions", "a role's principles".** v7 05:21: "A role's starting text | 4,096 bytes, and at most ten rules". v7 04:31: "starting instructions that name every act it may take". v7 05:29: "Each role's principles are concise". Three names, none defined, and it is not said whether they are one thing.
6. **"Process fault".** Used at v7 01:75, 04:129, 04:130, 06:44 to 06:47 and 10:69. The only meaning given is one case, v7 04:129: "A stop nothing called for is a process fault."
7. **"Architecture bug" and "implementation error".** v7 01:57: "Every problem is either an architecture bug or an implementation error." Neither is defined.
8. **"Held merge".** v7 04:9: "holds or approves one merge". v7 04:76: "a held merge". Small.
9. **"UX".** v7 04:47: "The UX lane is always there." Never spelled out.
10. **"Foundations".** v7 05:37: "it is the owner's Foundations brought up to date with the design."

### 3.5 A harness or hosting provider named in parts 1 to 6

v7 00:12 allows it only "in part 5, where a figure comes from one."

1. v7 05:58: "The Codex work is on that same branch." Part 5, but no figure.
2. v7 05:10: "The Codex maximums are used on both harnesses, because Codex context windows are in effect the more constrained." A rule about the figures, not a figure. Borderline.
3. No hosting provider is named in parts 1 to 6. The mark "Claude decided" in every part names the AI, not a harness; part 0 explains it (v7 00:22).

### 3.6 Open and Unproven against part 10

Every line marked **Open** in parts 1 to 9 (nine) and every line marked **Unproven** (ten) is in part 10. v7 06:64 is gathered under "Risks with no trial" (v7 10:89), not under "Unproven".

Not gathered:

1. Part 7, section 3, "Not proven on Claude Code". Three of its four lines are not in part 10, section 3. v7 07:40: "Why the cloud once handed a session a copy of its branch about an hour old, and whether it still does." v7 07:41: "Whether approvals that reach a session after its start count the same as approvals read at the start." v7 07:43: "How many live sessions the account bears." Trial items 1 and 7 (v7 10:60, 10:66) touch them; the Unproven list does not. v7 10:51 gathers part 8 in one line; nothing does the same for part 7.
2. The reading at v7 04:58 (A, item 20) is not named in v7 10:16.

Items in part 10 that point to a place that does not carry them: 3.2, items 1 and 2 above.

### 3.7 Terms in parts 1 to 6 that need a harness or hosting construct and have no row

1. **The owner seeing each job.** v7 04:122: "He can see each open job's progress and status without speaking to it." No row in part 7, 8 or 9.
2. **Starting instructions and a role's starting text.** v7 04:31 and 05:21 (quoted in 3.4). No row says what carries them. The tables instead have a row "Instruction files loaded at start" (v7 07:19, 08:20), a term parts 1 to 6 never use.
3. **Connecting the harness to GitHub.** v7 01:29: "Connect the harness to GitHub". No row.
4. **Fetching the process.** v7 06:38: "Each session fetches a read-only copy of it." No row, though v7 04:31 says "A session is started with one repository only" and v7 07:13 says "A session that holds more than one repository loads no deny list".
5. **A session's browser.** v7 03:40: "that a session's browser can reach the development site". No row; it appears only at v7 07:42 under "Not proven".
6. **What the subscription covers, and cost.** v7 01:34: "A harness runs AI sessions only on what the owner's subscription covers." v7 03:44: "cost where it can be read". No row.
7. **Model and effort.** v7 04:33: "Every session passes the owner's suggestion of model and effort on to each session it starts". Row in part 8 (v7 08:31); none in part 7.
8. **The limit on depth.** v7 04:105: "When the harness's limit on depth is near". Row in part 8 (v7 08:30); in part 7 only a sentence outside the table (v7 07:36).
9. **The standing page and a lane's design pages.** Row in part 7 (v7 07:26); none in part 8.
10. **Grouping sessions under a product.** v7 04:123. Row in part 7 (v7 07:28, open); in part 8 only in the list at v7 08:40, not a row.
11. **An AI account for the development deployment.** v7 01:30: "Connect an AI account to the development deployment". No row in part 9.

## 4. Counts

A. Fifty findings in the earlier check: 19 lost, 1 unclear part, 19 unmarked decisions, 1 remark in its section 8, 10 seen in passing.

| Verdict | Count |
|---|---|
| Corrected | 37 |
| Partly corrected | 3 |
| Not corrected | 9 |
| Deliberately not taken | 0 |
| No correction called for | 1 |

Of the 39 main findings (lost and unmarked, with the unclear part), 36 are corrected and 3 partly. The 9 not corrected are all from the earlier check's remark and its "seen in passing".

B. Problems found between the parts:

| Kind | Count |
|---|---|
| Same rule stated differently | 9 (4 of them small) |
| Cross-reference that does not hold what is claimed | 3 (none to a missing section) |
| Wrong length or last-section header | 0 |
| Term not defined in "Words used" | 10 |
| Harness or hosting name in parts 1 to 6 outside the allowance | 1, and 1 borderline |
| Open or Unproven not gathered in part 10 | 2 (one of three lines) |
| Part 10 item pointing to a place that does not carry it | 2 (the same as two of the cross-references) |
| Term with no harness or hosting row | 11 |
