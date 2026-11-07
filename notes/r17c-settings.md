# R17c: the three repositories' `.claude/settings.json`, for Bob to apply

**Apply these only after R17c is merged into process3's tranche and pinned on each product** (the
copy's and the probe's `.process` at a process3 commit that holds `github hook`). Each file below
is complete, ready to paste over the repository's `.claude/settings.json` on its tranche. They are
Bob's files: no session writes them.

What they add (coordinator's ruling, 6 Nov; Bob: all GitHub traffic monitored and limited, enforced,
not by rule):

- **PreToolUse hooks**, matcher `mcp__github__.*` and matcher `Bash`, both calling the pinned tool's
  `github hook`. A connector call is counted in the account's ledger and waits or is refused like a
  gh call; a raw `git push`, any `gh`, or curl/wget to github.com is refused. Exit 2 blocks the call.
- **The hook's own entry first (R17d)**: `tool/hook.mjs` in the pinned tool, which loads only the
  hook's modules; a connector read then answers from the clone's cached pause and stop with no
  network call (p95 about 80 ms; a refresh runs in the background, fetching the ledger only when
  `git ls-remote` shows it moved). A pin from R17c, with no `hook.mjs`, runs `p3.mjs github hook`.
- **The hook fails open only when the tool itself is missing**: no pinned `p3.mjs` (the pin not
  filled yet), or one without `github hook` (a pin from before R17c). It says which on stderr and
  exits 0, so such a clone is not bricked. Anything else is closed: a governor refusal exits 2, and
  so does any failure of the tool (it exits 2, never 1, which Claude Code would let through).
  `CLAUDE_PROJECT_DIR` unset, it uses the working directory.
- **Timeout 300 s**: the hook never waits past 2 minutes for the budget (longer, it refuses and
  says to retry the call), well inside the timeout, so it is never killed into letting a call
  through.
- **With the hook installed, `github note` double-counts** a connector write (the hook counts it
  too). Retire the note rule once these settings are applied: the coordinator's call.
- **Deny** `Bash(git push)`, `Bash(git push *)`, `Bash(gh *)` beside each file's existing denies,
  and **allow** the tool's own push: `Bash(node .process/tool/p3.mjs github push *)` in a product,
  `Bash(node tool/p3.mjs github push *)` in process3. Deny wins over allow in Claude Code, so the
  tool's push is allowed only because it is not a `git push` or `gh` command line; its own git push
  runs inside the tool, under the governor.
- Kept: every existing deny entry, and the copy's SessionStart hook
  (`bash "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"`).

Notes:
- process3-probes **does** have a `.claude/settings.json` today (its deny list is kept below),
  contrary to the earlier note that it had none.
- `Bash(gh *)` also denies `gh api search/...`, which builder sessions use for code search on
  GitHub; with these settings that search goes through the GitHub connector instead (counted by the
  hook).
- process3 has no SessionStart hook; none is added.

## neobobkrause/civicsmith-copy

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
      "Bash(gh *)"
    ],
    "allow": [
      "Bash(node .process/tool/p3.mjs github push *)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\""
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "mcp__github__.*",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/.process/tool/p3.mjs\"; h=\"$d/.process/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/.process/tool/p3.mjs\"; h=\"$d/.process/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

## neobobkrause/process3

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
      "Bash(git push)",
      "Bash(git push *)",
      "Bash(gh *)"
    ],
    "allow": [
      "Bash(node tool/p3.mjs github push *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__github__.*",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/tool/p3.mjs\"; h=\"$d/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/tool/p3.mjs\"; h=\"$d/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

## neobobkrause/process3-probes

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
      "Bash(node .process/tool/p3.mjs github push *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__github__.*",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/.process/tool/p3.mjs\"; h=\"$d/.process/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "d=\"${CLAUDE_PROJECT_DIR:-$PWD}\"; f=\"$d/.process/tool/p3.mjs\"; h=\"$d/.process/tool/hook.mjs\"; cd \"$d\" || exit 2; if [ -f \"$h\" ]; then node \"$h\"; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2; fi; if [ ! -f \"$f\" ]; then echo \"GitHub pacing hook: no tool at $f (the pin not filled yet): this call is not governed\" >&2; exit 0; fi; if ! grep -q \"'github hook'\" \"$f\"; then echo \"GitHub pacing hook: $f has no github hook (a pin from before R17c): this call is not governed\" >&2; exit 0; fi; node \"$f\" github hook; s=$?; [ \"$s\" -eq 0 ] && exit 0; exit 2",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```
