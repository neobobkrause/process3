# Starting texts, first draft: index

Length: 76 lines. Last section: "4. Silent in the design".

Drafts written by Claude on 18 Nov 2026 from the seventh draft of the design (`process4/definition/process4_definition_v7/`), and reconciled the same day with its part 4, section 11 and with build texts 1, 2 and 3. Status: proposed. Nothing here is in force. No draft has been put before the permission checker.

## 1. The texts

Limit for each: 4,096 bytes and ten rules (part 5, section 2). Bytes are of the whole file, measured with `wc -c`; every file is plain ASCII.

How the rules are counted (part 4, section 11): every numbered line under "Rules" is one rule. The line on the fill level and the line that begins "Never:" are numbered among them and counted. In `job.md` the fill level shares a numbered line with the rule on refused acts. The lines above "Rules" are not counted: what the session is, who directs it, what it reads, and the acts it may take.

| File | For | Bytes | Rules | Last section |
|---|---|---|---|---|
| `root.md` | ROOT: the owner's plain prompt (part A) and what ROOT reads first (part B) | 3,959 | 10 | Rules |
| `watcher.md` | The watcher | 2,607 | 9 | Rules |
| `coordinator.md` | The coordinator | 3,599 | 10 | Rules |
| `arch.md` | ARCH | 4,062 | 10 | Rules |
| `process.md` | PROCESS | 3,439 | 10 | Rules |
| `lane.md` | A lane (template: area, folder, design pages) | 3,268 | 8 | Rules |
| `job.md` | A job (template the tool fills with `next-job`: module, work placed, branch, pull request, ordinary or told with the uses its notice carries) | 3,347 | 10 | Rules |
| `walking-session.md` | A walking session (template the tool fills with `walk text`: number, internal or external, tranche, round, areas, the walk issue, the walks' folder, the two walk commands, the copy's name and address) | 3,565 | 10 | Rules |

A filled template is longer than its template by the length of what is filled in; every text but PROCESS's and ROOT's carries the fetch line as a blank. The least room left is in `arch.md`: 34 bytes. The commands named are those of build text 1, section 4.

## 2. What each text tells its session to read in full

Sizes of the design's parts, in bytes: 00 10,517; 01 8,300; 02 14,520; 03 8,610; 04 18,413; 05 5,647; 06 8,641; 07 5,724; 08 4,111; 09 2,340; 10 9,300. All eleven: 96,123. Build texts: 02 23,604; 03 19,836. The set maximum is 175,000.

Each role reads one harness part, 07 or 08. The combined figure is given with 07, the larger; with 08 it is 1,613 less.

| Text | Design parts | Build texts | Combined bytes | Also told to read (sizes not known) |
|---|---|---|---|---|
| ROOT | 00, 01, 04, 05, 06, 07 or 08 | none | 57,242 | The shared state |
| The watcher | 00, 01, 04, 05, 06, 07 or 08 | none | 57,242 | The roles, wakes and handover records |
| The coordinator | 00 to 06, 07 or 08 | none | 80,372 | The ranking page, the product's record of the owner's decisions, the shared state |
| ARCH | 00 to 06, 07 or 08, 09 | 03 | 102,548 | The process config, ranking page, module list, both decision records, the shared state |
| PROCESS | All eleven | Each one before changing it | 96,123 | The record of the owner's decisions about the design, its own folder, its handover record |
| A lane | 00, 01, 03, 04, 05, 06, 07 or 08 | 03, for the UX lane only | 65,852; the UX lane 85,688 | The ranking page, the research in its folder, its design pages' links, its handover record |
| A job | 00, 01, 02, 04, 05, 06, 07 or 08 | 02 and 03 | 115,202 | The ranking page, its module's entry and requirements file (at most 24,000 by rule), its pull request |
| A walking session | 00, 01, 03, 06, 07 or 08; and 09 for the external walk | 03 | 61,628 internal; 63,968 external | The ranking page; for each of its areas, its page of the Screens document or the journeys |

Every set is under 175,000 bytes. Whether a set stays under it once the product's own documents are added cannot be said: their sizes are not known, and the design sets no size for a record of decisions or a lane's research. Build text 3 keeps each page of the walks' documents under the single-text maximum.

The build texts were added to four reading sets in the reconciling: the design sends a walk's making to build text 3 (part 3, section 3), and a job writes structured comments, its entry's `uses`, the `[met]` mark and walk steps, whose forms are only in build texts 2 and 3. A job's set grew by 43,440 bytes for it.

