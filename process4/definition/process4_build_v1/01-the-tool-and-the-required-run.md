Length: 107 lines. Last section: "8. Not settled here".

# Process4 build specification, part 1: the tool and the required test run

Written by Claude (a design worker) on 18 Nov 2026. **Status: proposed. Nothing here is built and nothing here has run.** It answers items 4 and 8 of part 10, section 2 of the design (`process4/definition/process4_definition_v7/`, all eleven parts read in full, 902 lines). It adds no rule to the design. Reconciled the same day with the design and build texts 2 to 5. "The earlier tool" is the one in this repository at `tool/`, with `shims/process-gate.yml`. Section 4, the commands, is in `01b-the-commands.md` (build text 1b) since 19 Nov 2026, to keep each file under 24,000 bytes; the numbers are kept.

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

**New:** every other command of section 4 (build text 1b), and the related scope of section 5.

## 2. Where the tool lives, its language, and how a session gets it

- **Where.** The process's repository has five folders: `tool/` (entry file `tool/p4.mjs`, libraries in `tool/lib/`, tests in `tool/test/`); `shims/`, with the workflow a product copies, `shims/module-tests.yml`; `starting_texts/`, one text for each role (part 4, section 11), of which the tool fills in a job's and a walking session's; `design/`, the design's eleven parts; and `build/`, the build texts. PROCESS's own folder is a sixth.
- **Decided here:** the language is plain JavaScript modules on Node 22 or newer, no build step. Gives: the carried-over code is reused; the reader that proved the notice is TypeScript's, a Node program; Node is on GitHub's machines and in the sessions. Costs: a product in another language still needs Node on the machine.
- **Decided here:** the tool has one dependency, the `typescript` package at one exact version (5.6.3 was the version studied), named in `tool/package.json` with a lock file and installed with `npm ci` when the copy is fetched. Gives: both listings of a comparison use one reader version. Costs: the fetch needs the public package registry. Commands that do not read code must work without it.
- **How a product names its version. Decided here:** the process config names the process repository's address and one full 40-character commit id of its main branch, beside the version's name (build text 2, section 7). No submodule entry and no branch name. Gives: one place names the version, and it reads the same on GitHub's machines and in a session. Costs: any pull request can change the line; the design already says nothing physical stops that (part 6, section 7).
- **How a session fetches it. Decided here:** each session's first command, written in its starting instructions (for ROOT, in the owner's plain prompt), is one line, the fetch line, which names the commit id once, as a shell variable: `git clone` of the process repository into `$HOME/process4/<commit id>`, checkout of that commit, `npm ci` in `tool/`, then `chmod -R a-w` on the copy. Every later command is `node $HOME/process4/<commit id>/tool/p4.mjs ...`. Gives: the copy is outside the product's working tree, so no job commits or edits it. Costs: the fetch is not made by the tool, the one exception the design names (part 6, section 3), and it is a judged act.
- **Record:** in the earlier process every session held one repository and fetched the process as its first command, `git submodule update --init .process`, from the public process repository, with the deny list loaded (`process4/evidence/permissions_inventory.md`, probe row 17). **Unproven:** that a plain clone to a folder outside the repository works the same from a one-repository session and leaves the deny list loaded; that it works if the process repository is private; all of it on Codex. The reserve is the earlier route, a submodule entry.
- **What the tool reads from the product:** the process config and the module list (each module's name, by which it is identified, its order, code paths, test paths, interface files and declared uses). Their forms are in build text 2 (`02-the-forms.md`), sections 3, 4 and 7.

## 3. Signing in, and what the permission checker sees

- **In a session.** The tool starts `gh` and `git` as child programs. The harness has already connected them to GitHub as the sessions' second account through the session's proxy. The tool holds, reads and prints no token, and removes the token variables from every `git` it starts. Only GitHub's REST calls are used; the earlier process measured that sessions could not reach the other interface (note in `tool/lib/github.mjs`).
- **On GitHub's machines.** The workflow's own token, read-only by the owner's setting, given only to part one (section 5).
- **Limits.** Every write obeys GitHub's rate-limit answer: it waits as told and tries again up to four times, then fails. `merge` waits until a minute has passed since the last merge into the same branch. `push` keeps to six a minute. No queue of later writes is kept.
- **The deny list** takes `git push` and `gh` away from the session's own commands. It does not reach programs the tool starts.
- **One judged act for each command.** The checker sees one line, `node <copy>/tool/p4.mjs <command> <arguments>`, and judges it against the owner's approvals.

| Command | What the checker sees as the act |
|---|---|
| `branch` | Making a new branch in the product's repository |
| `push` | A push to the session's own working branch |
| `open`, `ready`, `close` | Opening a draft pull request; marking it ready; closing it unmerged. `open`, `close` and `push` may also write a comment on it; `open --module` and `walk open` also rewrite a shared-state comment |
| `merge` | Merging a pull request into the tranche branch (or the tranche's into main) after the required run passed, with no person's review |
| `release prepare`; `release publish` | Making an unpublished release, or with `--development` a pre-release with its tag; publishing a release, with the owner's approval typed in that session |
| `notify`, `state write`, `next-job`, `walk write` | Rewriting a comment on an issue |
| `walk open`, `walk close` | Opening an issue in the product's repository; closing it |
| `listing`, `finished`, `round-done`, `results`, `failed-runs`, `state read`, `check`, `related`, `walk areas`, `walk text`, `walk read` | Reading only |

**Unproven:** every row. No approvals wording for Process4 is committed, and no act of this tool has been judged. Trial item 2 measures `merge`.

## 5. The required test run

- **What defines it.** One workflow file, `.github/workflows/module-tests.yml`, copied into the product from `shims/module-tests.yml`. It runs on every pull request event that changes the head, the base, or draft to ready. A draft passes at once.
- **Its one name. Decided here:** the check GitHub requires is named `module-tests`. It is the workflow's second job. Gives: the name is fixed before the tool is built, so the owner's act 10 need not wait on a first run if GitHub accepts a name that has not yet reported (unproven). Costs: part one shows as a second, unrequired line.
- **Part one, job `scope`.** Holds the read-only token. Checks out GitHub's merge of the pull request, with credentials not kept. Reads the process config **at the base branch's commit**, clones the process repository at the commit it names, and runs `run scope`. This is how "the tool at the tranche branch's version" is held: the pull request cannot move the version that judges it. Where the base has no process config (the first pull request of a product), the head's is used and the run says so. It runs no product code: the reader reads files and starts nothing. It hands part two a small file: the scope, the modules, the test files, and the files to check.
- **Part two, job `module-tests`.** Holds no token: its permissions are for reading contents only, used by the checkout step, with credentials not kept; no later step is given the token, and the tool removes the token variables before starting any product program. It installs the product's dependencies from the lock files the config names, fetches the same tool copy, runs `check` and then each module's test command over the files in the list, and writes a summary: the scope, files run, files left out, counts. It passes when every command exits 0. **Decided here:** it runs with `if: always()` and fails when part one did not succeed. Gives: a failed part one cannot leave the required check "skipped", which GitHub counts as passed (from memory; to be tried). Costs: one more line in the workflow.
- **Decided here:** the run writes nothing to the pull request; its result is GitHub's own check and summary. Gives: the token stays read-only and no comments build up. Costs: `results` must fetch the output from the run.

**How `run scope` decides,** in order:

1. The base is the main branch: **nothing**, passes at once (the tranche's own pull request).
2. No changed file is under any module's code or test folders, by the module list of the merged result: **nothing**, passes at once.
3. The head branch is `job/<module>/<n>` and its job block says `told`: **related**: the list that build text 5, section 7 defines, chosen by whole file, and one step wider each time the tool loses the thread, up to the whole module. An empty list passes at once and says so.
4. The head branch is `job/<module>/<n>` otherwise: **whole module**, that module only.
5. Any other branch that changes module code (the mechanical edit): **Decided here:** whole module for each module touched. Gives: the earlier process's behaviour, known to run. Costs: one long run. Trial item 9 also tries it with none run; one trial-only line of the process config asks for that (build text 2, section 7).

- No scope runs a module's `walk/internal/` or `walk/external/` folders, which lie under its `tests` paths (build text 3, section 3).

- **Decided here:** a module with no test files passes, and the summary says none ran. Gives: no refusal the design did not approve. Costs: a job that wrote no tests is not stopped by the run.
- **GitHub settings that name it** are the owner's act 10 (build text 4, section 4).
- **Unproven:** the related scope altogether; that the workflow file, which comes from the pull request, is left alone; the time a whole module takes.

## 6. The tool's own tests

- **What they cover:** each command against replaced GitHub calls (what it sends, prints, and does on each failure); the slot rule giving the same answer for the same inputs; finished and round-done; the scope rule, one case for each of the five steps and for losing the thread; state writes, the four tries, an ended note removed, the lane refusal; the listing and notice over the recorded changes from the notice's proof (150 changes on eleven made-up modules, in `notice-proof/` of the probes repository; **not read by me**), each with the answer recorded for it.
- **When they run:** only on a pull request in the process's repository, by a workflow there named `tool-tests`, which is that repository's required run. PROCESS runs them in its session too.
- **Never on a product's work.** A product's workflow fetches `tool/` and runs commands from it; nothing in `shims/` or in any command starts `tool/test/`.
- **Decided here:** the size of a role's text, a record or a requirements file is not among them (part 5, section 3).

## 7. Build order

The order is build text 4's (`04-the-trial.md`, section 3), which rules. What each stage builds of the tool:

0. Nothing: one throwaway script.
1. The fetch line; `branch`, `push`, `open`, `ready`, `results`, `merge`; `state read`, and `state write` with `--create`; the workflow with scopes 1, 2 and 4.
2. No command: the standing roles' texts, and the trials of the shared state.
3. `next-job`, `finished`, `round-done`, `failed-runs`, `close`.
4. `listing`, `notify`, `check`; then scope 3 and `related`.
5. The walk commands.
6. Scope 5; `release prepare`, `release publish`.

**Who builds it** (part 4, section 11): a building session that holds the process's repository alone. The owner merges each of its pull requests himself; after the first build only PROCESS changes the tool. Stage 1 needs the owner's acts 1 to 8 and a plain-started session.

## 8. Not settled here

Everything in this text is unproven; each doubt is marked where it lies.

1. **Whether the process repository is public.** The fetch on GitHub's machines and in part two assumes it is, as the earlier one was. If private, part two needs a token and the two-part split fails as written.
2. **The mechanical edit's scope** (step 5): the design marks it unproven, and only trial item 9 can choose.
3. **The owner's approvals** must name the fetch, each act of section 3, and the tool's path; the proposal in `owner_acts_and_approvals.md` was written before the path existed.
4. **Codex:** how `gh` and `git` are signed in there, and whether a child can fetch, are not known (part 8).
5. **The proof's data** and the earlier tool's `github push` (on another branch) were not read.
