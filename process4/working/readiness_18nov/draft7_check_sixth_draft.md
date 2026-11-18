# Seventh draft checked against the sixth draft

Length: 164 lines. Last section: "9. Seen in passing, outside what I was asked to judge".

Written by a checking session on 18 Nov 2026. It reports only what it read. It does not judge the owner's decisions and proposes nothing.

Short names used below: **v6** is `process4/definition/process4_definition_v6.md`. **v7** is the folder `process4/definition/process4_definition_v7/`, and "v7 02:27" means line 27 of the file whose name starts with 02. **DS** is `process4/working/design_state_18nov.md`. **Coherence** is section 3 of `process4/working/readiness_18nov/coherence.md`.

## 1. What was read in full

| Text | Lines |
|---|---|
| v7 `00-index.md` | 73 |
| v7 `01-purpose-owner-and-decisions.md` | 79 |
| v7 `02-modules-jobs-tests-and-the-notice.md` | 100 |
| v7 `03-tranche-rounds-walks-and-release.md` | 72 |
| v7 `04-roles-and-sessions.md` | 122 |
| v7 `05-reading-and-documents.md` | 53 |
| v7 `06-rules-permissions-and-changing-the-process.md` | 67 |
| v7 `07-harness-claude-code.md` | 41 |
| v7 `08-harness-codex.md` | 44 |
| v7 `09-hosting-cloudflare.md` | 22 |
| v7 `10-open-and-unproven.md` | 87 |
| v7, all eleven | 760 |
| DS | 143 |
| v6 lines 11 to 27 | 17 |
| v6 lines 171 to 425 | 255 |
| v6 lines 483 to 537 | 55 |
| Coherence, lines 35 to 249 | 215 |

Also looked at, only to find where a v7 sentence came from: v6 lines 430 to 438 and 481. No verdict is given on those lines.

## 2. The count

243 rules of the sixth draft's three ranges were checked. A rule here is one statement that tells a session, the tool or the owner what is so or what to do; a paragraph of v6 usually holds several.

| Verdict | Count |
|---|---|
| CARRIED (as it was, or in the form the design state gives it) | 223 |
| LOST | 19 |
| STALE | 0 |
| KEPT THOUGH REMOVED | 0 |
| No verdict: Coherence calls it UNCLEAR, and v7 dropped it without a mark (section 6) | 1 |

By part of v6: section A, 16 checked, 1 lost. Section C, 81 checked, 7 lost, 1 without verdict. Section D, 36, none lost. Section E, 15, 3 lost. Section F, 28, 3 lost. Section G, 9, none. Section H, 8, none. Section I, 17, none. Section M, 5, 2 lost. Section N adds nothing not already counted. Section O, 28, 3 lost.

Not counted, as the brief says: history, the owner's dated words given only as a source, counts and facts about one product, and what DS section 10 leaves out.

Most of the 19 are small: a detail of a rule whose main part is carried. Each says so.

## 3. LOST

Each is in v6, is not in v7, and nothing in DS removes it.

