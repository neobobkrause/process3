Length: 324 lines. Last section: "5. Proven, unproven and uncertain".

# The proposal for the owner's approvals and forbidden commands, brought up to date

Written by a Claude worker on 18 Nov 2026. **A proposal, never the owner's words. He has not written or seen any wording here. None of it has been loaded by a session or judged by a permission checker, and nothing here has run.** It brings the earlier proposal up to date with the tool's path and commands, which were fixed after it was written. It adds no test, check, gate, review or stop.

## 1. What was read

All in full. Short names used below are in the first column.

| Short name | File | Lines |
|---|---|---|
| P | `process4/working/design_work_18nov/owner_acts_and_approvals.md` (the earlier proposal) | 155 |
| B1 | `process4/definition/process4_build_v1/01-the-tool-and-the-required-run.md` | 138 |
| B4 | `process4/definition/process4_build_v1/04-the-trial.md` | 141 |
| D6 | `process4/definition/process4_definition_v7/06-rules-permissions-and-changing-the-process.md` | 72 |
| D4 | `process4/definition/process4_definition_v7/04-roles-and-sessions.md` | 158 |
| D7 | `process4/definition/process4_definition_v7/07-harness-claude-code.md` | 70 |
| D3 | `process4/definition/process4_definition_v7/03-tranche-rounds-walks-and-release.md` | 74 |
| C | `CLAUDE.md` at the root (the present approvals, for Process3) | 3 |

Also read, by passage: `process4/evidence/permissions_inventory.md` lines 115 to 189, for the forbidden commands the owner committed for Process3 (quoted there in full, lines 122 to 160). This branch has no `.claude/settings.json`.

## 2. Where the earlier proposal falls short

Sixteen places. "Not covered" means the wording names no such act. "Contradicts" means the wording forbids what the texts now need.

**The acts in B1's table (B1:43 to 52).**

1. **Making a branch. Not covered.** The tool's `branch` makes a new branch in the product's repository (B1:45, B1:60), and ARCH's session makes each job's branch before the job starts (D4:151). P:76 allows only "push to their own job's or role's working branch", and a job's branch is not ARCH's own. The process's block has the same lack (P:86; B1:60 for `main`).
2. **A development release. Contradicts.** `release prepare --development` makes a pre-release with its tag (B1:49, B1:66), and the design says it is made and published in one act with no approval (D3:60). P:94 lists "cutting development releases with tags and pre-releases" as not carried over, and P:78 allows only "prepare a release as far as my approval". The present approvals have the words (C:3).
3. **Publishing a public release. Not covered as an act.** `release publish` publishes with his approval typed in that session (B1:49, B1:67; D3:62). P names it only inside "may never" (P:80), with a blank offering two routes, one of them GitHub's release environment. The tool has no such route. Who publishes is still open with him (D3:61).
4. **Rewriting a comment on an issue. Half covered.** `notify`, `state write`, `next-job` and `walk write` each rewrite a comment on an issue (B1:50; D4:83). P:76 names "the process's shared state, which is kept on GitHub and not as commits", but not issues or comments, and `walk write` (B1:79) writes to a walk's issue, which is not the shared state.
5. **Opening and closing an issue. Not covered.** `walk open`, `walk close` (B1:51, B1:78) and `state write --create` (B1:76) open or close issues. P:76 names no issue. P:101 would take `mcp__github__issue_write` away, which fits, but leaves the tool's act unnamed.
6. **Reading. Not covered.** Eleven commands only read (B1:52), among them a failed run's output (B1:73, B1:74), which settles the doubt at P:106. One of them reads another repository: ROOT reads PROCESS's record with `state read --repository` (B1:75; B4:82), while P:76 says "In this repository ... only".

**The fetch line and the tool's path.**

