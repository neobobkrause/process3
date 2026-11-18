Length: 141 lines. Last section: "5. What the trial cannot show".

# Process4 build text 4: the order of building and trying

Written by Claude on 18 Nov 2026, beside the seventh draft of the design (`process4/definition/process4_definition_v7/`). **Status: proposed. Nothing here has run.** It adds no rule to the design. It puts in one order what the design's part 10, section 4 lists for the trial, what each stage builds of the tool (build text 1, section 7, which follows this text), the walk trials of build text 3 (section 8), and the trials of the shared state (`process4/working/design_work_18nov/shared_state_carrier.md`, section 7).

Marks: **Decided here:** a choice of this text. **Unproven:** never shown to work.

## 1. The rule of the order

**Decided here:** each stage builds the least that lets one doubtful thing be tried, and the most doubtful thing that everything else rests on is tried first. A broken claim goes back to the design before the next stage is built. This is the order of the building work. It holds no product work, and it is not a stop of the process. Gives: the least work is thrown away if a claim breaks. Costs: the tool is built in pieces, and early pieces may be rewritten.

A trial can break a claim. It cannot prove one. Proof is the first real tranche.

Everything is tried in the trial repository, on made-up modules. No product is touched. The tool itself is built in the process's repository.

## 2. What is needed from the owner, and who builds

Before stage 0:

1. His acts 1 to 8 of the design's part 7, section 4, done for the trial repository and the process's repository. Acts 7 and 8 need his own wording of his approvals and forbidden commands for Process4; a proposal for him is in `process4/working/design_work_18nov/owner_acts_and_approvals.md`. Act 9, starting ROOT, comes at stage 2: stages 0 and 1 start a plain session. Act 10 comes at stage 1.
2. His trial wording of his forbidden commands must allow the one path stage 0 takes: a script of a few lines, run with `node`, that starts `gh` and `git` as the tool will.
3. His word on where the process's repository is, and whether it is public. Build text 1 assumes it is public.
4. His word that a session may build the tool (the design's part 4, section 11).

Nothing below can start until these are done. They are his alone.

**Who builds.** The tool is first built by a building session that holds the process's repository alone. It puts there the tool in `tool/`, the workflow in `shims/`, the starting texts in `starting_texts/`, the design's eleven parts in `design/` and the build texts in `build/` (build text 1, section 2). Until the tool can merge, the owner merges each of that session's pull requests himself (the design, part 4, section 11). Until the tool exists it pushes to its own working branch and opens its pull requests by the harness's ordinary means, as the owner's present approvals allow (the design, part 4, section 11).

**Stage 4** cannot start until the owner has given a session the repository that holds the notice's proof.

## 3. The stages

### Stage 0. Can a program reach GitHub from a session

Built: nothing of the tool. One plain session, started on the trial repository under his approvals, writes one throwaway script of a few lines. It is run with `node`, as the tool will be, and starts `gh` and `git` as the tool will. It is kept in no repository.

Tried:
1. The fetch line: the process's repository cloned at one commit into a folder outside the working files, made read-only. Is the session's list of forbidden commands still loaded afterwards?
2. One read of GitHub by the script: the open pull requests of the trial repository.
3. One write of GitHub by the script: it makes a test issue, writes a comment on it, then rewrites the same comment in place.
4. A push to a working branch by the script.

Breaks, if it fails: the tool as each session's only door to GitHub (the design's part 6, section 3), and the shared state as comments on an issue (part 4, section 4). If items 2 or 3 fail, the design must change before anything is built: the tool cannot be the door, and the door would be the harness's own GitHub acts, which the tool cannot hold to one form.

### Stage 1. The first piece of the tool

Built, by the building session in the process's repository: the fetch line; `branch`, `push`, `open`, `ready`, `results`, `merge`; `state read`, and `state write` with `--create`; the required run with three of its five scopes (the tranche's pull request, no module code, whole module); the job's text; the tool's own tests for these.

In the trial repository, a plain session started there writes the repository's first content as its first act, by the tool's `branch`, `push`, `open`, `ready` and `merge`: `process.json`, the module list, the workflow, and two made-up modules' entries with their requirements files. The base then has no process config, which build text 1, section 5 allows for. That one session then plays ARCH: it makes the shared state (`state write --create`) and writes the records that `open --module` and, later, `next-job` need (build text 5, section 2).