1. **Who merges a job.** v6 251: "**ARCH merges it** into the tranche branch with the process's tool". v6 194: "It starts jobs, merges them". v7 02:27 says "**The job is merged** into the tranche branch with the tool" and names nobody. v7 04:10 lists ARCH's duties and merging a job is not among them. v7 06:34 lists "merge" among what the tool does. DS 82 moves three things to the tool; merging a job is not one of them.
2. **A test runs only for a reason.** v6 289: "A test runs only when there is a fully informed reason to run it (line 19)." Not in v7. Coherence (row B.7) says line 19 stands.
3. **Module tests are fast.** v6 291: "they \"must be complete yet fast and efficient\" (your words)". v7 02:55 gives DS 17's wording of the duty. DS 17 says nothing about speed, and neither does v7.
4. **Comments and the tool inform module tests.** v6 291: "The comments and tool can also inform module tests to ensure that boundaries are properly checked." Not in v7.
5. **The tranche report lists the UX lane's changes.** v6 227: "The report at the end of a tranche lists every change the UX lane made, during that tranche, to the two documents the walks are measured against." v7 03:53 gives the report's contents without it. v7 03:34 names those changes only in the account after each round. DS 64 says the report "stands as the sixth draft has it".
6. **One session for each lane is held by a record.** v6 224: "One session per lane is held by a record written before the session is started, which refuses a second start while the first is live." v7 04:41 keeps "one session at a time" and v7 04:62 has a roles record, but nothing refuses a second start.
7. **PROCESS follows the lane rules.** v6 229: "PROCESS follows the lane rules where they fit: one session at a time, its own folder (in the process's repository, not the product's), research recorded before it proposes." v7 has the one session (00:50) and the repository (06:60). Its own folder, and research recorded before it proposes, are not there.
8. **A lane decides wording.** v6 210: "a lane decides design and wording in its area". v7 04:43: "A lane decides design in its area". Small: two words.
9. **ARCH gives a lane enough to decide.** v6 212: "ARCH recognises a design question, passes it to the lane with enough context to decide, waits for the lane's decision". v7 04:45 has only "Questions from the work reach a lane only through ARCH". The waiting is covered by v7 04:10 ("settles a design before anything is built on it"); the "enough context" is not. Small.
10. **Only two refusals.** v6 349: "The proof session's further refusals (twenty-three of them) are not taken. Only the two refusals you approved stand." v7 02:58 has the two and does not say there are no others.
11. **A comment ties each call by name to the list.** v6 346 ends: "and each shared piece that carries a call by name has one comment tying the name to that list." v7 02:81 stops at "the tables are gathered into one list". Small.
12. **What the tool's own tests are made from.** v6 350: "The changes recorded in the proof become the tests of the process's own tool". v7 06:36 has the tool's tests and not this.
13. **Where the Process4 work is kept.** v6 485: "the Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository." DS 101 repeats it. v7 says only "the process's repository" (05:44) and "the working folder" (08:44).
14. **Who builds, and when.** v6 491: "Builder: Claude, before anything is in force." v7 06:39 and 10:34 say the tool is not built; neither says who builds it or by when.
15. **How the owner commits his approvals.** v6 183: "on GitHub's website". v6 406: "You commit it yourself on GitHub's website." v7 06:13: "He commits it himself." v7 01:27 likewise. The means is gone. v7 06:18 leaves the list of his acts open. Small.
16. **The meaning of "pull request".** v6 18: "**Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging." v7 uses both terms (02:25 to 02:27) and the words list (00:45 to 00:73) has neither. A meaning, not a rule.
17. **A trial item: the slot rule.** v6 505: "That the rule for who takes a free slot gives the same answer every time." Not in v7 part 10, section 4 (10:53 to 10:71).
18. **A trial item: the hosting account bears the walkers.** v6 516: "the Cloudflare account bears the external walkers", and v6 271: "is measured in the trial". v7 10:67 (trial item 8) leaves it out. v7 keeps it as unproven (03:40, 10:41) and not known (09:20), but no longer says the trial measures it.
19. **A trial item: the account switch.** v6 519: "An account switch loses no work." v7's trial list (10:60 to 10:71) has no account switch. v7 keeps it as unproven (04:101, 10:48).

## 4. STALE

None found. Every rule the design state changed appears in v7 in its changed form.

## 5. KEPT THOUGH REMOVED

None found. The things DS removes are absent from v7: the internal walk "at any time on your word" (DS 63), the start-up comparison of approvals and the size refusal among the tool's tests (DS 19), the full regression (DS 18), triage lanes (DS 63), the ledger (DS 28), and each item of DS section 10 (DS 96).

## 6. An unclear part that v7 settled without a mark

- v6 226: "Every question ARCH puts to a lane, and every answer, is written in the shared record." Coherence (row C.18c) calls it UNCLEAR and gives two readings: no longer kept, or kept in one record rewritten in place. v7 has no such record (the table at 04:60 to 04:68) and says "The message itself is not stored" (04:106). So v7 took the first reading. It carries no "Reading:" mark and is not in v7 part 10.

The other unclear parts in the ranges are marked in v7: the lane rules (04:37, "Reading"), what the shared state holds (04:56, "Claude decided"), when a module's work is finished (02:38, "Claude decided"), how a tranche ends (03:48 and 03:49, "Reading" and "Open"), where the approvals live (06:17 and 06:18, "Claude decided" and "Open").

## 7. New decisions with no mark

v7 00:27 says: "A rule with no mark is the owner's ruling, or follows from one directly." Each line below decides something that neither the v6 ranges nor DS decides, and has no mark.

