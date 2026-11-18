# Final check of the seventh draft

Length: 126 lines. Last section: "6. What this check did not do".

Written by a checking session on 18 Nov 2026, with no earlier knowledge of the work. Nothing was edited but this file. Only problems are reported. Nothing here judges whether the design is good, and nothing is proposed.

Short names: P0 to P10 are the eleven parts of `process4/definition/process4_definition_v7/`. DS is `process4/working/design_state_18nov.md`. "L" is a line number in the file as read.

## 1. What was read

All in full, in order, none cut.

| File | Lines |
|---|---|
| `00-index.md` | 89 |
| `01-purpose-owner-and-decisions.md` | 79 |
| `02-modules-jobs-tests-and-the-notice.md` | 107 |
| `03-tranche-rounds-walks-and-release.md` | 72 |
| `04-roles-and-sessions.md` | 138 |
| `05-reading-and-documents.md` | 61 |
| `06-rules-permissions-and-changing-the-process.md` | 71 |
| `07-harness-claude-code.md` | 69 |
| `08-harness-codex.md` | 50 |
| `09-hosting-cloudflare.md` | 28 |
| `10-open-and-unproven.md` | 90 |
| `design_state_18nov.md` | 144 |

Counts: check 1, 17 problems. Check 2, 15 misses. Check 3, 1 problem. Check 4, 15 gaps.

Found sound, so not listed below: all eleven "Length ... Last section" headers are right; no numbered list skips or repeats a number; every file path a part names exists; each part is under 24,000 bytes and the eleven together are 88,328 bytes; parts 1 to 6 name a harness only in P5 and name no hosting provider and no product.

## 2. Check 1: the parts against each other

Most serious first.

1. **The roles record has one writer, and the watcher also writes it.** P4 L72: "| Roles | Which session holds ROOT, the watcher, ARCH, the coordinator and PROCESS | ROOT |". P4 L84: "So every record has exactly one writing session." Against P4 L107: the watcher "writes itself into the roles record as ROOT". At that moment the old ROOT has only "missed two wakes" and may still exist (same line: "archives the old ROOT session if it still exists"), so two sessions can write one record.

2. **The tool is the only door to GitHub and "does only this", yet a told job must close a pull request.** P6 L24: the forbidden commands take away "every GitHub command ... So the tool is each session's only door to GitHub." P6 L36: "It does only this: push; open a pull request and mark it ready; merge; ..." The list has no closing of a pull request. Against P2 L76: "A told job that finds nothing to change runs the related tests in its own session, records the result in its pull request, and closes it unmerged."

3. **The same limit, against preparing and publishing a release.** P6 L36 (as above) lists no act that makes a release or a tag. Against P3 L59: "ARCH prepares the release and waits for the owner's approval", P4 L10 (ARCH "prepares a release"), and the reading at P3 L60: "ARCH publishes the release in the product's repository".

4. **When a module is finished is stated two ways.** P2 L41: "A module whose only work was a notice is also finished when its job records in its own pull request that nothing needs changing", and that pull request is closed unmerged (P2 L76). Against P4 L84: "Which modules are finished is worked out afresh from GitHub's own record of merged pull requests each time."

5. **The lanes record has two writing roles.** P4 L68: "Each record has one role that writes it." Against P4 L73: "| Lanes | Which session holds each lane | The starter of the lane |", and P4 L25 and L26, where the starters are both ARCH ("Jobs, walking sessions, the product's lanes") and PROCESS ("Its own lanes").

6. **PROCESS is one session at a time, and nothing shared can hold that across two products.** P6 L64: "PROCESS runs as one session at a time". Against P4 L7 (each product's ROOT "starts PROCESS when asked"), P4 L72 (PROCESS is named in a product's own roles record) and P2 L49: "no record is shared between two products".

7. **ARCH touches no code, and a worker in ARCH's session changes code.** P2 L15: "ARCH writes and rewords the requirement text, and touches no code and no tests." Against P2 L104: "a worker in ARCH's session makes it as one change covering every affected module, and it is merged once".

8. **Where module tests run.** P2 L55: "Module tests run for the job's own module only, on GitHub's machines, when the job marks its pull request ready." Against P2 L76: a told job "runs the related tests in its own session", and P2 L75, where the same told job's related tests are the scope of the "one required run" on GitHub.