7. **The fetch line. Covered only in general words.** It is a `git clone` of the process's repository into `$HOME/process4/<commit id>`, a checkout, `npm ci` in `tool/`, then `chmod -R a-w` (B1:31), and it is the one command to GitHub not made by the tool (D6:24). P:76 says only "fetch a read-only copy of the process at the version the process config names": no place, no install of the tool's one package, no making read-only. B1:136 asks that the approvals name the fetch. The process's block has no fetch at all (P:84 to 90).
8. **The tool's path in the approvals. Not covered.** Every command is `node $HOME/process4/<commit id>/tool/p4.mjs ...` and the checker sees that one line (B1:31, B1:41). P:76 says "the process's tool" and names no program or place; P:151 says the path did not exist. B1:136 asks that the approvals name it.
9. **The tool's path in the allow rule. Contradicts in part.** P:102 leaves a blank for the path. The path now holds a commit id that changes with each version of the process, and the home folder (B1:31), so no fixed line can be written without wildcards. P:104 says the process's repository uses "the tool's path as it is in that repository"; B1:31 gives one path, under the home folder, for every session.

**The trial.**

10. **Stage 0's script. Contradicts.** A throwaway script, run with `node`, starts `gh` and `git` to read pull requests, make an issue, write and rewrite a comment, and push to a working branch, before the tool exists (B4:22, B4:36 to 42). P:76 allows GitHub acts "only through the process's tool", and P:80 forbids to "push, merge or write to GitHub by any route other than the process's tool". The forbidden commands themselves do not stand in the way as written: no line matches a command that begins `node` (P:100; B1:40).
11. **The trial's release. Not covered.** The trial release is a development pre-release with its tag in the trial repository, and his typed approval is tried on a release "named as the trial's", itself a pre-release (B4:113, B4:114). P:80 speaks of approval only for a public release, and P:94 dropped development releases (gap 2).

**The process's repository.**

12. **PROCESS merging on his word. Covered, one phrase short.** P:88 matches the design (D6:16, D6:66; D4:150; B1:65). It does not say the merge follows the required run, which is how the checker sees a merge (B1:48) and which that repository has under the name `tool-tests` (B1:112).
13. **PROCESS's own records. Not covered.** PROCESS makes and writes a shared-state issue in the process's repository (B1:76; B4:75; D4:73; D6:64). P:86 allows pushes, pull requests and the tool's tests only.
14. **The building session's approvals. Contradicts.** Until the tool exists, the building session pushes to its own working branch and opens its pull requests "by the harness's ordinary means", and the owner merges each one (D4:156; B4:28; B1:128). P:84 covers only "the PROCESS session and the sessions it starts"; the building session is neither. P:86 and P:90 allow GitHub acts only through the tool.
15. **The building session and the forbidden commands. Contradicts.** P:100 keeps `Bash(git push)` and `Bash(git push *)`, P:101 adds `mcp__github__create_pull_request`, and P:104 puts the same list in the process's repository. Those are the ordinary means. His acts 7 and 8 come before stage 0 (B4:21), so the Process4 list would be in force while the tool is built. The design says "as the owner's present approvals allow" (D4:156; C:3), but P:70 has the new block replace the present one.

**The forbidden commands.**

16. **Eight writing tools left open.** The design takes away "every GitHub command" (D6:24). P:101 lists eleven tools to add. This session's own tool list today shows eight more that write: `add_comment_to_pending_review`, `add_reply_to_pull_request_comment`, `update_issue_comment`, `sub_issue_write`, `resolve_review_thread`, `unresolve_review_thread`, `request_copilot_review`, `disable_pr_auto_merge`.

**Covered as written, no change needed:** `push` and its comment (B1:46, B1:47 against P:76); `open`, `ready`, `close` (B1:47 against P:76); `merge` in a product, into the tranche branch and the tranche's into main (B1:48 against P:76); deployments, walkers, installer and updater (B4:102, B4:113 against P:78); ROOT starting PROCESS (B4:82 against P:74).

## 3. The approvals: proposed wording

**Proposal, for the owner to adopt, change or discard.** Words in angle brackets are his to fill. Each block is written one sentence or clause to a line so that lines can be marked; he may run them together. Under each block is the list of lines that are changed or added against P. Every line not listed is P's wording unchanged.

### 3a. A real product's repository