1. **The process config.** v7 00:73 defines a new file: "the product's short file of process settings: the process version it runs on, the slot number, its lanes, its hosting provider and development account, and the folder of the walks' documents". It is used at 02:85, 03:33, 04:40, 06:37 and 09:11. v6 has no such file anywhere; v6 418 says the process version is "named in the plan". DS has none. The words "process config" do appear in the owner's standing approvals in the repository's `CLAUDE.md`, but what the file holds is v7's choice. The slot number is in two places in v7: here, and in the shared state's standing notes (04:65).
2. **The tool's language reader is a fact of the product.** v7 02:85: "Which language reader the tool uses is a fact of the product and is named in its process config." v6 347 (Claude decided) fixed it: "The tool is TypeScript's reader, reading plain JavaScript." The sentence stands after v7's numbered "Claude decided" list, outside it.
3. **A role rewrites its handover before it asks for a refresh.** v7 04:79: "Before it asks, the role rewrites its handover record." The handover record itself is marked (04:56, 04:68). This step is in the next section, unmarked.
4. **ROOT replaces the watcher.** v7 04:80. Unmarked. (The rest of that line points to section 6, which is marked.)
5. **Any session may start workers.** v7 04:26: "Any session | Its own workers". v6 198 says "a helper that ARCH or a job starts"; v6 208 also has lanes use workers. v7 widens it to every session.
6. **Two additions to how things are put to the owner.** v7 01:47: "Nothing that points to something he has not seen." v7 01:48 adds to each option "and what it gives and costs". Neither is in DS 50, DS 11 or the v6 ranges.
7. **On Codex a refresh comes only at a pause.** v7 05:25: "A hosted Codex session shows no fill level (part 8), so there the refresh comes only at a natural pause." Also v7 08:34.
8. **Where the two records of decisions are kept.** v7 05:44 puts the product's record "in that product's repository". v7 05:48 says ARCH's decisions are written "apart from the owner's". DS 29 and DS 48 say less.
9. **A new trial item.** v7 10:71: "An install and an update are run and confirmed on a development account." v6's trial list (507 to 520) has no install or update; its nearest line is "a release can be prepared as far as your approval" (v6 520).
10. **A rule for the open design work.** v7 10:21: "None needs the owner unless the answer changes what the product does or asks an act of him."
11. **"Public" dropped from the owner's approval of a release.** v6 181: "Approve a public release | Once per public release". v7 01:25: "Approve a release | Once for each release", with a new meaning of the word at 00:65: "a version of the product offered for installing". The owner's standing approvals in `CLAUDE.md` let sessions cut development releases without asking; v7's wording does not keep the two kinds apart.
12. **What saves a message's content.** v7 04:106 adds: "in the sender's pull request, in the repository, or in a record of the shared state". Small; DS 128 says only that it is saved before the message is sent.
13. **Details of the development site.** v7 09:12: "under names kept apart from any installed site". v7 09:13: the deploy token is "for the development account only". Neither is in the v6 ranges or DS. DS 142 lists "who can read the deploy token" as still to be settled; v7 neither settles it nor lists it as open.

**Marks that were dropped.** These were marked as Claude's in v6 or DS and stand in v7 with no mark, so by v7 00:27 they now read as the owner's rulings:

14. v6 297, "Tests and steps that jobs write (*Claude decided*)": v7 02:59, no mark.
15. v6 271, "*Claude decided* the rest: a walk happens when no job is open, so walking sessions use the job slots": v7 02:48 and 04:14, no mark.
16. v6 260, "Claude's answer: yes. A helper in ARCH's session makes the edit as one change ... and it is merged once": v7 02:97 marks only the moment, not this.
17. DS 119, "Claude decided: the session that started a session archives it": v7 04:82, no mark.
18. DS 42, "Claude's addition: each governing text says at its top how long it is": v7 05:11, no mark.
19. DS 19, "Claude decided ... the start-up comparison of Bob's approvals is not kept ... The size of a role's starting text is not a refusal": v7 05:30 and 06:14, no mark.

## 8. New decisions that are marked

Listed so that the owner can see them in one place. Each decides something the v6 ranges and DS do not.

**Marked "Claude decided":**