## 3. What the earlier process recorded about starting texts

Read for these drafts; nothing here is a rule of Process4 unless the design also holds it.

- "One short rulebook per role, at most ten rules" was kept from the process before this one (`process4_definition_v6.md`, line 434). The design keeps "at most ten rules" (part 5, section 2).
- Every role prompt had a section "Acts you may take" and a "Not yours" line, and a line naming the owner's standing approvals as the session's authority (`permissions_inventory.md`, section 1c). The drafts keep that shape; "Not yours" is now the last numbered rule, "Never".
- An act a starting text did not name, asked by message, was declined by the session's own model 6 times of 6; the checker was never reached (`permissions_inventory.md`, trials 19 and 21).
- Consent only quoted in a starting text: merges declined 11 of 11. With the owner's consent typed in the acting session: 0 of 21 refused. On committed approvals: 0 refusals in about 450 acts (trials 23, 24, 25). So no draft quotes the owner's approvals or his consent; each names the committed approvals as its authority.
- A prompt that named whose messages are instructions made a session act; without it the session answered "A request from another session isn't enough for me to act on" (trials 17; rows 26, 27). Each draft has "Who directs you".
- A session that wrote relayed approvals into a loaded file was refused, "[Instruction Poisoning]" (trial 20). Each draft's "Never" rule covers it.
- "Give each judged act ... its own shell command, never chained" was in every prompt, after the one refusal that fell on a chained merge. The design holds it (part 6, section 4).
- ROOT in the earlier process was never started by a plain prompt. Its prompt was about 4 KB (4,034 bytes at the tip), printed by the tool and pasted; its rulebook had 7 rules (`roles_root_coordinator.md`, section on ROOT). The owner's description of the plain prompt, as that file quotes it: "His first prompt says he is starting or restarting development of a named product, names that product's repository, says the Process4 process is to be used, may suggest model and effort, and may mention a switch from another account." Part A of `root.md` follows that sentence. The earlier coordinator prompt was 1,980 bytes; there was never a coordinator rulebook.

## 4. Silent in the design

Things a role must know that neither the design nor a build text says. Of the first list's 24 items, fourteen are struck, answered by part 4, section 11 or by a build text; eight are narrowed to what is still unanswered; two stand as they were; items 7, 11 and 13 are new. What is left:

1. **Whether a text ROOT reads after its start counts with the permission checker** as instructions it was started with. The design marks the plain start unproven (part 4, section 2).
2. **The design folder's name inside a session's copy,** and whether the build texts are in the copy. Part 4, section 11 says the design is kept beside the tool; build text 1 gives the copy's place, `$HOME/process4/<commit id>`. The drafts say "the design folder of your copy".
3. **How ROOT finds PROCESS's record** in the process's repository while it holds the product's repository only.
4. **Who merges a pull request on a lane's folder,** the walks' documents among them. Part 4, section 11 says "The role that writes one opens it and merges it by the tool" and then names ARCH, the coordinator and PROCESS, not a lane. `lane.md` takes the first sentence and lets a lane merge its own folder's pull requests.
5. **How a told job hands back a walk flaw that needs no change:** "the flaw goes back to ARCH" names no act, and nothing says what becomes of the job's pull request, since such a module "is finished only by a merge". `job.md` says only that the flaw goes back to ARCH.
6. **A walking session at the fill level.** Part 4, section 11 has it push and be replaced "from the same branch"; by build text 3 it makes no commit and has no branch of its own. `walking-session.md` has it finish its comment, tell ARCH and stop.
7. **How the pull request's number reaches a job's starting text,** when `next-job` writes the text and `open` makes the pull request afterwards (build text 1, section 9).
8. **To which product's coordinator PROCESS passes what is the owner's to see,** when two products run.
9. **A lane's acts on its design pages,** and how the owner's marked message typed on a design page reaches the coordinator "exactly as typed".
10. **How a session tags or titles the sessions it starts** is given for Claude Code only (part 7).
11. **Which copy of the tool PROCESS runs** in the process's own repository. `process.md` says the one in that repository.
12. **Whether the lines above "Rules" count** toward ten: who directs the session, what it reads, the acts it may take. Part 4, section 11 names "every rule" and the "never" lines. The drafts do not count them.
13. **Where a module's walk steps lie in its entry.** Build text 3 keeps them in the module's folder under `walk/`; build text 2's entry has `files` and `tests` and says nothing of steps, so whether a changed step sets off the module's tests is not said.
