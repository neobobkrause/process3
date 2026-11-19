Length: 101 lines. Last section: "5. Not proven".

# The trial repository's approvals and forbidden commands, taken from his own for that repository

Written by Claude on 19 Nov 2026. **A proposal. Nothing here is the owner's words unless it is quoted from his own files, and no session has loaded any of it.** The trial repository is `neobobkrause/process3-probes`, on his word of 19 Nov: "The throwaway repo to use is neobobkrause/process3-probes ... You have my permission to use it however you need."

## 1. The repository as it stands, read on 19 Nov

- Public. The sessions' account has push and not admin. Merge commits, squash and rebase are all allowed; auto-merge off; delete-on-merge off.
- Two rulesets: "every-branch" (all branches: no deleting, no force-pushing), and "process3" on `main` and `tranche` (pull request, 0 approvals, merge only, and the required check `gate`, which is Process3's).
- More than a hundred branches and 44 open pull requests, among them other sessions' current work (`claude/reading-measurement-2`, `codex/p4-...`) and the notice's proof (`notice-proof`). None is touched.
- `main` carries his approvals of 2 Nov, a deny list of 11 lines, Process3's workflows and its pinned copy.

**Decided here:** the trial runs on a new branch, `p4-tranche`, made on 19 Nov by this session from the newest commit of `main` (`f353d60`). Gives: Process3's rule on `main` and `tranche`, which demands `gate`, does not stand in the way until the trial reaches the merge into `main`; other sessions' branches are left alone. Costs: the branch begins with Process3's files, which the trial's first pull request takes out; the process config names `p4-tranche` as the tranche branch.

## 2. The method

Start from his own last wording for this repository: the block "restated on 8 Nov 2026 for this repository only" on its `tranche` branch, and the settings file beside it. Change only what Process4's trial changes. This wording is for the first two stages: the trial of whether a program can reach GitHub, and the first piece of the tool. The trial release of a later stage needs a further edit, which is one of the two edits the trial plans to make anyway.

## 3. The approvals block

```text
## Standing approvals from Bob

Standing approvals from Bob for process3-probes, the test bed of Process4, 19 Nov 2026, for this repository only. They cover every Claude session working in this repository under Process4, including sessions that other sessions started. Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on Process4 in this repository, on the Claude account the acting session itself runs under; subscribe to and unsubscribe from activity on the process's pull requests; create, switch off and delete the process's scheduled tasks on that account; and notify me by push notification.

The process's tool is the program tool/p4.mjs in the session's read-only copy of the process, run with node. Each session's first command fetches that copy: it clones the public repository neobobkrause/process4 at the commit the process config names into a folder outside this repository's working files, installs there the public packages the tool needs, and makes the copy read-only. That fetch only reads GitHub.

In this repository, neobobkrause/process3-probes, only, and only through the process's tool, they may: make and push to their own working branches; open, edit, comment on, mark ready or draft, close and reopen pull requests; merge pull requests into the tranche branch, p4-tranche, once GitHub's required test run on them has passed, without a person's review, and merge the tranche's pull request into main the same way; open and close the process's own issues and write and rewrite comments on them; and read pull requests, issues and test runs, with a run's output. They may run builds and tests, fetching public packages and images for them; run, re-run and cancel this repository's own workflows; and change its workflow files only through pull requests the tool merges after the required test run has passed, never renaming or removing a job whose name matches a required check, never widening any workflow's or job's permissions, and never adding a pull_request_target trigger.

Until the process's tool exists, the one session I start for the first trial may, without the tool, by a script of a few lines that it writes and runs with node and that starts git and gh as the tool will: read this repository's pull requests; open one test issue, write one comment on it and rewrite that comment; and push to its own working branch.

They may never: push, merge or write to GitHub by any route other than the process's tool, except the first trial's script named above; force-push; delete a branch, tag or release, or choose the delete-branch option when merging; change permission, repository or ruleset settings, or a protected environment; push to main or to p4-tranche except through a pull request; change this block or the file .claude/settings.json; cut or publish any release; reveal any secret value; or act on any account or service other than those named here. Reading public documentation and fetching public packages and images are not acts on another service.
```

**Each change from his 8 Nov block for this repository, and why.**

| His 8 Nov words | Here | Why |
|---|---|---|
| "the process's test bed, restated on 8 Nov 2026" | "the test bed of Process4, 19 Nov 2026" | The name and the date |
| "working in this repository" | "working in this repository under Process4" | Other sessions work in this repository on other branches |
| "Claude sessions working on Process3 or on a product developed with it" | "Claude sessions working on Process4 in this repository" | The name; and the trial starts no session elsewhere |
| Not there | The paragraph on the tool and the fetch | Process3's tool came pinned inside the repository. Process4's is fetched as each session's first command, and that fetch is the one command to GitHub not made by the tool |
| "push to their own working branches and to the process's state branch; create tranche branches from main" | "make and push to their own working branches" | No state branch; one lasting tranche branch, already made |
| "review without approving" | Left out | Process4 has no review |
| "through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way" | "merge pull requests into the tranche branch, p4-tranche, once GitHub's required test run on them has passed, without a person's review, and merge the tranche's pull request into main the same way" | The tool now governs every act, so "only through the process's tool" stands at the head of the sentence. Process4 has no gate of its own, only GitHub's required run. "without a person's review" is kept word for word |
| Not there | "open and close the process's own issues and write and rewrite comments on them" | The shared state and each walk are kept as comments on issues. The checker refused acts the text did not name |
| Not there | "read pull requests, issues and test runs, with a run's output" | The forbidden commands take away every GitHub command, so reading too must be the tool's, and named |
| "pull requests the merge tool merges after a green gate" | "pull requests the tool merges after the required test run has passed" | The same change |
| "never adding or renaming a job whose name matches a required check" | "never renaming or removing a job whose name matches a required check" | The trial's first session must add the required run's job. Renaming or removing it afterwards is what would open a way round it |
| "never making the process gate anything but the process's own shim at the pinned process" | Left out | Process4 has no gate and no pin inside the repository |
| Not there | The paragraph on the first trial's script | The first trial runs before any tool exists, and tries exactly whether a program started this way can reach GitHub |
| Not there | "push, merge or write to GitHub by any route other than the process's tool, except the first trial's script"; "change this block or the file .claude/settings.json" | The tool is to be the only door. Process3's tool checked changes to the two files; Process4 has no such check |
| "push to main except through the tranche's pull request" | "push to main or to p4-tranche except through a pull request" | Until he adds the rule for p4-tranche, only these words keep a session off it |
| The last paragraph, on the branch cleanup workflow | Left out | Process4 deletes no branch |

Kept word for word: "including sessions that other sessions started"; "without a person's review"; "cut or publish any release"; the last sentence on public documentation and packages.

## 4. The forbidden commands

His own file for this repository's `tranche` branch: the same 14 deny lines in his order, nothing added.

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force *)",
      "Bash(git push -f *)",
      "Bash(git push --force-with-lease *)",
      "Bash(git push origin --delete *)",
      "mcp__github__create_or_update_file",
      "mcp__github__push_files",
      "mcp__github__delete_file",
      "Bash(gh api *contents/*)",
      "mcp__github__merge_pull_request",
      "Bash(gh pr merge *)",
      "Bash(gh api *pulls/*/merge*)",
      "Bash(git push)",
      "Bash(git push *)",
      "Bash(gh *)"
    ],
    "allow": [
      "Artifact"
    ]
  }
}
```

**Taken out, and why.**

- The allow line `"Bash(node .process/tool/p3.mjs github push *)"`: it names Process3's tool. The record says an allow line changed nothing under Auto mode, so none is put in its place.
- The two `PreToolUse` hooks: Process3's pacing of GitHub calls, retired on 9 Nov; he removed them from the Process3 repository's own file that day.

The list keeps the two lines that take away every ordinary push and the line that takes away every `gh` command. That is the point of the first trial: with them in force, does a program that a script starts still reach GitHub.

## 5. Not proven

- Any of this before the permission checker. On 8 Nov, after the block this is edited from was committed, two pushes by sessions in this repository were refused, "judged dangerous", and the cause was never found.
- That the forbidden commands do not reach `git` and `gh` when a `node` program starts them. If they do, no wording lets the tool through, and the design changes.
- That a session started on `p4-tranche` loads that branch's two files and not `main`'s.
- That a list which names tools one at a time takes away every way of writing to GitHub. The larger proposal named nineteen more GitHub tools; his own list never had them, and they are not added here.