- v7 01:67 to 01:79: the first list of nine weaknesses, each with its sign and what the session does; "it grows only at PROCESS".
- v7 02:9: every file belongs to a module, a lane's folder or the process's named files; ARCH gives an unowned file to a module before any job touches it.
- v7 02:34: a job's tests run on its pull request as GitHub would merge it at that moment; a later merge does not run them again.
- v7 02:38 to 02:43: a notified job records "through the tool" that nothing needs changing (v6 256 had it tell ARCH); a module with a walk flaw is finished only by a merge, else the flaw goes back to ARCH; when a round's jobs are done.
- v7 02:89 to 02:93: ARCH decides an interface between two modules; no merge of several modules together except the mechanical edit; the provider accepts the new form beside the old; otherwise the boundary is an architecture bug.
- v7 02:99: requirement text, the module list and the process's named files merge with no module tests run. (That the test run must report on such pull requests is from v6 488.)
- v7 03:24: what an area is, and how ARCH works out a round's areas.
- v7 03:39: a walk is shared by area (v6 271 said by journey); each run and each deployment step fits the time a session can run one thing.
- v7 04:17: the tool chooses the next job and writes its starting instructions; ARCH's session makes the start.
- v7 04:56 to 04:72: the seven records of the shared state and the writer of each, the handover record among them; the owner's decisions are not kept there.
- v7 04:88 to 04:95: the watcher's design. Its own scheduled wake; takeover after ROOT misses two wakes; it writes itself in as ROOT, starts a new watcher, tells the coordinator, archives the old ROOT; ROOT's own refresh is the same takeover; each takeover leaves ROOT one level deeper, and near the limit the owner starts a fresh ROOT.
- v7 04:100: what an edit to the approvals does to a running round.
- v7 04:117: the tool counts failed runs from GitHub's record; a replacement that also fails twice leaves the module blocked and the matter goes to ARCH.
- v7 06:17: where the approvals live.

**Marked "Reading:":**

- v7 03:48: a tranche ends when a round's partial walks both come clean, or when a full walk the owner asked for is clean.
- v7 03:49: in the round that would end the tranche, ARCH adds every named journey not yet walked clean.
- v7 03:52: a tranche merged with its flaws named has not ended; its flaws become work in the next tranche.
- v7 03:60: ARCH publishes the release in the product's repository; promoting it is the owner's.
- v7 03:67: an urgent fix pauses the open tranche, is built from the main branch and merged, and the paused tranche then takes the main branch in.
- v7 04:37: the lane rules are given as the design though the owner has not confirmed each.
- v7 05:52: mission is highest and design decisions lowest.

**Marked "Open":**

- v7 02:72: names two possible answers for which tests a told job runs.
- v7 02:49 and 02:73: give these to ARCH. v6 498 said "Claude will settle this"; v7 10:21 says "for a session to do".
- v7 03:49, 03:60, 03:67: put to the owner what shows the named journeys complete, who publishes, and what happens to an open tranche at an urgent fix.
- v7 04:73: what on GitHub carries the shared state, with a first candidate (one issue, one comment for each record).
- v7 06:18: the ordered list of the owner's acts and the wording of his approvals.
- v7 07:26: what groups a product's sessions on Claude Code.
- v7 10:17: which Codex model the process is to use.

## 9. Seen in passing, outside what I was asked to judge

- **Carried, but thinner.** These are counted as CARRIED; a detail is missing. v6 517, a mechanical edit merged "with the touched modules' tests run and with none run": v7 10:68 says only "merges once". v6 520, sessions "load your approvals and the deny list ... a release can be prepared as far as your approval": v7's trial list has the approvals (10:60, 10:70) and not the deny list or the prepared release (the release is at 10:46 as unproven). v6 514, "the alarm does not undo a stop": gone from the trial list (10:65), kept at 10:47. v6 271, a session "can run one thing for about 30 minutes": v7 03:39 keeps the rule without the figure, and part 7 does not give it. v6 325, that a change to the words stating a bound is a change to the interface: only implied by v7 02:68 and 02:79.
- **The tranche report, from a line outside my ranges.** v6 438 gives the report two more contents: "the overhead share, ARCH's idle time while work was ready". v7 03:53 has neither. DS 64 says the report stands as v6 has it. No verdict: v6 462, which may have ended those measurements, is outside what I read.
- **A lane measurement.** v6 206 says whether a lane's session is kept running "is one of the measurements your Foundations set for the end of the first tranche". Not in v7. No verdict, for the same reason.
- **Three v7 sentences that looked new and are not.** "A session acts only on what it has read in full or measured" (05:7), a requirement's "permanent number" (02:14) and the product's `CLAUDE.md` "under thirty lines" (07:19) are all from v6 434. Module tests "in two parts" (02:60) is from v6 481.
- **Two facts stated in v7 that are not in anything I read.** v7 03:40: "No walk of either kind has ever been made by a session." v7 09:21: the two late deployments ran "on GitHub's machines". v6 271 gives the 60 and 64 minutes and does not say where they ran.
- **Inside v7.** The list of what the tool "does only" (06:34) does not include the two refusals inside module tests (02:58), the check of declared uses (02:57), or removing a standing note (04:71).
