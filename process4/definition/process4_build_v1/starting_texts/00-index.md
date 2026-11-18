# Starting texts, first draft: index

Length: 83 lines. Last section: "4. Silent in the design".

Drafts written by Claude on 18 Nov 2026 from the seventh draft of the design (`process4/definition/process4_definition_v7/`). Status: proposed. Nothing here is in force. No draft has been put before the permission checker.

## 1. The texts

Limit for each: 4,096 bytes and ten rules (part 5, section 2). Bytes are of the whole file, measured with `wc -c`; every file is plain ASCII.

| File | For | Bytes | Rules | Last section |
|---|---|---|---|---|
| `root.md` | ROOT: the owner's plain prompt (part A, 335 bytes) and what ROOT reads first (part B, 2,929 bytes) | 3,306 | 10 | Never |
| `watcher.md` | The watcher | 2,548 | 8 | Never |
| `coordinator.md` | The coordinator | 3,367 | 10 | Never |
| `arch.md` | ARCH | 3,724 | 10 | Never |
| `process.md` | PROCESS | 3,226 | 10 | Never |
| `lane.md` | A lane (template: area, folder, design pages) | 3,053 | 10 | Never |
| `job.md` | A job (template the tool fills: module, work placed, branch, pull request, ordinary or told with the uses its notice carries) | 3,138 | 10 | Never |
| `walking-session.md` | A walking session (template: internal or external, round, areas, where flaws are saved, the walks' folder, the site's address) | 2,646 | 10 | Never |

A filled template is longer than its template by the length of what is filled in. The largest room left is in `arch.md`: 372 bytes.

## 2. What each text tells its session to read in full

Sizes of the design's parts, in bytes: 00 10,130; 01 8,300; 02 14,520; 03 8,473; 04 15,785; 05 5,647; 06 8,441; 07 5,724; 08 4,111; 09 2,340; 10 8,515. All eleven: 91,986. The set maximum is 175,000.

Each role reads one harness part, 07 or 08. The combined figure is given with 07, the larger; with 08 it is 1,613 less.

| Text | Design parts | Combined bytes | Also told to read (sizes not known) |
|---|---|---|---|
| ROOT | 00, 01, 04, 05, 06, 07 or 08 | 54,027 | The shared state |
| The watcher | 00, 01, 04, 05, 06, 07 or 08 | 54,027 | The roles, wakes and handover records |
| The coordinator | 00, 01, 02, 03, 04, 05, 06, 07 or 08 | 77,020 | The ranking page, the product's record of the owner's decisions, the shared state |
| ARCH | 00, 01, 02, 03, 04, 05, 06, 07 or 08, 09 | 79,360 | The process config, ranking page, module list, both decision records, the shared state |
| PROCESS | All eleven | 91,986 | The record of the owner's decisions about the design, its own folder, its handover record |
| A lane | 00, 01, 03, 04, 05, 06, 07 or 08 | 62,500 | The ranking page, the research in its folder, its design pages' links, its handover record |
| A job | 00, 01, 02, 04, 05, 06, 07 or 08 | 68,547 | The ranking page, its module's requirements file (at most 24,000 by rule), its pull request |
| A walking session | 00, 01, 03, 06, 07 or 08; and 09 for the external walk | 41,068 internal; 43,408 external | The ranking page; the Screens document or the journeys, for its areas |

Every set of design parts is under 175,000 bytes. Whether a set stays under it once the product's own documents are added cannot be said: their sizes are not known, and the design sets no size for the Screens document, the journeys, a record of decisions or a lane's research.

## 3. What the earlier process recorded about starting texts

Read for these drafts; nothing here is a rule of Process4 unless the design also holds it.

- "One short rulebook per role, at most ten rules" was kept from the process before this one (`process4_definition_v6.md`, line 434). The design keeps "at most ten rules" (part 5, section 2).
- Every role prompt had a section "Acts you may take" and a "Not yours" line, and a line naming the owner's standing approvals as the session's authority (`permissions_inventory.md`, section 1c). The drafts keep that shape.
- An act a starting text did not name, asked by message, was declined by the session's own model 6 times of 6; the checker was never reached (`permissions_inventory.md`, trials 19 and 21).
- Consent only quoted in a starting text: merges declined 11 of 11. With the owner's consent typed in the acting session: 0 of 21 refused. On committed approvals: 0 refusals in about 450 acts (trials 23, 24, 25). So no draft quotes the owner's approvals or his consent; each names the committed approvals as its authority.
- A prompt that named whose messages are instructions made a session act; without it the session answered "A request from another session isn't enough for me to act on" (trials 17; rows 26, 27). Each draft has "Who directs you".
- A session that wrote relayed approvals into a loaded file was refused, "[Instruction Poisoning]" (trial 20). Each draft's "Never" covers it.
- "Give each judged act ... its own shell command, never chained" was in every prompt, after the one refusal that fell on a chained merge. The design holds it (part 6, section 4).
- ROOT in the earlier process was never started by a plain prompt. Its prompt was about 4 KB (4,034 bytes at the tip), printed by the tool and pasted; its rulebook had 7 rules (`roles_root_coordinator.md`, section on ROOT). The owner's description of the plain prompt, as that file quotes it: "His first prompt says he is starting or restarting development of a named product, names that product's repository, says the Process4 process is to be used, may suggest model and effort, and may mention a switch from another account." Part A of `root.md` follows that sentence. The earlier coordinator prompt was 1,980 bytes; there was never a coordinator rulebook.