```text
Standing approvals from Bob, <date>, for Process4. They cover every Claude session working on this product under Process4, including sessions that other sessions started.

Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on this product on the Claude account the acting session itself runs under; start the PROCESS session on the process's repository, <owner/process>, when a process fault calls for it; create, switch off and delete the process's scheduled tasks on that account; notify me by push notification; and create and edit this product's pages on claude.ai under that account.

The process's tool is the program tool/p4.mjs inside the session's read-only copy of the process, run with node.
Each session's first command fetches that copy: it clones the process's repository, <owner/process>, at the commit this product's process config names, into the folder process4/<that commit id> under the session's home folder, outside this repository's working files; installs there the one public package the tool needs; and makes the copy read-only.
That fetch only reads GitHub. It is the one command to GitHub that is not made by the tool.

In this repository, <owner/product>, only, and only through the process's tool, they may:
make a new working branch for a job or for a role's own work;
push to their own job's or role's working branch;
open pull requests, comment on them, mark them ready or draft, and close them;
merge a pull request into the tranche branch once GitHub's required test run on it has passed, without a person's review;
merge the tranche's pull request into main the same way when the tranche ends;
open and close the process's own issues in this repository, which are the shared-state issue and each walk's issue, and write and rewrite comments on them;
read and write the process's shared state, which is kept on GitHub as comments on that issue and not as commits;
read pull requests, issues and test runs, with a run's output;
and make and publish development releases, each a pre-release with its tag in this repository, made only for development.
Through the tool they may also read, and only read, the process's shared state in the process's repository.
They may run builds and tests, fetching public packages for them.

In the product's own Cloudflare account, the one its process config names, and in no other, they may deploy, configure, seed, reset and remove development deployments and their data, run walkers and other tests against them, and run the product's installer and updater there. Development deployments hold no secrets and keep no permanent record.
They may prepare a public release, unpublished, as far as my approval.
A public release is published only by <the architecture session>, through the tool, in the turn in which I type my approval of that release in that session.

They may never: push, merge or write to GitHub by any route other than the process's tool; force-push; delete a branch, tag or release; change permission, repository or rule settings; change this block or the list of forbidden commands; push to main except through the tranche's pull request; change the process, or move this product to a changed process without my prior approval; publish a public release, or promote a release to installed sites, without my approval of that release, typed by me in the session that publishes it; reveal a secret value; or act on any other account or service.
```

Changed or added against P:74 to 80:

- **Added:** "The process's tool is the program ..." (gap 8).
- **Added:** "Each session's first command fetches that copy ..." and "That fetch only reads GitHub ..." (gap 7). They replace the last clause of P:76, "and fetch a read-only copy of the process at the version the process config names", which is removed from the "run builds and tests" line.
- **Added:** "make a new working branch ..." (gap 1).
- **Added:** "open and close the process's own issues ..." (gaps 4 and 5).
- **Changed:** "read and write the process's shared state, which is kept on GitHub as comments on that issue and not as commits". P had "which is kept on GitHub and not as commits" (gap 4).
- **Added:** "read pull requests, issues and test runs ..." and "Through the tool they may also read ..." (gap 6).
- **Added:** "and make and publish development releases ..." (gap 2). The words are the present block's (C:3), with "made only for development" from D3:60.
- **Changed:** "They may prepare a public release, unpublished, as far as my approval." P had "They may prepare a release as far as my approval."
- **Added:** "A public release is published only by ..." (gap 3). The session named is his to fill; the design's reading is ARCH (D3:61).
- **Changed, in "They may never":** "typed by me in the session that publishes it" stands where P had a blank with two routes (gap 3).

### 3b. The trial repository: the lines that differ from 3a

The trial block is 3a with `<owner/trial>` for the repository and with four lines different. Everything else is the same.

1. **Added, after "That fetch only reads GitHub ...":**

```text
For the trial's first stage only, before the tool exists, one session in this repository may write one throwaway script of a few lines, kept in no repository, and run it with node. The script may start gh and git, as the tool will, to do these and nothing else: list this repository's open pull requests; make one test issue here, write one comment on it and rewrite that comment; and push to one working branch of this repository.
```

2. **Changed, the release line among the tool's acts.** For 3a's "and make and publish development releases, each a pre-release with its tag in this repository, made only for development":

```text
and make and publish development releases, each a pre-release with its tag in this repository. Every release made from this repository is a development pre-release.
```

3. **Changed, the two public-release lines.** For 3a's "They may prepare a public release ..." and "A public release is published only by ...":