9. **A cross-reference that does not hold what is claimed.** P2 L105: "A change that touches only files in a lane's own folder needs no module tests. Design documents do not need testing. **Reading:** this is among the lane rules he has not confirmed one by one (part 4, section 3)." P4 section 3 (L36 to L58) has no rule about module tests or the testing of design documents.

10. **A cross-reference that claims more than exists.** P6 L19: "The ordered list of his acts to start a product is in each harness's part (part 7, section 4)." P8 has three sections (L7, L38, L48) and no list of the owner's acts.

11. **"No history" against lines that carry it.** P0 L10: "It carries no history of how the design came to be." P5 L39: "The design document names no product and carries no history." Against P0 L27: "one of 34 rules carried unchanged from the sixth draft, where they stood with no mark"; P4 L33: "as the sixth draft quotes it"; P5 L22: "kept from the process before this one".

12. **What gives a module work.** P2 L21: "A requirement in its file is marked not yet met, or a walk flaw or a notice has been placed against it." Against P2 L25: "A flaw it finds in another module goes to ARCH, which places it against that module." That flaw is neither a walk flaw nor a notice, and the waiting-work record (P4 L78) holds only "Notices and walk flaws". P2 L40 to L43 give no rule for when such work is finished.

13. **The development deployment holds no secrets, and the owner connects an AI account to it.** P0 L74: "It holds no secrets and keeps no permanent record." P9 L12 says the same. Against P1 L30: "| Connect an AI account to the development deployment | Before an external walk of journeys that use AI |".

14. **Where a session starts from.** P4 L31: "A session is started with one repository only; from the newest commit of the tranche branch; ... PROCESS works in the process's own repository." Against P6 L17, where the process's repository has only "its main branch"; the rule as written cannot apply to PROCESS.

15. **The owner's acts table leaves out one start of ROOT.** P1 L22: "| Start ROOT | At each start or restart of development; after any full stop; and ... after each edit to his approvals |". Against P4 L110: "When the harness's limit on depth is near, ROOT puts it on the owner's standing page, and the owner starts a fresh ROOT at a pause."

16. **What a role is.** P0 L50: "**Role:** a standing responsibility that one session holds at a time: ROOT, the watcher, the coordinator, ARCH, a lane, PROCESS." Against P0 L51: "**ROOT, the watcher, the coordinator, ARCH, PROCESS:** the standing roles (part 4). A job, a walking session and a worker hold no standing role." A lane is in the first list and in neither half of the second.

17. **A mark that the list of marks does not have.** P0 L22 to L25 define four marks. P10 L54 uses a fifth: "**Claude judged** that it needs the owner for one sitting".

## 3. Check 2: part 10 against parts 0 to 9

### 3.1 Marked in parts 0 to 9, not gathered in part 10