## 4. Silent in the design

Things a role must know that the design does not say. None is filled in the drafts; where a draft needed a word in that place, it carries a blank or the plainest wording, and the item is here.

1. **Where starting texts are kept, and who writes them.** Open design work (part 10, section 2, item 5). So the plain prompt cannot say where ROOT's text is; `root.md` leaves a blank.
2. **How a plain-started ROOT comes to its text at all.** The design says ROOT's instructions "name no acts" and marks it unproven (part 4, section 2). Whether a text ROOT reads after its start counts with the permission checker as instructions it was started with is not said.
3. **Where the design folder is for a session.** Each session "fetches a read-only copy" of the process; the path is not given, and how a one-repository session fetches it is unproven (part 7).
4. **The tool's commands.** Not designed (part 10, section 2, item 4). The drafts name acts in plain words, not commands. The earlier record shows sessions declining acts their text did not name; whether a plain name is enough is not known.
5. **Who "directs" each session.** Part 1 makes a message from "the session that directs a session" an instruction, and no part says which session that is for any role. The drafts take the starter (ROOT for the watcher; ARCH for a job, a walking session, a lane). For ROOT, the coordinator, ARCH and PROCESS the drafts name the owner, and treat ROOT only as starter and replacer. Whether a coordinator's message is an instruction to ARCH (a held merge, a stop, a marked decision) is not said in those words.
6. **Who creates ROOT's and the watcher's scheduled wakes.** The design says each has one. The drafts name "set your hourly scheduled wake" as an act, since an unnamed act is declined; the design does not say it.
7. **Two "first" acts for a restarted ROOT.** Starting the watcher is ROOT's first act after fetching (part 4, section 6); a restarted ROOT first archives the recorded sessions (part 4, section 7). The order between them, and how ROOT tells a restart from a first start, is not said.
8. **How ROOT wakes a stopped session,** by message or by interrupting, and how it decides between waking and replacing. How ROOT finds PROCESS's record in the process's repository while holding the product's repository only.
9. **Who merges a pull request that is not a job's:** the coordinator's record of decisions, a lane's folder, requirement text, the process's named files, and in the process's repository PROCESS's own changes. The design says these "merge through the tool" and names ARCH as merger only for jobs and the tranche.
10. **What carries the record of decisions between writes,** given one tranche branch that changes only by pull request: whether the coordinator opens one pull request per decision.
11. **Who sends the one plain message when the process is completely blocked.**
12. **How ARCH learns the owner asked for a full external walk, approved a held merge or put a module first,** other than the standing notes; a message is named only for a held merge and a stop.
13. **What a job does at the fill level.** A job is not long-lived and writes no handover record; the design says only that ARCH replaces a job that fills up. How ARCH learns of it is not said, and a job is given "one message" to ARCH. The same for a walking session, for which no replacement is described at all.
14. **Whether a job may run its module's tests itself** before marking its pull request ready. The design names only the run on GitHub's machines. `job.md` names no such act.
15. **Whether a job makes its own branch and opens its own draft pull request,** or is handed them. The template takes them as handed, as the task for these drafts says.
16. **How a told job with a walk flaw hands it back:** "the flaw goes back to ARCH" names no act of the job's.
17. **The walks** (part 10, section 2, item 9): who writes a walk's steps; where a flaw is saved and in what form; how the internal walk runs on a product that is not deployed; who builds the product for a walk; how a walking session reports that its areas are done; how it learns the development site's address.
18. **Whether a walking session may start workers.** The table of who starts whom gives workers to a long-lived role or a job only. `walking-session.md` says it starts none.
19. **Who builds and changes the tool.** "The AI builds the tool"; PROCESS changes the process. `process.md` names writing the tool among PROCESS's acts.
20. **How PROCESS shows something on the owner's standing page** when a product's coordinator keeps the page and PROCESS works in another repository; and to which product's coordinator.
21. **A lane's acts on its design pages,** and how the owner's marked message typed on a design page reaches the coordinator "exactly as typed".
22. **How a session reads its fill level on a harness that shows none,** beyond "the refresh comes only at a natural pause"; and what counts as a natural pause for each role.
23. **How a session tags or titles the sessions it starts** is given for Claude Code only (part 7).
24. **Whether the ten-rule limit counts the lines under "Never"** and the line on the fill level, or only the numbered rules. The drafts count the numbered rules.
