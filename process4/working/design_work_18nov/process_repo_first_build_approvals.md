Length: 93 lines. Last section: "5. Not proven".

# The process repository's approvals and forbidden commands for the first build, taken from Process3's own

Written by Claude on 18 Nov 2026. **A proposal. Nothing here is the owner's words unless it is quoted from his Process3 files, and no session has loaded any of it.** It replaces, for the first build only, sections 3c, 3d and 4b of `approvals_proposal_brought_up_to_date.md`, which were written without Process3's own files in hand.

## 1. What was read for this

In full: `process4/evidence/permissions_inventory.md` (462 lines); `process4/working/foundations_updated/09-permissions-and-platform.md` (129); and, from the `tranche` branch of this repository, Process3's own `CLAUDE.md` (5 paragraphs), `.claude/settings.json` (21 deny rules, 1 allow rule) and `setup/DEVELOPER.md` (195 lines, the eleven steps).

Not read: the product's files themselves (only as the inventory quotes them); the probes repository's table; the code of Process3's start check, record check and wake check; `setup/conditions.json`.

## 2. The method

Start from the owner's own last wording for the process's repository (8 Nov), which ran: 93 merges by the sessions' account after it. Change only what the first build of Process4 changes. Mark every change with its reason. Nothing is reworded for style.

## 3. The approvals block

```text
## Standing approvals from Bob

Standing approvals from Bob for Process4, the development process, 18 Nov 2026, for process4's own repository only, while its tool is first built. They cover every Claude session working on Process4, including sessions that other sessions started. Each product developed with Process4 carries its own approvals in its own repository. A session's acts on a product's repository, accounts and services are governed only by that product's approvals, and are made only from a session started in that product's repository (one repository per session).

Such sessions may, without asking me: subscribe to and unsubscribe from activity on the process's pull requests; notify me by push notification; and create and edit Process4 pages and documents on claude.ai under the Claude account the acting session itself runs under.

In this repository, neobobkrause/process4, only, they may: push to their own working branches; open, edit, comment on, mark ready or draft, close and reopen pull requests; run builds and tests, fetching public packages and images for them; run, re-run and cancel this repository's own workflows; and change its workflow files only through pull requests that I merge, never renaming or removing a job whose name matches a required check, never widening any workflow's or job's permissions, and never adding a pull_request_target trigger. They merge nothing. I merge each of their pull requests myself, on GitHub's website.

They may never: merge a pull request; force-push; delete a branch, tag or release; change permission, repository or ruleset settings, or a protected environment; push to main; change this block or the file .claude/settings.json; reveal any secret value; or act on any account or service other than those named here, except under a product's own approvals from a session started in that product's repository. Reading public documentation, reading the public repository neobobkrause/process3, and fetching public packages and images are not acts on another service.
```

**Each change from his 8 Nov block, and why.**

| His 8 Nov words | Here | Why |
|---|---|---|
| "for Process3 ... restated on 8 Nov 2026 for process3's own repository only" | "for Process4 ... 18 Nov 2026, for process4's own repository only, while its tool is first built" | The name, the date, and that this wording is for the first build |
| "(one repository per session, PLT-7)" | "(one repository per session)" | The code names a Process3 list |
| "start, message, interrupt and archive Claude sessions ...; create, switch off and delete the process's scheduled tasks" | Left out | The building session starts no session and no task. They come back with PROCESS's wording |
| "push to their own working branches and to the process's state branch; create tranche branches from main" | "push to their own working branches" | Process4 has no state branch, and this repository has no tranche branch |
| "review without approving" | Left out | Process4 has no review |
| "through the process's merge tool, merge pull requests ... without a person's review, and merge the tranche's pull request into main the same way" | "They merge nothing. I merge each of their pull requests myself, on GitHub's website." | The design: until the first build is done he merges each one |
| "only through pull requests the merge tool merges after a green gate" | "only through pull requests that I merge" | The same |
| "never adding or renaming a job whose name matches a required check" | "never renaming or removing a job whose name matches a required check" | The building session must add the tool's test run, whose name he then requires. After that, renaming or removing it is what would open the way round it |
| "push to main except through the tranche's pull request" | "push to main" | No tranche here |
| Not there | "merge a pull request" and "change this block or the file .claude/settings.json" among the nevers | Process3's tool refused a session's change to either file. Process4 has no such check; the words and the permission checker are what is left |
| "delete a branch, tag or release, or choose the delete-branch option when merging" | "delete a branch, tag or release" | They do not merge |
| Not there | "reading the public repository neobobkrause/process3" | The design, the build texts and the earlier tool's code are carried over from there |
| The last paragraph, on the branch cleanup workflow | Left out | Process4 deletes no branch |

## 4. The forbidden commands

His own list for the process's repository, with three lines taken out. Nothing is added.

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
      "Bash(git push origin --delete *)",
      "Bash(git push origin main)",
      "Bash(git push origin HEAD:main)",
      "Bash(gh api *contents/*)",
      "Bash(gh api *git/blobs*)",
      "Bash(gh api *git/trees*)",
      "Bash(gh api *git/commits*)",
      "Bash(gh api *git/refs*)",
      "Bash(curl *api.github.com*)",
      "mcp__github__create_or_update_file",
      "mcp__github__push_files",
      "mcp__github__delete_file",
      "Bash(gh *)"
    ]
  }
}
```

**Taken out, and why.**

- `"Bash(git push)"` and `"Bash(git push *)"`. He added these on 6 Nov, after GitHub suspended the sessions' account, so that every push went through Process3's tool, which paced them. The Process4 tool does not exist yet, so the building session's only way to push is the ordinary one. They go back in when the first build is done.
- The allow line `"Bash(node tool/p3.mjs github push *)"`. It names Process3's tool. The record says an allow line changed nothing under Auto mode.

Not carried from the larger proposal: the nineteen GitHub tools it added to the list. Process3 left them open, and the building session needs several of them (opening, editing and commenting on its pull requests) because it has no tool yet. Whether Process4's final list should take them away is a separate question for the wording that follows the first build.

## 5. Not proven

- Any of this before the permission checker. The nearest record: his 8 Nov block, of which this is an edit, was followed by merges in this repository; the block restated the same day in the probes repository was followed by two refused pushes, cause never found.
- That a session started on the new repository loads these files. Process3's record: only when the session holds that one repository and starts from the branch that carries them; and the cloud twice handed a session a copy about an hour old.
- That the sessions' account can push a workflow file through Claude's GitHub App.
- What stops a session's pull request from changing either file, other than these words, the checker's refusal seen twice in Process3, and his own eye when he merges.
