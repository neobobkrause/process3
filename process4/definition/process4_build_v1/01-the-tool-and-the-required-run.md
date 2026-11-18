Length: 134 lines. Last section: "9. Not settled here".

# Process4 build specification, part 1: the tool and the required test run

Written by Claude (a design worker) on 18 Nov 2026. **Status: proposed. Nothing here is built and nothing here has run.** It answers items 4 and 8 of part 10, section 2 of the design (`process4/definition/process4_definition_v7/`, all eleven parts read in full, 868 lines). It adds no rule to the design. "The earlier tool" is the one in this repository at `tool/`, with `shims/process-gate.yml`.

Marks: **Decided here:** a choice of this text, with what it gives and costs; the owner or PROCESS can overrule any. **Unproven:** never shown to work. **Record:** stated in a named file of this repository; not seen to run by me.

## 1. What carries over, what is dropped, what is new

**Carries over** (the code exists and ran in the earlier process):

- One program, a fresh process for each command, run as `node <copy>/tool/<name>.mjs <command>` (`tool/p3.mjs`): the command table, the argument reader, one plain line on failure and exit code 1.
- GitHub reached only through the `gh` program and `git`, with no token held or read by the tool (`tool/lib/util.mjs`, `tool/lib/github.mjs`): reading and opening a pull request; listing and rewriting comments; the hidden-mark comment holding one JSON block; reading a commit's check runs; marking ready by the session proxy's own route first and `gh pr ready` second.
- The merge call itself: one request, merge commit, guarded by the commit id that was tested (`mergePR` in `tool/lib/merge.mjs`).
- The run on GitHub: one workflow on every pull request, on GitHub's merge of the pull request into its base, with the tool fetched at the version the base branch names, credentials not kept in the checkout, and product code started with the token variables removed (`shims/process-gate.yml`, `NO_TOKENS`).
- The suite runner: a module's test command run over a list of test files, the default being all of them (`tool/lib/suite.mjs`). It already takes a shorter list.
- The scope rule's shape: nothing when no code changed, the job's module otherwise (`tool/lib/gate.mjs`).
- The tool's tests: Node's own test runner, with GitHub calls passed in so that tests replace them (`tool/test/`).

**Dropped** (each could stop work, or built up records): the ledger and its checks; the receipt; the check that a job changed only its own files; the check that new tests fail with the change reverted; the "zero tests ran" finding; the record check (size, paths, approvals); `--reviewed` / `--no-review` on merge; merge bringing the branch up to date, writing a row and waiting for a second run; the run's comment on the pull request and the artifact that vouched for it; metrics; `status`; the state branch; the submodule entry.

**New:** the shared state on one issue; choosing the next job; finished and round-done; counting failed runs; the interface listing and the notice; the three scopes; the checks inside module tests; release.

## 2. Where the tool lives, its language, and how a session gets it

