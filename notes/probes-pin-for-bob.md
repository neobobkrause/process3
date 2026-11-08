# Probes pin move: prompt for a session Bob opens

Paste everything below the line into a new session on neobobkrause/process3-probes, branch tranche.

---

# Pin move: neobobkrause/process3-probes to process3 a6bd8f11de

You are a short session that moves neobobkrause/process3-probes's process pin (`.process`) to process3 commit `a6bd8f11deba44faba3bc5aaea95e81129d0d966` and ends. Why: C40 (product-neutral process3, split ledgers) with C41/C42 (process/ root, one repository per session). Bob's standing approvals in CLAUDE.md on the tranche are your authority. Give each judged act (a push, a merge) its own shell command. If an act is refused, never reword or reroute it: send its exact words to `session_018BhcedocxexhtJW2Rz2gdo` with send_message and end.

1. `git fetch origin tranche --depth 1`, then `git checkout -q -b p3-pin-work FETCH_HEAD`, then `git update-ref refs/p3/pin-base HEAD`
2. `git submodule update --init .process`
3. `git -C .process fetch origin a6bd8f11deba44faba3bc5aaea95e81129d0d966` (no --depth: the merge tool reads the pin's ancestry), then `git -C .process checkout -q --detach a6bd8f11deba44faba3bc5aaea95e81129d0d966`
4. `git add .process`, then `git commit -q -m "process: pin a6bd8f11de"`
5. `node .process/tool/p3.mjs setup check --at HEAD`. For each gap, as it names: a workflow differing from or lacking the pin's shim, copy `.process/shims/<f>` to `.github/workflows/<f>`; CLAUDE.md lacking the process lines, replace the old process lines below the approvals block with those of `.process/shims/CLAUDE.process.md` ({tranche} as tranche), changing nothing in the approvals block. Commit, and run it again. A gap in `.claude/settings.json` (the owner's file), or any other gap: send it to `session_018BhcedocxexhtJW2Rz2gdo` and end.
6. `git fetch origin tranche --depth 1`, then `git checkout -q -b p3/pin-a6bd8f11de FETCH_HEAD`, then `git cherry-pick refs/p3/pin-base..p3-pin-work`. If the cherry-pick stops (a conflict, or nothing left to pick: the tip already carries the pin), `git cherry-pick --abort`, send `session_018BhcedocxexhtJW2Rz2gdo` what it said and end.
7. `node .process/tool/p3.mjs setup check --at HEAD` again: a gap, as in step 5.
8. `node .process/tool/p3.mjs pin check neobobkrause/process3-probes` (a pin move must not run beside another): if it refuses, send its exact words to `session_018BhcedocxexhtJW2Rz2gdo` and end.
9. `node .process/tool/p3.mjs github push origin p3/pin-a6bd8f11de --set-upstream`
10. create_pull_request {"owner":"neobobkrause","repo":"process3-probes","head":"p3/pin-a6bd8f11de","base":"tranche","title":"process: pin a6bd8f11de","body":"Moves the process pin to process3 a6bd8f11deba44faba3bc5aaea95e81129d0d966. C40 (product-neutral process3, split ledgers) with C41/C42 (process/ root, one repository per session)"}
11. `node .process/tool/p3.mjs merge <that pull request> --plain --as pin --no-review "a process pin move; the fix was reviewed in process3"` (a pull request that conflicts with tranche is refused at once: send the refusal and end)
12. It prints the wake of BOB: run that send as printed, then send_message to the address it prints, then `node .process/tool/p3.mjs send delivered <n> --from pin`. If it says no BOB is addressed, there is no wake: send nothing.
13. Send `session_018BhcedocxexhtJW2Rz2gdo` one message with send_message: the pull request, the merge commit, and the wake's number (or "no BOB"). Then end.


14. After step 13: on a new branch from the tranche tip, set `coordinator` in process/config.json to session_018BhcedocxexhtJW2Rz2gdo (change nothing else), push it with `node .process/tool/p3.mjs github push origin <branch> --set-upstream`, open a pull request into tranche, and merge it with `node .process/tool/p3.mjs merge <n> --plain --rounds 1 --reviewed "coordinator field only"` once its checks pass. Send the coordinator the pull request and merge commit.