Tried:
1. The required run reports under its one name and can be made required (his act 10). Whether it can be required before it has first run.
2. Twenty merges or more made by the tool pass the permission checker (the design's trial item 2).
3. A job, started by that session with the job text, writes its module and tests, marks ready, fixes a planted failure, and is merged with no review.
4. Each starting text used here is accepted by the permission checker as naming the acts taken.

Breaks, if it fails: merging by the tool with nobody watching; the two-part run that keeps the token from product code.

### Stage 2. The shared state and the standing roles

Built: no command. The texts for ROOT, the watcher, ARCH and the coordinator. His act 9, starting ROOT, is done here for the first time.

Tried:
1. A plain-started ROOT fetches the newest copy, comes up on his newest approvals and forbidden commands, also straight after he commits an edit, and starts the watcher, ARCH and the coordinator (item 1).
2. The records take writes with no merge and are read in one call; rewriting a comment notifies no one; the size a comment holds (item 4, and the carrier's own trials). The records' forms are in build text 5.
3. The hourly wake rouses ROOT. The watcher takes over from a ROOT that has died, and from one that asks (item 5).
4. A successor starts only from the shared state and the repository: ARCH is replaced while a job is open, and the job obeys the new one (item 3).
5. Finished sessions, once archived, do not use up the account's room (item 7).

Breaks, if it fails: the one way back; refresh at the fill level; roles named and not session addresses.

### Stage 3. A round's jobs

Built: `next-job`, `finished`, `round-done`, `failed-runs`, `close`. PROCESS's text. Six made-up modules. In the process's repository: its own `process.json`, naming `main`, and its shared-state issue (build text 5, section 4).

Tried:
1. A freed slot is refilled within minutes; the rule for who takes it gives the same answer every time (items 3 and 13).
2. A stop, a held merge, a module put first and a new slot number each work on his word, and the hourly wake does not undo a stop (item 6). This needs him for the stop and three short marked instructions.
3. A job is replaced at its third failed run; a blocked job is made ready when the other module merges.
4. An edit to his approvals, with a restart, carries the round on (item 11). This needs him for the edit.
5. A process fault travels from a job to PROCESS. ROOT reads PROCESS's record with `state read --repository`, and starts PROCESS in the process's repository, which is the harness's act (item 10).

### Stage 4. The notice

Needs first: the repository that holds the notice's proof, given to a session by the owner, with the proof's own forms and its 150 recorded changes. Where those forms differ from build texts 2 and 5, they win.

Built: `listing`, `notify`, `check`, with the recorded changes of the notice's proof as the tool's tests; then the related scope and `related`.

Tried:
1. A provider's interface change tells only the users of the changed entry, in a running round and not only on made-up changes replayed.
2. A told job reads its uses from its pull request, changes what is needed, and the required run holds to the related tests.
3. The tool says so when it cannot follow a module, and that module's whole tests then run (build text 5, sections 6 and 7).
4. A notice to a module whose job is open waits and becomes work for its next job.

### Stage 5. The walks

Needs first: the owner enters the development copies' hosts among the cloud environment's allowed hosts.

Built: the walk commands; the walking session's text; the lane's text, used for the UX lane, which keeps the made-up product's two documents; one made-up product of two screens with a one-page Screens document and two journeys, and its `deploy` commands in the process config (build text 2, section 7).

Tried, in the order of build text 3, section 8: a session builds and serves the product and opens it in its browser; one internal step and one part walked by hand find a planted mismatch; the flaw is written, placed and fixed by a job; ARCH names areas from planted changes whose areas are known beforehand; a deployment is made from a session in timed steps; a browser reaches the development site; two walking sessions walk at once, with the hosting account's use read before and after; several sessions share one walk (items 8 and 14).

Breaks, if it fails: walks made by sessions at all. The earlier process's walks were a program on GitHub's machines.

### Stage 6. The tranche's end, and release

Built: the mechanical edit's scope; `release prepare`, `release publish`. In the made-up product: a made-up installer and a made-up updater.

Tried:
1. A mechanical edit across several modules merges once, with the touched modules' tests run and with none run (item 9). The second form is asked for by the one trial-only line of the process config (build text 2, section 7).
2. The tranche branch merges into the main branch as a whole (item 8).
3. A first trial release is made with `release prepare --development`: a pre-release with its tag, in the trial repository. The installer places it under fresh names in the development account, which is the "empty account" here. The updater then moves that copy to a newer release. Each is confirmed, and a release is prepared as far as his approval (item 12).
4. His approval, typed in ARCH's own session, is accepted by the permission checker for publishing a release named as the trial's. It is made with `--development`, so it is a pre-release; his present approvals already speak of development releases as pre-releases.

### Stage 7. The account switch

Tried: a switch of account that loses no work (item 15). It failed once in the earlier process. It needs his acts in a second account, and is left to last because nothing else rests on it.

The steps of an account switch, on the sessions' side and on his, are not written. Nor is what is read to show that it lost no work. This is design work still owed (the design, part 10, section 2, item 11).

## 4. What each stage asks of the owner

| Stage | His part |
|---|---|
| Before stage 0 | His acts 1 to 8; his wording of the approvals and of the forbidden commands, allowing stage 0's script; where the process's repository is; his word that a session may build the tool |
| While the tool is first built | Start the building session on the process's repository; merge each of its pull requests, until the tool can merge |
| 0 | Start one plain session |
| 1 | Start one plain session; act 10, once the run has reported |
| 2 | Act 9, start ROOT; one edit to his approvals |
| 3 | One stop; three short marked instructions; one edit to his approvals |
| 4 | Give a session the repository that holds the notice's proof |
| 5 | Enter the development copies' hosts among the cloud environment's allowed hosts; connect an AI account, only if a journey that uses AI is tried |
| 6 | One typed approval of a trial release |
| 7 | His acts in a second account |

Act 10 is one branch ruleset on the main and tranche branches: require a pull request, zero approvals, merge commits only, require the status check `module-tests`, source GitHub Actions, bypass list empty. Act 3 already sets the workflow token read-only.

## 5. What the trial cannot show

The design's part 10, section 5 lists what only the first real tranche can show: whether a tranche can end; whether the permission checker goes on passing merges at a real rate; how often a process fault stops work; whether cost can be read; the share of ARCH's work that is passing things on; whether a lane's session is better kept running. The trial uses made-up modules of a few files each, so it also cannot show how the tool's reader behaves on a real product's code, or how long a real module's tests take.