```text
No public release is ever made from this repository. To try my approval, one development pre-release named as the trial's is prepared unpublished and is published only by <the session that plays the architecture session>, through the tool, in the turn in which I type my approval of it in that session.
```

4. **Changed, two clauses of "They may never".** For "push, merge or write to GitHub by any route other than the process's tool":

```text
push, merge or write to GitHub by any route other than the process's tool and the one trial script named above;
```

and for "publish a public release, or promote a release to installed sites, without my approval of that release, typed by me in the session that publishes it":

```text
publish a public release; promote any release to installed sites;
```

Why: gaps 10 and 11. Line 2 and line 3 together say what B4:113 and B4:114 need: development pre-releases without approval, and one of them held for his typed word.

### 3c. The process's repository

```text
Standing approvals from Bob, <date>, for Process4's own repository, <owner/process>. They cover the PROCESS session and the sessions it starts.

Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on Process4 on the Claude account the acting session itself runs under; create, switch off and delete their own scheduled tasks on that account; notify me by push notification; and create and edit Process4 pages on claude.ai under that account.

The process's tool is the program tool/p4.mjs inside the session's read-only copy of the process, run with node.
Each session's first command fetches that copy: it clones this repository at the commit its process config names into the folder process4/<that commit id> under the session's home folder, outside this repository's working files; installs there the one public package the tool needs; and makes the copy read-only.
That fetch only reads GitHub. It is the one command to GitHub that is not made by the tool.

In this repository only, and only through the process's tool, they may:
make a new working branch from main;
push to their own working branches;
open pull requests, comment on them, mark them ready or draft, and close them;
open the process's own shared-state issue in this repository, and write and rewrite comments on it;
read pull requests, issues and test runs, with a run's output;
and run the tool's own tests.

A change to the process is merged only on my word given at PROCESS. That word is my approval of that change, typed by me in the PROCESS session and written into the record of the change exactly as typed, with its date.
With it, PROCESS may merge that change's pull request into main through the tool, once GitHub's required test run on it has passed, without a person's review.
Words of mine quoted or passed on by another session, and my approval of a different change, are not that word.

They may never: merge a change to the process without that word; push, merge or write to GitHub by any other route; force-push; delete a branch, tag or release; change permission, repository or rule settings; change this block or the list of forbidden commands; act on a product's repository, accounts or services, which are governed only by that product's approvals; or act on any other account or service.
```

Changed or added against P:84 to 90:

- **Added:** the three lines on the tool and the fetch (gaps 7, 8 and 9). Whether PROCESS runs the tool from a fetched copy or from its own working files is not said in the texts; see section 5.
- **Added:** "make a new working branch from main" (gap 1).
- **Added:** "open the process's own shared-state issue ..." (gap 13).
- **Added:** "read pull requests, issues and test runs ..." (gap 6).
- **Changed:** "With it, PROCESS may merge ... once GitHub's required test run on it has passed, without a person's review." The words "once GitHub's required test run on it has passed" are new (gap 12).

### 3d. The process's repository while the tool is first built: the lines that differ from 3c

This wording is for the time from his acts 7 and 8 until the tool can merge (B1:128). After that he commits 3c. Three lines differ.

1. **Changed, the first paragraph's second sentence.** For "They cover the PROCESS session and the sessions it starts.":

```text
They cover the PROCESS session and the sessions it starts, and, until the tool can merge, the one building session I start on this repository to build the tool.
```

2. **Added, after the list of the tool's acts:**

```text
Until the tool exists, the building session may, without the tool, push to its own working branch and open its own pull requests into main by the ordinary git push command and the ordinary GitHub tools of its session. It merges nothing. I merge each of its pull requests myself.
```

3. **Changed, one clause of "They may never".** For "push, merge or write to GitHub by any other route":

```text
push, merge or write to GitHub by any other route, except the building session's pushes and pull requests named above;
```

Why: gaps 14 and 15. The words follow D4:156 and B4:28.

## 4. The forbidden commands: proposed list

**Proposal.** The starting point is the list he committed for Process3, as the inventory quotes it (`process4/evidence/permissions_inventory.md` lines 122 to 160). The form of each line is that list's own form.

### 4a. A real product's repository, the trial repository, and the process's repository once the tool can merge