1. P0 L55: "**Reading:** a role's starting text is the same thing for a standing role, and a role's principles are the rules in that text." Not in P10 section 1. P10 L17, "The other readings", does not name it.
2. P0 L57: "**Reading:** an architecture bug is a fault in the design itself; an implementation error is a fault in code or text that does not follow the design". P10 L17 names only "how an architecture bug is corrected (part 1, section 6)", which is the other reading, at P1 L57.
3. P7 L38: "**Open (a session):** where cost can be read is not named anywhere read". Not in P10 section 2 (L25 to L27). P10 L80 has it only as a thing the first tranche can show.
4. P6 L66: "**Unproven:** nothing physical stops a session building a product from changing the process's files, or from moving to a changed process." Not in P10 section 3. It is at P10 L89, under "Risks with no trial".
5. P7 L56: "**Unproven:** none of it has been carried out for Process4" (the owner's ten acts). P10 L49 gathers only "Everything listed as not proven on Claude Code in part 7", which is P7 section 3, and the read-only copy.
6. P2 L105: the reading on a lane's folder (quoted at 2.9 above). P10 L17 gathers "the lane rules he has not confirmed one by one ... (part 4, section 3)", and that section does not hold this rule, so P10 points nowhere that carries it.
7. P3 L58: "**Reading:** the install and the update run on a development account; "successful" means ...; on a failure no release is offered and the fault becomes work in the next tranche." P10 L14 gathers only "what "successful" means for the install and the update".

### 3.2 In part 10, with no place in parts 0 to 9 that carries it

8. P10 L25: "How the owner's approval of a release reaches the session that publishes it (part 3, section 6)." P3 section 6 (L55 to L62) has no such line; its open line, L60, is "**Open (the owner):** who carries out the act of publishing".
9. P10 L19: "which Codex model the process is to use, which no part states." By its own words, no part carries it.
10. P10 L39: "**A walk ending without flaws.** None did in the process before this one." No Unproven line in P3 says this; P3 L40 says only that no walk "has ever been made by a session".
11. P10 L42: "**The tranche branch merging into the main branch.**" P3 L50 states the merge with no Unproven mark.
12. P10 L44: "**A stop on the owner's word** that the hourly wake does not undo; a held merge; a module put first; a new slot number." P4 L138, P4 L76 and P2 L47 state these with no Unproven mark.
13. P10 L47: "**An edit to the approvals with a restart** that carries a round on." P4 L115 states it as "Claude decided" with no Unproven mark.
14. P10 L26: "no procedure is written yet". P3 L71 states the rule with no Open mark.
15. P10 L27: "Each product's conversion plan. It is not part of this document." P0 L11 names the plan with no Open mark.

## 4. Check 3: the draft against the design state

Every rule of DS sections 1 to 14, and what DS section 15 calls owed, was looked for in the draft, with its mark. One problem.

1. **History.** DS L29: the design document "carries none of the history of how the design got to its present state." The draft states the rule (P0 L10, quoted at 2.11) and also carries the lines quoted at 2.11: P0 L27, P4 L33, P5 L22.

No rule of the design state was found missing, and none was found with the wrong mark.

## 5. Check 4: what a session building the process could not act on

Most blocking first. Each says only what is missing.

1. The tool: its language, where its code is kept, its commands, how it signs in to GitHub, and how a session gets and runs it (P6 L34 to L42 say only what it does; P7 L37 leaves the fetch unproven).
2. The starting text of each role: no text is given, nor where the texts are kept, nor who writes the starting instructions of any session but a job (P4 L17 covers jobs only).
3. The form of a structured comment and of an interface listing (P2 L70, L86 to L88 name them and give no form).
4. The form and place of the module list, a requirements file (numbers, the "met" mark) and the process config (P0 L89 lists what the config holds, not its form).
5. The required test run on GitHub's machines: what defines it, what its "two parts" are (P2 L62), and how the tool "sets its scope" there (P2 L75).
6. How a walk is made and kept: who writes a walk's steps and where; where a walking session saves its flaws, since it has no pull request and writes no record (P4 L84, L121); how the internal walk runs the product "without deploying it" (P0 L68).
7. How a stop on the owner's word is lifted, and who clears the stop record (P4 L138 says only how it is made).
8. What becomes of the running ROOT, watcher and other sessions when the owner starts a new ROOT after an edit to his approvals (P4 L115).
9. What a round does with a module recorded as blocked (P4 L132), when "a round's jobs are done" needs every module finished (P2 L43).
10. Which roles are long-lived besides ARCH (P4 L93 names only ARCH; P4 L79 gives each one a handover record).
11. Who makes the tranche branch for the second and later tranches, what sessions start from between tranches, and how job branches are named (P7 L65 covers only the first, as the owner's act).
12. Which session's tool removes a standing note, and how that keeps to one writer for each record (P4 L64, L84); and how a held merge reaches ARCH, which merges.
13. Who writes and keeps the owner's standing page, and which session sends the notification to his phone (P1 L51).
14. The watcher's wake interval, how "missed two wakes" is told, and what "near" the limit on depth means (P4 L106 to L110).
15. Where the written procedures, the notes with each release, the tranche report and the account after each round are kept; none is among the kinds of file at P2 L9.

## 6. What this check did not do

- It did not check the draft's quotations against the owner's typed words, or the draft against the sixth draft, except to read the sixth draft's line on the tranche report (DS L64).
- It did not count the "34 rules" of P0 L27 against the file that lists them.
- It did not read the working files the draft points to; it confirmed only that each exists.
- It reported no rule that the draft has and the design state lacks.