- **Where.** In the process's repository, folder `tool/`, entry file `tool/p4.mjs`, libraries in `tool/lib/`, tests in `tool/test/`. The workflow a product copies is `shims/module-tests.yml`.
- **Decided here:** the language is plain JavaScript modules on Node 22 or newer, no build step. Gives: the carried-over code is reused; the reader that proved the notice is TypeScript's, a Node program; Node is on GitHub's machines and in the sessions. Costs: a product in another language still needs Node on the machine.
- **Decided here:** the tool has one dependency, the `typescript` package at one exact version (5.6.3 was the version studied), named in `tool/package.json` with a lock file and installed with `npm ci` when the copy is fetched. Gives: both listings of a comparison use one reader version. Costs: the fetch needs the public package registry. Commands that do not read code must work without it.
- **How a product names its version. Decided here:** the process config holds two lines: the process repository's address and one full 40-character commit id of its main branch. No submodule entry and no branch name. Gives: one place names the version, and it reads the same on GitHub's machines and in a session. Costs: any pull request can change the line; the design already says nothing physical stops that (part 6, section 7).
- **How a session fetches it. Decided here:** each session's first command, written in its starting instructions, is one line: `git clone` of the process repository into `$HOME/process4/<commit id>`, checkout of that commit, `npm ci` in `tool/`, then `chmod -R a-w` on the copy. Every later command is `node $HOME/process4/<commit id>/tool/p4.mjs ...`. Gives: the copy is outside the product's working tree, so no job commits or edits it. Costs: the fetch is the one GitHub act not made through the tool, and it is a judged act.
- **Record:** in the earlier process every session held one repository and fetched the process as its first command, `git submodule update --init .process`, from the public process repository, with the deny list loaded (`process4/evidence/permissions_inventory.md`, probe row 17). **Unproven:** that a plain clone to a folder outside the repository works the same from a one-repository session and leaves the deny list loaded; that it works if the process repository is private; all of it on Codex. The reserve is the earlier route, a submodule entry.
- **What the tool reads from the product:** the process config (process repository, commit id, tranche branch name, Node version, lock files to install, language reader, slot number) and the module list (each module's id, order, code folders, test folders, test command, requirements file). Their forms are not fixed here.

## 3. Signing in, and what the permission checker sees

- **In a session.** The tool starts `gh` and `git` as child programs. The harness has already connected them to GitHub as the sessions' second account through the session's proxy. The tool holds, reads and prints no token, and removes the token variables from every `git` it starts. Only GitHub's REST calls are used; the earlier process measured that sessions could not reach the other interface (note in `tool/lib/github.mjs`).
- **On GitHub's machines.** The workflow's own token, read-only by the owner's setting, given only to part one (section 5).
- **Limits.** Every write obeys GitHub's rate-limit answer: wait as told, try again, four tries, then fail. `merge` waits until a minute has passed since the last merge into the same branch. `push` keeps to six a minute. No queue of later writes is kept.
- **The deny list** takes `git push` and `gh` away from the session's own commands. It does not reach programs the tool starts.
- **One judged act for each command.** The checker sees one line, `node <copy>/tool/p4.mjs <command> <arguments>`, and judges it against the owner's approvals.

| Command | What the checker sees as the act |
|---|---|
| `branch` | Making a new branch in the product's repository |
| `push` | A push to the session's own working branch |
| `open`, `ready`, `close` | Opening a draft pull request; marking it ready; closing it unmerged |
| `merge` | Merging a pull request into the tranche branch (or the tranche's into main) after the required run passed, with no person's review |
| `release prepare`; `release publish` | Making an unpublished release; publishing it, with the owner's approval typed in that session |
| `notify`, `state write`, `next-job` | Rewriting a comment on an issue or pull request |
| `listing`, `finished`, `round-done`, `results`, `failed-runs`, `state read`, `check` | Reading only |

**Unproven:** every row. No approvals wording for Process4 is committed, and no act of this tool has been judged. Trial item 2 measures `merge`.

## 4. The commands

One for each act in part 6, section 5, and none beyond. Common to all: arguments are checked for form only; a command prints plain lines and ends with `ok` or one line `p4 <command>: <what failed>, in GitHub's own words where GitHub refused`; exit code 0 or 1. No command refuses for size, and none adds a check, gate, review or stop. A refusal by GitHub is printed and never retried by another route. The tool cannot message a session: where the design says "the tool tells ARCH", the tool prints the line and the session sends it.

1. **`branch <name>`**. Makes branch `<name>` from the newest commit of the tranche branch, with one empty commit so that a pull request can open, and pushes it. Prints the branch and commit id. If the branch exists, says so and ends `ok`. **Decided here:** job branches are `job/<module>`, other work `work/<what>`. Gives: the run reads the module from the name. Costs: nothing known.
2. **`push [--blocked "<why>"]`**. Pushes the current branch's commits to the same-named branch, never the tranche or main branch, never forced. Prints the commit id pushed. With `--blocked`, also writes the reason into the job block of its pull request (see `open`). On GitHub's refusal prints it and exits 1.
3. **`open --module <id>`** or **`open --title "<t>"`**. Opens a draft pull request from the current branch into the tranche branch (`--into-main` for the tranche's own). For a job it writes the job block: a hidden mark `<!-- process4-job -->` and one JSON block holding the module, the kind (`ordinary` or `told`), and for a told job the uses, taken from the waiting-work record. Prints the number and address. If one is open already, prints it. **Decided here:** ARCH's session runs `branch` and `open` for a job before starting its session, as the earlier `job start` did. Gives: the kind and the uses are written by ARCH's tool run, not by the job the run judges. Costs: two more acts of ARCH for each job.
4. **`ready <pr>`**. Marks the pull request ready, then reads it back. Prints its state and that the required run has been asked for.
5. **`close <pr> [--nothing-to-change "<why>"]`**. With the flag, first writes the words into the job block; then closes unmerged. This is the job's record of part 2, section 4.
6. **`merge <pr>`**. Reads the standing notes; if the owner holds this merge, prints that and exits 0 without merging (his hold, not a check). Otherwise asks GitHub to merge with a merge commit, guarded by the head commit id. GitHub's rule decides whether the required run has passed; the tool repeats none of it. Prints the merge commit, or GitHub's refusal.
7. **`release prepare <version> --notes <file> [--file <built file>]...`**. Makes an unpublished release on GitHub at the main branch's newest commit, with the notes and files given. Prints its address.
8. **`release publish <version> --approval "<the owner's words>"`**. Publishes that release and prints the address. The words are printed back and not judged by the tool. **Unproven:** both, and that the checker passes them (part 3, section 6).
9. **`next-job`**. Reads the round, waiting-work and standing-notes records, the module list and GitHub's open pull requests. A module is ready when it has work and no open job. Picks the earliest in module order, after any module the owner put first, if a slot is free. Rewrites the round record, and prints the module and its starting instructions: the role text's address, the fetch line, the branch, the pull request, and every act named. Prints `none ready` or `no free slot` otherwise. **Decided here:** one job for each call. Gives: one judged act for each start. Costs: eight calls to fill eight slots.
10. **`listing <module> [--at <commit>]`**. Writes out the module's interface, from code and structured comments, with the language reader. Prints it; writes nothing to GitHub.
11. **`notify <pr>`**. Run by ARCH's session after a merge. Makes the module's listing just before and just after the merge, at the same moment. If they are the same, prints `no notice`. Otherwise, for each changed entry that is not "accepts more" as the type checker confirms, finds the users and the places in their files that name it; a user it cannot follow counts as using everything. For a user with an open job it adds the uses to that job's block; for the others it rewrites the waiting-work record. Prints who was told and why.
12. **`finished <module>`**. Prints `finished` or `not finished` with the ground, worked out afresh from GitHub: its job's pull request merged, or closed with a nothing-to-change record where its only work was a notice.
13. **`round-done`**. Prints `done` or `not done`, and each module finished, open or blocked with its reason (part 2, section 4).
14. **`results <pr>`**. Prints the required run's state on the head commit (waiting, passed, failed), its address, and for a failed run the last lines of its output.
15. **`failed-runs <pr>`**. Prints the count of failed required runs on the pull request, from GitHub's record. At two failures since the session's branch was last taken over it also prints the line for ARCH.
16. **`state read [<record>]`**. Finds the issue by its label, lists its comments in one call, prints the record or all of them.
17. **`state write <record> --from <file>`**. Rewrites that record's comment in place. While writing standing notes it removes each note whose ending has come true. Writing the lanes record, it refuses a second session for a lane recorded as live (the design's own refusal). On failure it follows `shared_state_carrier.md`, section 6. `state write --create` makes the issue and its empty records once, for ROOT.
18. **`check <module> [--files <list>]`**. Inside module tests. Three parts, each printed with file and line: declared uses against the imports of the module's source and tests; each structured comment against its code; the module's code against each provider's stated interface. Exit 1 if any disagrees. Where the reader cannot tell, it says so and does not refuse (part 10 records false complaints as unsolved).

**The run's entry.** The workflow calls `p4.mjs run scope` and `p4.mjs run tests` (section 5). A told job also calls `run scope --pr <n>` in its session to learn its related tests. Part 2, section 7 requires this; the list in part 6, section 5 does not name it (section 9).

## 5. The required test run

- **What defines it.** One workflow file, `.github/workflows/module-tests.yml`, copied into the product from `shims/module-tests.yml`. It runs on every pull request event that changes the head, the base, or draft to ready. A draft passes at once.
- **Its one name. Decided here:** the check GitHub requires is named `module-tests`. It is the workflow's second job. Gives: the name is fixed before the tool is built, so the owner's act 10 need not wait on a first run if GitHub accepts a name that has not yet reported (unproven). Costs: part one shows as a second, unrequired line.
- **Part one, job `scope`.** Holds the read-only token. Checks out GitHub's merge of the pull request, with credentials not kept. Reads the process config **at the base branch's commit**, clones the process repository at the commit it names, and runs `run scope`. This is how "the tool at the tranche branch's version" is held: the pull request cannot move the version that judges it. Where the base has no process config (the first pull request of a product), the head's is used and the run says so. It runs no product code: the reader reads files and starts nothing. It hands part two a small file: the scope, the modules, the test files, and the files to check.
- **Part two, job `module-tests`.** Holds no token: its permissions are for reading contents only, used by the checkout step, with credentials not kept; no later step is given the token, and the tool removes the token variables before starting any product program. It installs the product's dependencies from the lock files the config names, fetches the same tool copy, runs `check` and then each module's test command over the files in the list, and writes a summary: the scope, files run, files left out, counts. It passes when every command exits 0. **Decided here:** it runs with `if: always()` and fails when part one did not succeed. Gives: a failed part one cannot leave the required check "skipped", which GitHub counts as passed (from memory; to be tried). Costs: one more line in the workflow.
- **Decided here:** the run writes nothing to the pull request; its result is GitHub's own check and summary. Gives: the token stays read-only and no comments build up. Costs: `results` must fetch the output from the run.

**How `run scope` decides,** in order:

1. The base is the main branch: **nothing**, passes at once (the tranche's own pull request).
2. No changed file is under any module's code or test folders, by the module list of the merged result: **nothing**, passes at once.
3. The head branch is `job/<module>` and its job block says `told`: **related**. The list is the module's test files that hold a use, or reach code holding one, or reach code this pull request changed, plus every test file it changed; chosen by whole file. Where the tool loses the thread, one step wider each time, up to the whole module (`notified_job_tests.md`, decisions 2 and 3). An empty list passes at once and says so.
4. The head branch is `job/<module>` otherwise: **whole module**, that module only.
5. Any other branch that changes module code (the mechanical edit): **Decided here:** whole module for each module touched. Gives: the earlier process's behaviour, known to run. Costs: one long run; trial item 9 also tries it with none run.

- **Decided here:** a module with no test files passes, and the summary says none ran. Gives: no refusal the design did not approve. Costs: a job that wrote no tests is not stopped by the run.
- **GitHub settings that name it** (the owner's act 10): one branch ruleset on the main and tranche branches: require a pull request, zero approvals, merge commits only, require the status check `module-tests`, source GitHub Actions, bypass list empty. Act 3 already sets the workflow token read-only.
- **Unproven:** the related scope altogether; that the workflow file, which comes from the pull request, is left alone; the time a whole module takes.

## 6. The tool's own tests

- **What they cover:** each command against replaced GitHub calls (what it sends, prints, and does on each failure); the slot rule giving the same answer for the same inputs; finished and round-done; the scope rule, one case for each of the five steps and for losing the thread; state writes, the four tries, an ended note removed, the lane refusal; the listing and notice over the recorded changes from the notice's proof (150 changes on eleven made-up modules, in `notice-proof/` of the probes repository; **not read by me**), each with the answer recorded for it.
- **When they run:** only on a pull request in the process's repository, by a workflow there named `tool-tests`, which is that repository's required run. PROCESS runs them in its session too.
- **Never on a product's work.** A product's workflow fetches `tool/` and runs commands from it; nothing in `shims/` or in any command starts `tool/test/`.
- **Decided here:** the size of a role's text, a record or a requirements file is not among them (part 5, section 3).

## 7. Build order

**The first piece,** to try in the trial repository: the fetch line; `branch`, `push`, `open`, `ready`, `results`, `merge`; and the workflow with scopes 1, 2 and 4 only. It needs two made-up modules and the owner's acts 1 to 9. It answers three things: whether a one-repository session can fetch and run the tool, whether the checker passes its pushes and merges (trial item 2, twenty merges), and whether `module-tests` reports and can be required.

Then, each piece usable on its own:

2. `state read`, `state write` (trial items 4, 5, 6), with the trials of `shared_state_carrier.md`, section 7.
3. `next-job`, `finished`, `round-done`, `failed-runs`, `close` (items 3, 13).
4. `listing`, `notify`, `check`, with the proof's recorded changes as tests.
5. Scope 3, related tests, and the told job's `run scope`.
6. Scope 5 and the mechanical edit (item 9).
7. `release prepare`, `release publish` (item 12).

## 8. Unproven, gathered

Everything here. Most at risk: the fetch from a one-repository session; the checker's judgment of each act; a required check named before it has run; the skipped-job behaviour; an empty commit opening a pull request; following a use to the tests that reach it; `check` refusing only real disagreements; release.

## 9. Not settled here

1. **The run's entry is not in the design's list** of what the tool does (part 6, section 5), though part 2, section 7 requires it. PROCESS should add it to the list or say where else it lives.
2. **The list names no "comment" act,** yet a job must record "blocked" and "nothing needs changing" in its pull request. Here they ride on `push --blocked` and `close --nothing-to-change`.
3. **Whether the process repository is public.** The fetch on GitHub's machines and in part two assumes it is, as the earlier one was. If private, part two needs a token and the two-part split fails as written.
4. **The mechanical edit's scope** (step 5): the design marks it unproven, and only trial item 9 can choose.
5. **Who opens a job's pull request.** Chosen here as ARCH's session; the design's step 5 says only that the job works in a draft pull request.
6. **The forms** of the process config, module list, structured comment and listing (items 6 and 7 of part 10) are needed before pieces 3 and 4 can be built; this text only lists what the tool reads.
7. **The owner's approvals** must name the fetch, each act of section 3, and the tool's path; the proposal in `owner_acts_and_approvals.md` was written before the path existed.
8. **Codex:** how `gh` and `git` are signed in there, and whether a child can fetch, are not known (part 8).
9. **The proof's data** and the earlier tool's `github push` (on another branch) were not read.