```json
{
  "permissions": {
    "deny": [
      "mcp__github__merge_pull_request",
      "Bash(gh pr merge *)",
      "Bash(gh api *pulls/*/merge*)",
      "Bash(git push --force *)",
      "Bash(git push -f *)",
      "Bash(git push --force-with-lease *)",
      "Bash(git push --mirror *)",
      "Bash(git push origin --delete *)",
      "Bash(git push origin HEAD:main)",
      "Bash(git push origin main)",
      "Bash(git push -u origin main)",
      "Bash(git reset --hard *)",
      "Bash(git clean -fd *)",
      "Bash(git clean -fdx *)",
      "Bash(git stash drop *)",
      "Bash(git rebase *)",
      "Bash(git commit --amend *)",
      "Bash(git tag *)",
      "Bash(git branch -D *)",
      "Bash(gh api *contents/*)",
      "Bash(gh api *git/blobs*)",
      "Bash(gh api *git/trees*)",
      "Bash(gh api *git/commits*)",
      "Bash(gh api *git/refs*)",
      "Bash(curl *api.github.com*)",
      "mcp__github__create_or_update_file",
      "mcp__github__push_files",
      "mcp__github__delete_file",
      "Bash(git push)",
      "Bash(git push *)",
      "Bash(gh *)",
      "mcp__github__create_pull_request",
      "mcp__github__update_pull_request",
      "mcp__github__update_pull_request_branch",
      "mcp__github__create_branch",
      "mcp__github__enable_pr_auto_merge",
      "mcp__github__disable_pr_auto_merge",
      "mcp__github__pull_request_review_write",
      "mcp__github__add_comment_to_pending_review",
      "mcp__github__add_reply_to_pull_request_comment",
      "mcp__github__resolve_review_thread",
      "mcp__github__unresolve_review_thread",
      "mcp__github__request_copilot_review",
      "mcp__github__add_issue_comment",
      "mcp__github__update_issue_comment",
      "mcp__github__issue_write",
      "mcp__github__sub_issue_write",
      "mcp__github__actions_run_trigger",
      "mcp__github__create_repository",
      "mcp__github__fork_repository"
    ],
    "allow": [
      "Bash(node */process4/*/tool/p4.mjs *)",
      "Artifact"
    ]
  }
}
```

Marks, by line of the `deny` list:

- **Lines 1 to 31, unchanged:** his Process3 list, in its order.
- **Lines 32 to 50, added.** Eleven are the tools P:101 named. Eight are new here (gap 16): lines 37, 39, 40, 41, 42, 43, 45 and 47, which are `disable_pr_auto_merge`, `add_comment_to_pending_review`, `add_reply_to_pull_request_comment`, `resolve_review_thread`, `unresolve_review_thread`, `request_copilot_review`, `update_issue_comment` and `sub_issue_write`. The tools that only read are left open, as in P:106.

Marks, the `allow` list:

- **Changed:** the first line. It was `Bash(node .process/tool/p3.mjs github push *)`, and P:102 left a blank. The stars stand for the home folder and the commit id (gap 9). The record says an allow rule changed nothing under Auto mode (P:23), so leaving this line out is supported just as well.
- **Unchanged:** `Artifact`.

Also carried from P:103: in a product that still carries them, the two retired hooks are removed from the same file. That is outside the `permissions` block.

**The trial repository: no line differs.** Stage 0's script is started by a command that begins `node`, and no line of the list matches it. B1:40 says the list does not reach programs that another program starts; that is unproven and is what stage 0 tries (B4:39 to 42). If the list does reach them, no wording of the list lets the script through short of removing `Bash(gh *)` and the two `git push` lines, and then the tool cannot work either.

### 4b. The process's repository while the tool is first built: the lines that differ from 4a

Three lines of the `deny` list are left out, and the `allow` list holds `Artifact` only. All else is 4a.

- **Left out:** `"Bash(git push)"` (line 29).
- **Left out:** `"Bash(git push *)"` (line 30).
- **Left out:** `"mcp__github__create_pull_request"` (line 32).
- **Left out of `allow`:** the `node` line, because the tool does not exist yet.

Why: gap 15. Lines 4 to 11 still take away a forced push, a deletion and a push to main. When the tool can merge, he commits 4a there. The process repository's main has no settings file today (P:104), so leaving the file out until then is the other way to the same end; it leaves the forced push, deletion and push to main to GitHub's own rules alone.

## 5. Proven, unproven and uncertain

**Proven, from the record only:** the form of the 31 unchanged `deny` lines and of the two old `allow` lines, which he committed and which loaded in Process3; that a denied tool is removed outright (1 probe, 8 acts, P:22); that an allow rule changed nothing under Auto mode (P:23); the words "without a person's review" and "including sessions that other sessions started" (P:33, P:39). The form `Bash(git *)`, a command's first words followed by a star, is also what the harness's own settings guide gives, read in this session.

**Unproven:** every line of sections 3 and 4 that is marked changed or added, and each block as a whole. No session has loaded this wording. No act of the tool has been judged (B1:54). Nothing here says how a permission checker will read it.

**Uncertain: the form of lines in the list.**

1. `Bash(node */process4/*/tool/p4.mjs *)`. Stars inside a line are in his present list (`Bash(gh api *pulls/*/merge*)`), but as `deny` lines; this one as an `allow` line is not verified. Not known: whether a star can begin the pattern after `node`; whether the line is matched against the command as typed, with `$HOME` unexpanded, or as expanded; whether a star crosses a `/`.
2. How the path is typed after the fetch. B1:31 names the commit id "once, as a shell variable". A variable set in one command of a session may not last to the next. If it does not, every later command carries the 40-character id written out, and the checker sees that.
3. The fetch line is four commands joined into one. Not known: whether the list and the checker treat it as one act or four, and whether any part of it (`git clone`, `npm ci`, `chmod -R a-w`) is stopped by something outside this list.
4. Whether the list reaches `gh` and `git` when a `node` program starts them (B1:40; stage 0).
5. A line naming the whole server, `mcp__github`, in place of lines 32 to 50 and the four older tool lines: not verified (P:101), and it would take the reading tools too. The names in lines 32 to 50 are as this session's tool list shows them today; a renamed or new tool is not caught.
6. Whether the three lines left out in 4b are the building session's "ordinary means". The texts do not name the means (D4:156; B4:28). If it marks its pull requests ready or comments on them, it also needs `update_pull_request` or `add_issue_comment`, which 4b still takes away.
7. The harness's settings file has a place for rules given to Auto mode's checker itself. Not read here: whether a repository's file may use it. Nothing in this proposal uses it.

**Uncertain: what the texts leave unsaid.**

8. Whether PROCESS, and the sessions it starts, fetch a copy and run the tool from the home folder like every other session (B1:31 says "each session"), or run `tool/p4.mjs` from the working files they are changing (P:104). 3c is written for the first.
9. Whether the "word" is needed for every merge by PROCESS, or only for a change to the process. PROCESS also keeps a folder of research and records in that repository (D6:65; D4:150). 3c keeps P's wording, which speaks only of "a change to the process" and forbids nothing else in so many words.
10. Who publishes a public release (D3:61, open with him), and so which session's name fills the blank in 3a.
11. Where the process's repository is, and whether it is public (B4:23; B1:134). If it is this repository, replacing the present block (C:3) also ends the approvals that Process3's own sessions run under.
12. When exactly 3d and 4b give way to 3c and 4a. The texts say "until the tool exists" for the pushes (D4:156) and "until the tool can merge" for his merging (B1:128); these are two different moments.
13. Whether the trial's stage 0 session and stage 1 "plain session" (B4:36, B4:50) count as "working on this product under Process4" when no ROOT has started them. 3a's first paragraph is P's and does not name them.
14. Whether the tool's `branch` and `walk open` need a label or anything else made on GitHub that 3a does not name. `state write --create` finds the issue "by its label" (B1:75, B1:76); making a label is not named in B1's table.
15. The trial's first content includes a workflow file pushed by a session (B4:50). Whether the sessions' GitHub account may push one is a GitHub setting, not wording, and is not said.
16. Subscribing to pull request activity, running workflows by hand, and changing a scheduled task that another session made (the watcher taking over ROOT's wake, D4:107) stay out, as in P:94. No text read here asks for them in so many words.
17. The second doubt at P:106 is settled by the tool's `results` and `failed-runs`. The first, that the old allow line is dead and not a block, stands as P left it.
