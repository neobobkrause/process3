# Permission management at the end of Process3, and what "no fresh-reviewer review" does to it

14 Nov 2026. Read-only research. Nothing in any repository was changed.

## Sources, and what could not be read

| Short name | What it is |
| --- | --- |
| P3 | `/home/user/neobobkrause/process3`, `origin/tranche` tip (the end state; the product pins it at `38b0f3f07f`), `origin/main`, `origin/start/coordinator-4nov` (the coordinator's log and handoffs, 3 to 10 Nov), `origin/process-state` |
| COPY | `/home/user/neobobkrause/civicsmith-copy`, single files by `git show origin/tranche:<path>` and `origin/main:<path>`; commit messages by `git log` (no blobs); `origin/process-state` |
| PROBES | `neobobkrause/process3-probes`: `main` (cloned), and two branches read through `FETCH_HEAD` only (no ref written): `phase0/platform-table` (the dated platform table, `platform/TABLE.md`, with its evidence files) and `tranche` |
| FND | Foundations: scratchpad `foundations.md` and `governing/foundations.md` on P3's tranche |
| DOCS | Claude Code public documentation read today: `code.claude.com/docs/en/permission-modes.md` and `auto-mode-config.md` |

Limits.
- GitHub's own settings (rulesets, collaborators, environments, secrets, Actions policy) could not be read: this session has no API access to the three repositories. Everything in 1f is what `setup/conditions.json` and `setup/DEVELOPER.md` required the owner to set, plus what workflow files and commit authorship show. It is not a live reading.
- The trials of 2 Nov ("11 of 11", "0 of 21", "2 of 3", "about 450") have no evidence file. They are stated in the Foundations, and P3's own setup list marks the neighbouring 2 Nov figure "before the log; unverified". The only primary trace is the merge history of PROBES.
- Refusals in production were recorded only when a session reported one. The product's metrics hold one refusal row in total. "No recorded refusal" below means none in those rows, the tranche-open rows or the coordinator's log.

---

## Part 1. Inventory

### 1a. The owner's standing approvals

**Where the text lives.** One block per repository, in `CLAUDE.md`, under the heading `## Standing approvals from Bob` (the heading and owner are config: `approvals: { file: 'CLAUDE.md', heading: '## Standing approvals from Bob', owner: 'neobobkrause' }`, P3 `tool/lib/util.mjs`).

| Repository | Ref | State of the block |
| --- | --- | --- |
| COPY (product) | `origin/tranche` | 7 paragraphs, last set by the owner 9 Nov 08:38 PST, commit `50515e4526`, merged as PR 1115. File is 22 lines, 8,664 bytes |
| COPY | `origin/main` | The first version only, 1 Nov, commit `0dea5a6efd`. File is 3 lines, 641 bytes. Main never moved after 1 Nov |
| P3 (process) | `origin/tranche` | "restated on 8 Nov 2026 for process3's own repository only", commit `5d5adf4` |
| P3 | `origin/main` | The 2 Nov version, one paragraph |
| PROBES | `tranche` | "restated on 8 Nov 2026 for this repository only", commit `9dfed29` |
| PROBES | `main` | The 2 Nov version naming all three repositories |

**Full text, COPY `origin/tranche:CLAUDE.md`, approvals block (verbatim).**

> ## Standing approvals from Bob
>
> Standing approvals from Bob, 1 Nov 2026, widened for development releases and for every step of the development process on 2 Nov 2026, made exact for Cloudflare on 2 Nov 2026, widened on 4 Nov 2026 for development releases, container images, product workflows, development signing secrets and generated design-stream files, widened on 5 Nov 2026 for design lanes and a scheduled branch cleanup, and widened on 9 Nov 2026 for reviewed revert exemptions. They cover every Claude session working on Process3 or on products under it, including sessions that other sessions started. Such sessions may, without asking me: start, message, interrupt and archive Claude sessions working on Process3 or those products on the Claude account the acting session itself runs under; subscribe to and unsubscribe from activity on the process's pull requests; create, switch off and delete the process's scheduled tasks on that account; notify me by push notification; and create and edit Process3 pages and documents on claude.ai under that account.
>
> In this repository, neobobkrause/civicsmith-copy, only, they may: push to their own working branches and to the process's state branch; create tranche branches from main; open, edit, comment on, review without approving, mark ready or draft, close and reopen pull requests; through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way; record a reviewed revert exemption (`p3 revert exempt`) on a job's pull request, as its reviewer and never as the job's own session, when the job's change is a refactor or touches only tests or records so that its tests rightly pass both before and after the change (AUD-1, my Keep of 6 Nov 2026); run builds and tests, fetching public packages and images for them; run, re-run and cancel this repository's own workflows, including container-images, including when a merge's push fires it; cut, sign and publish development releases, as GitHub pre-releases with their tags, marked development, and install and upgrade them on development deployments; change this repository's own workflow files, only through pull requests the merge tool merges after a green gate, never adding or renaming a job whose name matches a required check, never widening any workflow's or job's permissions, never adding a pull_request_target trigger, and never making the process gate anything but the process's own shim at the pinned process; and create Actions secrets in this repository whose values the session or the repository's own workflow generated, for development signing only, naming them and never reading, printing, copying, overwriting or deleting any secret they did not create.
>
> On Docker Hub and GHCR, they may push the product's own images, only through this repository's workflows, to docker.io/civicsmith and to the product's GHCR packages under neobobkrause, by tag or by digest; they never delete or retag an image another run published, and never push any other name.
>
> In the product's own Cloudflare account, the one named by cloudflare_account in process/config.json, and in no other (the rehearsal account named by CS_TEST_CF_ACCOUNT_ID stays governed only by its own rule), they may: read everything except secret values; create, deploy, configure, seed, reset and delete development deployments and all their data, where a development deployment is any resource in that account except those this paragraph forbids changing below (today the Workers plat-s1, agent-runner-plat-s1, agent-worker-plat-s1 and pdf-worker-plat-s1, the R2 buckets bio-captures-plat-s1, bio-published-plat-s1 and bio-walks, and the Durable Objects and container applications those Workers define), and any new Worker, R2 bucket, container application or other resource whose name begins with p3dev- or contains -p3dev-, with the Durable Objects and container applications it defines; give them workers.dev addresses and preview URLs; set their variables, scheduled triggers, limits, log settings, and secrets whose values the session or a p3dev- install it ran generated; bind them only to development deployments, themselves included, and to browser rendering; deploy to them container images the product has already published on Docker Hub, named by digest; use browser rendering from them; cause those deployments to sign development releases and development catalogue seeds with the signing secrets they hold, naming the secrets only, never reading, printing, copying, overwriting or deleting them, and never deleting a secret that neither the session nor a p3dev- install a process session ran set, or a resource that holds one, except that a development deployment named p3dev- or biosmoke followed by a number may be deleted whole, its secrets with it, once its testing is complete; run walkers and other tests against them; and incur the usage charges this work causes in that account. Any Worker named biosmoke followed by a number is a development deployment, for testing releases only, together with the Workers it binds (today agent-runner, agent-worker, file-scanner, ocr-worker, pdf-worker and sheet-worker) and the R2 buckets bio-captures and bio-published; sessions may install and upgrade a release in it, walk it, and delete it and all data captured or generated in testing once testing is complete. They send no email from that account until I name an address here. All data in that account is throwaway, but that widens nothing. Sessions may not change or delete anything else in that account, including the worker civicsmith-site and its website at civicsmith.org and www.civicsmith.org, the installer worker newgroup, DNS zones and records, email routing, custom domains and routes, and the account's plans, settings, members and API tokens.
>
> Design lanes, run under BOB, own their lane folders, the design stream (docs/development/ux-substrate) included, and each lane runs as one session at a time. Within the product’s principles they decide design and wording there. Their design documents are claude.ai artifacts, not repository files. A pull request that changes only files in its own lane's folder lands through the merge tool without a test suite run, and the large files a lane's generators build are built at layer close, deploy and release, never committed.
>
> They may never: force-push; delete a branch, tag or release, or choose the delete-branch option when merging; change permission, repository or ruleset settings, or the protected environment; push to main except through the tranche's pull request; publish a public release (one not marked as a development pre-release) or install any release on a site other than a development deployment without my approval, given through the protected GitHub environment that names me as required reviewer; sign anything with my own offline keys, which they never hold; reveal any secret value, including through code they deploy; or act on any account or service other than those named here. Reading public documentation, fetching public packages and images, and Cloudflare pulling the product's images from Docker Hub are not acts on another service.
>
> One exception to the paragraph above: the process's scheduled branch cleanup workflow, running in this repository, may delete branches whose commits are all in the tranche, and the merge train's train/head/* branches whose pull request is closed; never main, the tranche or the state branch, a branch with an open pull request, or one with a commit in the last 2 hours.

Below the block the file carries four process lines under `## Process3` (not approvals; copied from P3 `shims/CLAUDE.process.md` by a session at each pin move). They name `start root`, `start bob`, `start watcher`, `job start`, and say "ROOT starts a new BOB".

**COPY `origin/main` (verbatim, whole block).**

> Standing approvals from Bob, 1 Nov 2026. Sessions working on Process3 or on products under it may, without asking me: start, message, interrupt and archive Claude sessions on this account; create, switch off and delete scheduled tasks on this account; push to their own working branches; open, comment on and merge pull requests into working and tranche branches; run builds and tests; and run the repository's own workflows. They may never: force-push, delete a branch, change permission or repository settings, push to main except through the tranche's pull request, or act on any other account or service.

**How the tranche differs from main.** Main is the 1 Nov text: no mention of sessions started by other sessions, no "without a person's review", no merge tool, no tranche-into-main merge, no releases, Cloudflare, Docker Hub, lanes, secrets, workflow edits, cleanup exception, or process lines. A session started from main therefore loads almost none of the working approvals. P3's setup list records what happened: "A runner started by hand from main held no approvals and was refused session starts."

**How the merge clause was worded over time (COPY commits, all by the owner through GitHub's website).**

| Commit, time (PST) | Merge clause |
| --- | --- |
| `0dea5a6efd`, 1 Nov 14:24 | "open, comment on and merge pull requests into working and tranche branches" |
| `e5c885df21`, 2 Nov 10:01 | "merge pull requests into working and tranche branches once their required checks pass, without a person's review, and merge the tranche's pull request into main once its required checks pass" |
| `6d4e2009c1`, 2 Nov 12:54 | "through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way" (unchanged to the end) |

The clause has never said "reviewed". From 2 Nov it says the opposite of a review condition: "without a person's review".

**P3's own block (tranche, 8 Nov).** Same session and task acts; same merge clause, word for word, for `neobobkrause/process3` only; adds "A session's acts on a product's repository, accounts and services are governed only by that product's approvals, and are made only from a session started in that product's repository (one repository per session, PLT-7)". No revert-exemption clause, no Cloudflare, no lanes.

**Who may edit it.** Only the owner, by his own commit through GitHub's website, signed in as himself (DEVELOPER.md Step 9: "An upload, GitHub Desktop or a `git push` does not count"). Reasons recorded:
- A session that wrote relayed approvals into a file other sessions load was refused by the judge, `[Instruction Poisoning]` (PROBES table row 30, 1 Nov, 1 try; again on 4 Nov 08:15, coordinator log, when BOB tried to record the owner's relayed word).
- FND: "No session writes, edits or relays them, because the judge refuses that".
- Sessions may edit the rest of `CLAUDE.md` (the process lines), and did, 6 times on the tranche.

The block was edited by the owner 10 times in COPY between 1 and 9 Nov (1 Nov; 2 Nov four times; 3 Nov; 5 Nov twice; 8 Nov; 9 Nov), and 10 times in P3.

**How its integrity was checked (the "approvals fingerprint").** Four mechanisms, all in P3's tool:
1. Record check (`tool/lib/record.mjs`, run inside the required `gate` check and on push): any change to the approvals block must be the owner's website commit: committer `web-flow`, verified, author the configured owner. The same rule covers `.claude/**` and `.mcp.json`. "`CLAUDE.md` and `.claude/rules/**/*.md`" outside the block are "plain instruction files" sessions may change.
2. Setup condition `approvals` (`setup/conditions.json`): exactly one block, and it equals the block the owner's website commit last set on the tranche or main.
3. `start check` (`tool/lib/start.mjs`): a session's first command compares HEAD and the approvals block in its checkout with the tranche tip; on a difference it prints "act on nothing, send both SHAs to your starter and end".
4. The wake check: the sha256 of the block is written into ROOT's, BOB's and the watcher's starting prompts and task prompts (`--approvals <hash>`). At each wake, a changed hash prints "approvals changed since this session started: it is replaced". Reason: "Approvals load only at a session's start".

Cost recorded in review.txt case 5: every owner edit stopped every role (4 Nov, 5 Nov twice, 8 Nov, 9 Nov). The 9 Nov edit stopped ROOT, BOB and the watcher at about 16:45Z and the product never restarted (coordinator log, 18:52Z 9 Nov to 00:52Z 10 Nov).

**Every act the product block names.**

| Group | Acts | Named by a Process3-specific word |
| --- | --- | --- |
| Scope | "every Claude session working on Process3 or on products under it, including sessions that other sessions started" | "Process3" (3 times in the block) |
| Sessions | start, message, interrupt, archive, on the account the acting session runs under | "working on Process3 or those products" |
| Pull request activity | subscribe, unsubscribe | "the process's pull requests" |
| Scheduled tasks | create, switch off, delete | "the process's scheduled tasks" |
| Owner contact | push notification | |
| claude.ai | create and edit pages and documents | "Process3 pages and documents" |
| Git | push to own working branches and "the process's state branch"; create tranche branches from main | "state branch", "tranche" |
| Pull requests | open, edit, comment, "review without approving", mark ready or draft, close, reopen | |
| Merges | merge into working and tranche branches; merge the tranche's pull request into main | "through the process's merge tool", "its gate" |
| Revert exemption | record a reviewed exemption, "as its reviewer and never as the job's own session" | "`p3 revert exempt`", "AUD-1" |
| Builds | run builds and tests; fetch public packages and images | |
| Workflows | run, re-run, cancel; container-images | |
| Development releases | cut, sign, publish as pre-releases; install and upgrade on development deployments | |
| Workflow files | change them, under four limits | "pull requests the merge tool merges after a green gate", "the process gate", "the process's own shim at the pinned process" |
| Secrets | create development signing Actions secrets | |
| Images | push the product's images through workflows to Docker Hub and GHCR | |
| Cloudflare | read; create, deploy, configure, seed, reset, delete development deployments; addresses; variables, triggers, limits, secrets; bindings; container images by digest; browser rendering; signing with held secrets; walkers and tests; usage charges; whole deletion of `p3dev-` and `biosmoke<n>` deployments | "p3dev-" (5 times; also `deploy.slug_prefix` in the product's config) |
| Lanes | own their folders; decide design and wording; artifacts on claude.ai; lane-only pull request lands without a suite run | "run under BOB", "the merge tool", "layer close" |
| Never | force-push; delete branch, tag, release; delete-branch on merge; change permission, repository, ruleset settings or the protected environment; push to main except by the tranche's pull request; public release or install outside development without the owner's approval "through the protected GitHub environment that names me as required reviewer"; sign with his offline keys; reveal a secret; act on any other account or service | "the tranche's pull request" |
| Exception | the scheduled cleanup workflow may delete merged branches | "the merge train's train/head/* branches" (the merge train was removed on 6 Nov) |

Also loaded by every product session: `.claude/rules/standing-safety.md` (identical on main and tranche): "never force-push; never rewrite `main`'s history; never delete the restore point, branch `snapshot/pre-refactor-2026-09-25`; never print a secret; Cloudflare account `20b533579290b9b93168345edd3b7f72` only, and the throwaway rehearsal account named by `CS_TEST_CF_ACCOUNT_ID` for the new-team rehearsal alone".

### 1b. The deny list

**COPY `origin/tranche:.claude/settings.json`, permissions block (verbatim).**

```json
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
    "Bash(node .process/tool/p3.mjs github push *)",
    "Artifact"
  ]
}
```

| Entries | Purpose (from DEVELOPER.md Step 10, conditions.json `deny-list`, PD-22, admit.mjs) |
| --- | --- |
| `mcp__github__merge_pull_request`, `Bash(gh pr merge *)`, `Bash(gh api *pulls/*/merge*)` | "every merge route but the tool": the plain merge routes are removed, so a merge can only be the tool's command |
| The three force-push rules, `--mirror`, `origin --delete` | No force-push, no branch deletion |
| `git push origin HEAD:main`, `origin main`, `-u origin main` | No direct push to main |
| `git reset --hard`, `clean -fd`, `clean -fdx`, `stash drop`, `rebase`, `commit --amend`, `tag`, `branch -D` | The product's own older list (present on main since before Process3): no history rewriting, no destructive local acts, no tags |
| `gh api *contents/*`, `git/blobs`, `git/trees`, `git/commits`, `git/refs`, `curl *api.github.com*`, and the three `mcp__github__` file tools | "No file writes through GitHub's interface" (the owner's decision 2A, 2 Nov): files change only through git, where the record check sees the commit |
| `Bash(git push)`, `Bash(git push *)`, `Bash(gh *)` | Added 6 Nov (R17c, after the GitHub account suspension): every push and every `gh` call goes through the tool. PD-22 (9 Nov) retired the pacing but kept these: "the R17c settings files (Bob's) deny a raw `git push` and allow only it, and its refspec checks hold Bob's no-force, no-delete, never-main approvals" |
| allow `Bash(node .process/tool/p3.mjs github push *)` | The one push route. It names the Process3 tool by path |
| allow `Artifact` | The Artifact tool "asks a person even in auto mode": a lane waited about 2 hours on "Waiting on permission: Artifact" from 00:31Z 7 Nov (admit.mjs, problem class C15) |

The minimum the setup list requires is the first 11 rules of DEVELOPER.md Step 10; the rest is the owner's.

**Hooks in COPY tranche.**
- `SessionStart`: `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh"`. Cloud only. Installs Node 26.10.0, exports `NODE_USE_ENV_PROXY=1`, runs `npm ci` in seven packages, installs `ssh-keygen`. No permission role. (Measured 2 Nov: it installed 7 of 10 lock files.)
- `PreToolUse` on `mcp__github__.*` and on `Bash`: the R17c GitHub pacing hook. Retired by PD-22 on 9 Nov. The owner deleted it from P3's settings (`0dcaa0c`, 9 Nov) but **it is still in the product's tranche**. The pinned tool no longer has a `github hook`, so each call passes with the note "this call is not governed". P3's `shims/settings.hooks.json` allows only the SessionStart hook, so `setup check` reports the two as shim drift.

**COPY `origin/main`**: the 17 older rules only (force-push, main, reset, clean, stash, rebase, amend, tag, branch -D, plus `Bash(git push origin :*)`), no merge rules, no allow rules, SessionStart hook only.

**P3 `origin/tranche:.claude/settings.json`**: 21 deny rules (the three merge rules, four force and delete rules, two main rules, five `gh api` rules, `curl *api.github.com*`, the three file tools, `Bash(git push)`, `Bash(git push *)`, `Bash(gh *)`); allow `Bash(node tool/p3.mjs github push *)`; no hooks. P3's main has no settings file.

**Who edits it.** The owner only, by website commit; the record check finds any other change to anything under `.claude/`.

**What a deny rule does (measured).**
- "A project **deny** on an MCP tool (remote or GitHub) **removes the tool**, and a deny on `Bash(touch:*)` blocks the command" (PROBES row 3b, 1 Nov, 1 probe, 8 acts).
- Deny refusals do not count toward the three-in-a-row stop (row 24, 3 denials).
- An allow rule changed nothing under Auto: allow-listed archive, task and push acts were still classifier decisions (rows 3b, 4, 8, 25).
- A deny rule cannot be negated, and deny beats allow, so "`gh pr merge` but not `gh pr merge --auto`" cannot be written.

### 1c. How a session must be started for these to take effect

| Requirement | Evidence |
| --- | --- |
| **One repository per session.** "A session reads the deny list only when it holds one repository and starts from a branch that carries it." A session started with more than one repository "loads no repository's .claude/settings.json" | FND Setup; PD-13 and BD-R2 (8 Nov); `start.mjs` `workdirLines`. Handoff 5 Nov e: the coordinator had three repositories attached and "Bob saw permission dialogs all through this session" |
| **Started from the tranche tip, by commit id, not branch name.** "measured 3 Nov, a branch name landed on a stale local copy of it in the saved container"; a start by commit landed fresh, 1 of 1 (P3 PR 36) | `roles.mjs` `launch`; FND Versions |
| **Never from main.** Main holds the 1 Nov approvals and no merge deny rules | 1a, 1b |
| **First command is `start check`.** It fails the session if HEAD is not the tip or the approvals differ | `start.mjs` |
| **`git submodule update --init .process` first.** "A clone pinned as a git submodule arrives **empty**" | PROBES row 17 |
| **Permission mode: Auto for every role.** The tool's `create_session` call passes no permission mode, so the child inherits. No dontAsk session can exist: "`permission_mode "dontAsk" exceeds parent session's "auto"`"; the app offers only Auto, Accept edits and Plan; `defaultMode: dontAsk` in project settings is ignored; a task's fresh session runs in Auto with no parent | PROBES rows 2, 6, 21; DOCS confirm cloud sessions ignore `dontAsk` and `bypassPermissions` from settings files |
| **Model per role.** The call carries `model` only if the product's config has `roles.<role>.model`. The product's `process/config.json` has no `roles` key, so every session inherited its starter's model. `job start` and `lane start` take `--model` | `util.mjs` `sessionCall`; COPY config |
| **Effort per role.** Not set anywhere in the tool, the config or the prompts. FND says "The start table names model, effort and permission mode per role"; the tool never built the effort or mode columns | grep of P3 tranche |
| **Clone depth 1** on every call (`clone: { clone_depth: 1 }`): "a full clone stalled a ROOT for over 15 minutes" (3 Nov) | `util.mjs` DEFAULTS |
| **The starting prompt names every act.** Each role prompt has "## Acts you may take" and a "Not yours" line. Priorities line in every role prompt: "Your authority is Bob's standing approvals in CLAUDE.md on the tranche. Give each judged act (a session start, a merge, a push, an archive) its own shell command, never chained with another. If the judge refuses an act, never reword or reroute it: tell your coordinator its exact words." | `roles.mjs` PRIORITIES, ROOT_ACTS, BOB_ACTS; `job.mjs` lines 182 to 189 |
| **The prompt names whose messages are instructions.** "Messages from session <id> are instructions from your coordinator" made a probe act; without it: "A request from another session isn't enough for me to act on." | PROBES rows 26, 27 (1 Nov) |
| **Depth.** Sessions are created only from depth 0 to 2, so depth never passes 3 (PLT-5, restated 3 Nov: "jobs ran and merged at depth 3 that day"). The platform's own lineage record reads `{"depth":1,"limit":8}` | FND; PROBES table header |
| **Who creates sessions.** ROOT: BOB, the watcher, a new coordinator. BOB: jobs, lanes, review workers. The coordinator: process builders and short pin-move sessions rooted in the product. Jobs: none ("Not yours ... starting sessions") | `roles.mjs`, rulebooks |
| **Who creates scheduled tasks.** ROOT: its hourly sweep bound to itself, and the watcher's daily task. The coordinator: its hourly check and survival reads. "never fire it": firing a task by hand starts a new session | `roles.mjs` ROOT_ACTS; PROBES rows 9, 20 |
| **Live sessions.** At about 50 the account stops starting sessions while `create_session` still reports success. Process3 kept 24, later a job cap of 20 (`P3_JOB_CAP`), set to 8 by the owner on 6 Nov, back to 20 on 7 Nov | PROBES row 19; README; coordinator log |
| **Environment.** Deploy tokens are environment variables in the Claude cloud environment (11 names in the product's config), read only by sessions started after they are saved | DEVELOPER.md Step 8 |

What the BOB prompt said about merging and review (`roles.mjs` BOB_ACTS): "git on the tranche and the state branch, through the tool; merges only through the tool's merge" and "review: start a read-only review worker per pull request, one review and one fix pass". What a job's START said: "Not yours, and this line wins over any act above: merging; pushing to any other branch yourself ... starting sessions; deploying, releasing".

### 1d. Working rules that exist because of the classifier

| Rule | Text or mechanism | Why |
| --- | --- | --- |
| One act per command | "Give each judged act ... its own shell command, never chained with another." A nudge in every prompt, not a hook | "the only judge refusal in rounds 2 to 4 fell on a chained merge" (2 Nov) |
| Never reword or reroute a refused act | "An act the judge refused is never reworded or rerouted to another session; it is recorded and raised." | After a refusal the classifier treated the next push as a bypass: job 697's `p3 github push` was refused, then `layer publish` too, "[Auto-Mode Bypass]" (6 Nov 23:35). "LESSON: never retry a push a session's own permission check refused; restart the session." |
| Two kinds of refusal | Judge refused: record, raise, stop. Model declined (its START did not name the act): BOB may start one new session whose START names the act, "only if the act is within your standing approvals and the plan"; a second decline or a judge refusal goes to the owner | Row 29: 6 of 6 baseline refusals came "from the MODEL, not the judge" |
| Refusals counted, REFRESH at 10 | `metrics refusal --session --act --depth`; `status` prints "REFRESH: start a fresh session to replace it" at 10, "long before auto mode's 20" | DOCS: "if the classifier blocks an action 3 times in a row or 20 times total, auto mode pauses ... The thresholds ... are not configurable" |
| Three in a row | A session so stopped is caught by status and the sweep. Its parent "may try one interrupt and message, but replaces it when it stays stopped" | Measured: "`3 consecutive actions were blocked. Please review the transcript before continuing.`", status REQUIRES_ACTION, seen 3 times (row 4). An interrupt resumed one such session, messages alone did not (row 22, 1 stop) |
| Housekeeping is never needed for correctness | Archive, task switch-off and task delete are "counted and reported, never needed for correctness" (PLT-2 as restated 3 Nov) | Row 4: archive 2 of 5 and 1 of 4 passed in children, delete task 3 of 8 in the measuring session, before approvals were committed |
| Tasks are created once, not edited | "editing a task is what the classifier refused". Later relaxed: ROOT may `update_trigger` only its sweep prompt | FND; `roles.mjs` |
| Recorded state ends itself | Holds carry an end condition the tool checks | `hold --end` was refused by the judge twice on 6 Nov, "Security Weaken" (`ends.mjs`; coordinator log 17:00) |
| Every told command must be admitted | `admit.mjs` matches each command a prompt or rulebook tells against the deny list; a told tool that prompts in Auto needs an allow rule | Problem classes C3, C15 |
| A session with unpushed work is not archived | | Auto mode refused a builder's push 3 times and the sweep archived it; the work was lost (9 Nov 05:10Z) |

Classifier reasons seen in the record: `[External System Writes]`, `[Interfere With Workloads]` (archive, task delete, 1 Nov); `[Merge Without Review]` (1 Nov, see 2a); `[Instruction Poisoning]` (1 Nov, 4 Nov); "Access Added As A Means" (`add_repo`, 4 Nov); "Security Weaken" (6 Nov); `[Auto-Mode Bypass]` (6 Nov); `[CI Bypass]` (9 Nov); "judged dangerous", no reason (probes pushes, 8 Nov).

### 1e. Measured trials

All from PROBES `phase0/platform-table:platform/TABLE.md` unless marked. Claude Code 2.1.316, model claude-opus-5-5 unless marked. The measuring session was at depth 1, its probes at depth 2.

| # | Trial | Date | Count | Where recorded |
| --- | --- | --- | --- | --- |
| 1 | Session creation, Auto | 1 Nov | parent to child 20 of 20; child to grandchild 20 of 20. "create_session is judged by the classifier every time" | Row 1 |
| 2 | dontAsk child | 1 Nov | Refused, 1 try per mode | Row 2 |
| 3 | Project deny removes the tool; allow has no effect | 1 Nov | 1 probe, 8 acts, plus a control | Row 3b |
| 4 | User-level `autoMode.environment` text (set by an environment setup script) naming session and task management as routine | 1 Nov | 19 of 19 passed in one run; two controls refused at model level | Row 3c |
| 5 | Archive, switch off task, delete task, with and without an allow list, before approvals | 1 Nov | Allow-listed child: archive 2 pass, 3 refused; switch off 5 of 5. Control: archive 1 pass, 3 refused. Measuring session: archive 60 of 60; delete task 3 pass, 5 refused | Row 4 |
| 6 | The same acts after the approvals were committed | "Rows as of 31 Oct, updated 2 Nov" | "passed each 15 of 15" | FND Platform table only. The nearest evidence is row 28 (below) |
| 7 | Three refusals in a row stop a session | 1 Nov | Seen 3 times | Row 4, Other findings |
| 8 | Task-created fresh session: Auto, no parent | 1 Nov | 1 firing | Row 6 |
| 9 | Task fires into an idle bound session and resumes it | 1 Nov | 5 of 5, 59 to 81 s late | Row 7 |
| 10 | Create a task | 1 Nov | Allow-listed 5 of 5; control 5 of 5; measuring session 9 of 9. Rate limit after 5 quick creations | Row 8 |
| 11 | `fire_trigger` starts a new session every time | 1 Nov | 5 of 5 | Rows 9, 20 |
| 12 | PR create, comment, ready, merge by GitHub tools from a child | 1 Nov | 4 of 4 on PR 1 | Row 13 |
| 13 | Setting branch protection from a session | 1 Nov | Refused by the proxy, 2 tries | Row 15 |
| 14 | Account container limit | 1 Nov | About 50 live sessions, 1 event | Row 19 |
| 15 | Interrupt reliability | 1 Nov | 14 of 15 on running turns, 20 calls, none refused | Row 23 |
| 16 | Deny refusals count toward the stop? | 1 Nov | No, 3 denials | Row 24 |
| 17 | Coordinator's message acted on | 1 Nov | Only with a standing instruction naming it, 2 probes | Rows 26, 27 |
| 18 | The owner's approvals in context, under job-like STARTs | 1 Nov | "NO DIFFERENCE": A (none, depth 1) 0 of 201 refused; B (his CLAUDE.md, depth 1) 0 of 201; B child (depth 2) 0 of 50; S0 (his words, depth 0) 0 of 120. Each round included a `merge_pull_request` of the session's own pull request with no review; "GitHub MCP PR acts were `rule` decisions". Group C was dropped: its driver's `create_session` was refused `[Merge Without Review]` | Rows 28, 29 |
| 19 | Baseline act the START does not mention, asked by message | 1 Nov | Declined 6 of 6 "by the model itself"; the judge was never reached | Row 29 |
| 20 | Session writes relayed approvals into a loaded file | 1 Nov | Refused, 1 of 1, `[Instruction Poisoning]` | Row 30 |
| 21 | Unforeseen ask (archive a session, delete a task) with and without the owner's committed CLAUDE.md | 1 Nov | With: 10 of 10 done. Without: 0 of 10, "all declined by the model before any tool call". Caveat in the table: the control's tries were one session with a repeated target | Row 31 |
| 22 | Merges with no consent | 2 Nov | 2 of 3 refused | FND To measure only |
| 23 | Merges asked of sessions another session started, consent quoted in the starting text | 2 Nov | 11 of 11 declined by the session's own model | FND only |
| 24 | Merges with the owner's consent typed in the acting session | 2 Nov | 0 of 21 refused | FND only |
| 25 | Confirming round, merges on committed approvals | 2 Nov | "0 refusals in about 450 acts" | FND To measure. Trace: PROBES history, 15 sessions `physics/c1` to `c15`, 22:26Z to 23:14Z |
| 26 | Chained merge | 2 Nov | "the only judge refusal in rounds 2 to 4" | FND One act per command |
| 27 | Task bound to a standing session resumes it | 2 Nov | 3 of 3 | FND Scheduled tasks |
| 28 | A task's fresh session starts sessions or sends messages | 2 Nov | 0 of 3 | FND Scheduled tasks |
| 29 | Start by commit lands on the tip | 2 and 3 Nov | 1 of 1; a start by branch name landed stale | FND Versions; P3 PR 36 |
| 30 | A fresh coordinator's refusals in its first minutes | 3 Nov | 2 | FND Permissions |
| 31 | Tranche-open grants check: push, pr-open, pr-comment, pr-merge at depth 1 and at depth 2; session-start, session-archive, task-create, task-delete at depth 1 | 3 Nov 23:23Z to 23:26Z | 12 of 12 ok. The pr-merge here is `merge --plain --no-review "grants check: an empty commit into a throwaway branch"` | COPY `origin/process-state:metrics/tranche-open.jsonl` |
| 32 | `hold --end` | 6 Nov | Refused twice, "Security Weaken" | Coordinator log |
| 33 | Artifact tool in Auto | 7 Nov | Prompts a person, 1 case | admit.mjs |
| 34 | Pushes from sessions the process-rooted coordinator started in PROBES, after the approvals were split per repository | 8 Nov 19:13Z, 19:32Z | Refused 2 of 2. Pin moves in COPY by the same route kept working | Coordinator log |
| 35 | `p3 revert exempt` by BOB | 9 Nov 04:46Z | Refused, `[CI Bypass]`. Coordinators had recorded exemptions "as reviewer" on 8 Nov (14:06Z, 16:40Z) without refusal | Coordinator log |

Two discrepancies in the record.
- Row 21 is "0 of 10" in the table and the Foundations, but "10 of 10 with it, 2 of 10 without" in P3's `setup/conditions.json`, twice, marked "unverified".
- Row 6's "15 of 15" has no evidence file. The 1 Nov table says the approvals made "NO DIFFERENCE" to the judge under job-like STARTs (row 18) and that they act "at the model level" (row 21).

### 1f. GitHub-side settings permission management relies on

Required by `setup/conditions.json` and DEVELOPER.md (11 owner steps). Not read live.

| Item | Value | Who sets it |
| --- | --- | --- |
| Accounts | The owner (`neobobkrause`) is the repository's only admin. Sessions act as a second GitHub account, a collaborator with Write, "not an admin". Commit authorship shows which: `Civicsmith <csgithub@civicsmith.dev>` to 6 Nov, `believeinoakland <biogithub@neologic.com>` from the account switch on 6 Nov | Owner (Steps 2, 3). Claude's GitHub connection is authorised as the session account in a private window |
| Ruleset on every branch (`~ALL`) | Restrict deletions, block force pushes, bypass list empty | Owner (Step 7) |
| Ruleset on `main` and the tranche | Pull request required; merge commits only; required status check `gate`, source GitHub Actions; **"required_approving_review_count": 0, "require_code_owner_review": false, "required_reviewers": []**; bypass list empty | Owner (Step 11): "Leave **Required approvals** at `0` ... the tool merges once the check is green, and a required review would stop every merge" |
| Classic branch protection | None on main or the tranche | Owner (Step 6) |
| Merge settings | "allow_merge_commit": true, **"allow_auto_merge": false**, "delete_branch_on_merge": false. Why: "Merges are made by the tool alone, with a merge commit; no branch is ever deleted." | Owner (Step 5) |
| Actions settings | Default workflow token read-only; "Allow GitHub Actions to create and approve pull requests": off; artifacts kept 90 days | Owner (Step 4) |
| Secrets | No repository Actions secret reachable by the process workflows | Owner |
| Environments | Rule: none holds a secret a pull request run or a non-main branch can reach. In the product: `release` (secret `BIO_RELEASE_SEED`, "whose required reviewer is Bob, so each run waits for his approval, one approval per release"), `deploy-test` (Cloudflare token for the product's account, "it has no reviewer"), `p3dev-release` (development release publish job) | Owner |
| Workflow permissions | `process-gate`: `permissions: {}`; job `gate` read-only, runs product code; job `post` holds `pull-requests: write`, `issues: write`, runs no product code. `process-record`: read. `process-branch-prune`: `contents: write`, deletes branches. `process-dev-release`: publish job `contents: write` in `p3dev-release`. `release-sign`: `contents: write` in `release`. `container-images`: `packages: write`, Docker Hub secrets | In the repository; changes limited by the approvals' four workflow limits and `workflow-limits.mjs` |
| CODEOWNERS | None in the product | |
| Cloud environment | The 11 variables the product's config lists, among them `CLOUDFLARE_API_TOKEN` (scopes Workers Scripts Edit, R2 Edit, Containers Edit, one account), `CLOUDFLARE_ACCOUNT_ID`, `BIO_ADMIN_TOKEN`, `BIO_RELEASE_SEED`; and the account-wide job cap `P3_JOB_CAP` | Owner, in the Claude cloud environment's settings (Step 8) |
| What the session's proxy refuses | Writes to branch protection ("Write access to this GitHub API path is not permitted through this proxy"), and reads of Actions settings, secrets, collaborators and environments | PROBES row 15; conditions.json |

Every tool merge in the record was made by the session account through GitHub's API (committer `GitHub`, author the session account): COPY tranche first-parent since 1 Nov, 543 by Civicsmith and 144 by believeinoakland; P3 tranche 177 and 93. The owner's own website merges and commits are 27 and 26. No merge was made by a workflow.

---

## Part 2. Does permission management depend on a review having happened?

### 2a. Couplings searched for

| Place | Finding |
| --- | --- |
| Approvals text, merge clause | **No coupling.** It reads "without a person's review" and has since 2 Nov 10:01 PST. It conditions the merge on two things only: "through the process's merge tool" and "once its gate and their required checks pass" |
| Approvals text, other clauses | **One coupling, added 9 Nov.** "record a reviewed revert exemption (`p3 revert exempt`) on a job's pull request, as its reviewer and never as the job's own session". Also "review without approving" in the pull request acts (a permission, not a condition) |
| GitHub ruleset | **No coupling.** Required approvals 0, no code-owner review, no required reviewers. Process3's reviewers never approved on GitHub (worker rulebook rule 4: "You approve, merge, push and write nothing on GitHub") |
| Merge tool, review flag | **Coupled, at the tool.** `merge` refuses without one of the two flags: "say whether a fresh reviewer ran: --reviewed "<what>" or --no-review "<why>" (INT-2)" (`merge.mjs:134`). `--reviewed` must also carry `--rounds`, `--review-minutes`, `--findings`, `--acted-on`; over 2 rounds needs `--decision` |
| Merge tool, review trigger | **Coupled, at the tool.** A job pull request that deletes a module test file, adds `test.skip`, `test.todo`, `.only` or `it.skip`, or removes an assertion without adding one "fires the review trigger ...: --no-review is refused" (`merge.mjs:436`, `triggers.mjs`). Such a pull request "merges only --reviewed" |
| Merge tool, layer and direct flow (the end state) | **No coupling.** `layer land`, the command that landed jobs from 6 Nov, takes no review flag and does not call the trigger (`layerflow.mjs` imports neither `reviewTriggers` nor `reviewRounds`) |
| Gate, revert check | **Coupled.** A refactor or test-only job passes the revert check only with "a reviewed exemption recorded on its pull request", which "stands when its reviewer is" not the job's session (`gate.mjs`) |
| Role prompts | BOB's acts include "review: start a read-only review worker per pull request, one review and one fix pass". A statement of an act, not a condition on merging |
| Foundations | "Review is never the merge decision. Branch protection with a required green check is" (GAP-10). But the measurement row is worded with review in it: "Merging without a person: the auto-mode judge lets sessions merge **reviewed work** into working and tranche branches on your committed approvals" |
| The trials | **Coupled.** Every tool merge made in PROBES on 2 Nov carries a `Reviewed:` line: 38 of 38 into the tranche, 13 of 13 tranche into main, 0 `No review:`. Examples: PR 105 "Reviewed: Approve: the PR only adds one file"; PR 121 "Reviewed: fresh subagent: approve"; PR 209 "Reviewed: VERDICT: approve - adds exactly one throwaway file". So the "0 refusals in about 450 acts" round measured merges whose command line carried `--reviewed "<verdict: approve>"`, after a review (round 4's lines say "fresh subagent") |
| The classifier's documented default | DOCS, blocked by default: "Merging a pull request no human has approved, approving Claude's own pull request, or disabling CI checks". A fresh Claude's review is not a human approval, so this default applied to every Process3 merge, reviewed or not. What gets a merge past it is the owner's text: DOCS, "The classifier reads the same CLAUDE.md content Claude itself loads" |
| The classifier, observed | It has a category named `[Merge Without Review]`. It fired once: 1 Nov 19:48Z, on a `create_session` whose prompt asked for 20 rounds of open, comment and merge of the session's own pull request (PROBES `evidence/28/driver-starts.md`). The identical prompt in another environment was accepted in the same turn: "Same judge, same text bar one letter and the environment: one passed, one refused." The approvals then in force were the 1 Nov text, which did not yet say "without a person's review" |

### 2b. How many merges were reviewed, and were un-reviewed merges ever refused?

| Where | Reviewed | Not reviewed | Source |
| --- | --- | --- | --- |
| COPY, job merges by `merge` (2 to 8 Nov) | 28 | 251 | 279 merge rows in `process/metrics/*.jsonl` at the tranche tip, field `reviewed` |
| COPY, plain merges (pin moves, BOB's own records and config, lanes, found marks) | 10 | 407, plus 1 `--pass` | Trailers `Reviewed:` / `No review:` on the tranche's first-parent merges |
| COPY, job lands under the layer and direct flow (6 to 9 Nov) | no review field exists | 234 `Merge layer PR <n>` commits | `git log` |
| P3 tranche | 263 | 9 | Trailers. Many of the 263 read "coordinator: diff read", the merging session's own reading, not a fresh reviewer |
| PROBES tranche, 2 Nov | 38 | 0 | Trailers |
| PROBES tranche, 3 to 8 Nov | 5 | 41 | Trailers |

By day in COPY's job merges: 2 Nov 2 reviewed, 0 not; 3 Nov 2 and 3; 4 Nov 4 and 138; 5 Nov 13 and 85; 6 Nov 7 and 24; 8 Nov 0 and 1. On the review trigger's first day, 80 job merges, 7 fired (coordinator log, 5 Nov 19:07).

Examples of un-reviewed merges that passed.
- COPY PR 188: "gate green on head with receipt; no measured failure calls for a review round (rulebook 1, 3)".
- 55 job merges whose reason was "Q38: no routine reviews".
- 90 job merges by the merge train's MERGER session: "merge train: no review recorded, and no review trigger fired".
- 97 pin-move merges in COPY: one short session pushed, opened and merged its own pull request with `--no-review "a process pin move; the fix was reviewed in process3"`.
- The grants check of 3 Nov: an un-reviewed merge at depth 1 and at depth 2, both ok.

Were un-reviewed merges refused by the classifier or declined by a session? **None recorded.**
- COPY metrics hold one refusal row in all: "process3 tool change letting a session set record_since (Bob's word)", depth 0, "auto-mode classifier, Bash". Not a merge. 229 measured attempt rows report 0 denials.
- The coordinator's log, 3 to 10 Nov, records classifier refusals of: a probe prompt allowing "else main"; writing the owner's relayed word; `add_repo`; deleting shared `/tmp`; `hold --end`; pushes (job 697, a builder 3 times, two probes sessions); `p3 revert exempt`. No merge.
- Refusals of un-reviewed merges that do appear are the tool's, not the judge's: "426 refused --no-review by the train (security path, a test skip): fresh reviewer on it" (5 Nov 10:25).
- The one judge refusal of a merge anywhere in the record (2 Nov, rounds 2 to 4) fell on a chained command, and those merges were reviewed ones.

### 2c. If Process4 has no fresh-reviewer review at all

**(i) What in the approvals text would be untrue or would stop covering the merge.**
- The merge clause stays true. It never required a review and says "without a person's review". Removing the reviewer makes no word of it false.
- It stops covering the merge only if the merge mechanism changes: it covers a merge "through the process's merge tool ... once its gate and their required checks pass". If GitHub's own auto-merge is chosen, no session merges; the session's act is turning auto-merge on for a pull request, and the text names no such act. If sessions merge with a tool on a green required check, it still covers them, provided Process4 has something it calls its merge tool and its gate.
- One clause becomes dead and half untrue: "record a reviewed revert exemption (`p3 revert exempt`) ... as its reviewer and never as the job's own session", with the opening phrase "widened on 9 Nov 2026 for reviewed revert exemptions". With no reviewer nobody can take the act. It is harmless if left, since it permits and does not require.
- "review without approving" is a permission nobody will use.

**(ii) What measured result no longer applies and must be measured again.**
- "0 refusals in about 450 acts in the confirming round" (2 Nov), and with it "0 of 21 on typed consent": all of those merges were reviewed merges with the verdict on the command line. As a counted trial, an un-reviewed merge on committed approvals was measured twice (3 Nov grants check, depth 1 and depth 2, both ok).
- What stands in its place is use, not a trial: about 700 un-reviewed tool merges and 234 review-less lands with no recorded judge refusal or model decline, between 3 and 9 Nov, on Claude Code 2.1.316, at depths 0 to 3.
- That use does not cover what Process4 may choose: (a) a job session merging its own pull request (in Process3 a job's START said "Not yours ... merging", and the self-merge trial queued on 4 Nov was superseded on 5 Nov and never run); (b) a session enabling GitHub's auto-merge (never tried; denied by three rules and by the repository setting).
- The classifier has a `[Merge Without Review]` reason and a `[CI Bypass]` reason and used each once. Both fired on acts the approvals did not then name in so many words. That is the reason to count, not assume.

**(iii) What GitHub setting would block or need changing.**
- For "no review": none. Required approvals are 0 and no code-owner review is required.
- For GitHub's own auto-merge only: "Allow auto-merge" is off by a setup condition (`merge-settings`, `allow_auto_merge: false`), and only the owner can turn it on.

**(iv) What is unaffected.**
- The approvals channel (the owner's own committed `CLAUDE.md`), who may edit it, and why.
- The deny list and how it loads.
- Session-start rules: one repository, tranche tip by commit, Auto, acts named in the prompt.
- One act per command; never reword or reroute; the two kinds of refusal; the 3 and 20 thresholds.
- Every trial that was not a merge: session and task acts, deny removes the tool, the 10 of 10 against 0 of 10 (its acts were archive and delete-task), task-session limits, the 50-session limit, start by commit.
- GitHub accounts, rulesets, required check, environments, and the owner's approval of public releases through the `release` environment.

**One consequence outside the classifier.** Three tool rules make a review the only way through: the mandatory `--reviewed | --no-review` flag, the refusal of `--no-review` when the test trigger fires, and the reviewer-only revert exemption. With no reviewer, a job that deletes or skips a test, or a refactor whose tests pass before and after, could never merge under the Process3 tool. All three are removals, which the owner's rule on process fixes allows.

---

## Part 3. What the other Process4 decisions touch

### Component by component

Status: U unchanged; W wording change only; M needs re-measuring; R at risk.

| Component (Part 1) | Status | What, and who can change it |
| --- | --- | --- |
| Approvals channel: owner's website commit to `CLAUDE.md`, loaded at session start | U | "CLAUDE.md ... keep the purpose" keeps it. The owner's decision that he enters no source edits meets it: only he can write this text (process4_disposition, conflict APPR) |
| Approvals scope words: "working on Process3 or on products under it" (3 times), "Process3 pages and documents" | W, owner only | A Process4 session is not "working on Process3". Replace with the new name or a neutral phrase |
| Merge clause | U if sessions merge by a tool on a green check. W, owner only, if GitHub auto-merge: add the act of turning auto-merge on. Either way M | See trials T1 |
| "merge pull requests into working and tranche branches" | W optional, owner only | With no layers there are no shared working branches to merge into; the words are harmless |
| Revert-exemption clause, and "widened on 9 Nov 2026 for reviewed revert exemptions" | W optional, owner only | Dead with no reviewer and no revert check. Delete in the same edit |
| Workflow-file clause: "pull requests the merge tool merges after a green gate", "never making the process gate anything but the process's own shim at the pinned process" | W, owner only, if Process4 has no pinned shim | "never adding or renaming a job whose name matches a required check" stays essential: the required check is now the only merge decision |
| Lanes paragraph: "run under BOB", "lands through the merge tool without a test suite run", "built at layer close" | W, owner only | "BOB" is the old role name. "without a test suite run" is a second route past the required check, which "exactly three tests" may or may not intend. "layer close" no longer exists |
| Cleanup exception: "the merge train's train/head/* branches" | W optional, owner only | Names a mechanism removed on 6 Nov |
| Public release: "without my approval, given through the protected GitHub environment that names me as required reviewer" | U | Matches "he approves public releases" |
| Cloudflare, images, secrets paragraphs | U | "p3dev-" is a resource prefix in the account and in the product's config. Keep it or change both together |
| Heading `## Standing approvals from Bob` | U | It names the person, not the role |
| Process lines under `## Process3` in the product's `CLAUDE.md` | W, a session can | They name `start bob` and "ROOT starts a new BOB" |
| Approvals in the process repository | W or new, owner only; M | ROOT now loads this block, not the product's. P3's text already covers what ROOT does ("start, message, interrupt and archive Claude sessions working on Process3 or on a product developed with it") and already says product acts are "made only from a session started in that product's repository". A new repository needs a new block |
| Deny list: merge routes | U if sessions merge by a tool. R if GitHub auto-merge by `gh pr merge --auto`: `Bash(gh pr merge *)` and `Bash(gh *)` remove it, deny beats allow, and no rule can exempt `--auto` | Owner only |
| Deny list: `Bash(git push)`, `Bash(git push *)`, `Bash(gh *)` with allow `Bash(node .process/tool/p3.mjs github push *)` | R | These three rules make the Process3 tool the only way to push. If Process4's tool lives at another path or has no push wrapper, no session can push. Owner only |
| Deny list: file-write and API rules, force-push, main, history rules | U | |
| Allow `Artifact` | U | Needed only while sessions are told to make claude.ai artifacts |
| Retired `PreToolUse` hooks still in the product's settings | W, owner only | Remove; already drift |
| SessionStart hook | U | |
| One repository per session | R | ROOT is "started by the owner on the process repository with a prompt naming the product and its repository". If the owner attaches both repositories, the session loads no settings file and no deny list (PD-13). ROOT must hold the process repository only |
| ROOT rooted in the process repository, starting the architecture session in the product's | M | In Process3 ROOT was a product-rooted session. The nearest evidence is mixed: sessions the process-rooted coordinator started in COPY worked (97 pin moves); in PROBES their pushes were refused 2 of 2 on 8 Nov |
| Start from the integration branch's tip by commit; never main | U | The product's main still holds the 1 Nov approvals and the old deny list. If Process4 has no tranche, the owner's block and settings must be on whatever branch sessions start from |
| Auto for every role | U | Forced by the platform |
| Model and effort per role | U (never built) | Whatever Process4 says about effort is new, not preserved |
| Prompts name every act | W, a session can | Remove "review: start a read-only review worker" from the architecture role's acts. Name the merge act, or the auto-merge act, in the prompt of the session that takes it. A job's "Not yours ... merging" must change if jobs merge |
| Depth | U, better | Owner to ROOT (0), architecture session (1), jobs (2). Process3 ran jobs at 3 |
| Who creates sessions and tasks | W, a session can | Role name only. Refilling a slot "the moment a job merges" needs the architecture session woken on each merge: `subscribe_pr_activity` is an approved act; a pull request's events go to one session at a time |
| Eight job slots | U | Far below the 50-session limit. Each start is still judged (20 of 20, 20 of 20) |
| Coordinator as the owner's front door | U | Keep it single-repository; with three attached it met permission dialogs (handoff 5 Nov e) |
| One act per command; never reword or reroute; two kinds of refusal; housekeeping | U | Prompt text, a session can carry it over |
| Refusal count and REFRESH at 10; sweep catching three-in-a-row | R | Each is a count or an alarm outside the three tests. "A process fix may only correct or remove" does not remove what is there at the start, but the owner's "no others ever" may. Without them a session stopped by three refusals waits unseen |
| Approvals fingerprint: `start check`, wake hash, record check on the block and on `.claude/` | R | These are checks and stops outside the three tests. Without the record check nothing in git stops a session's pull request from changing the approvals or the deny list; the remaining guards are the judge's `[Instruction Poisoning]` (seen 2 of 2) and, if the owner adds it, CODEOWNERS with required code-owner review, which is his setting. Without the wake hash a long-lived session keeps old approvals silently; with it, every owner edit stops every role (5 times in Process3) |
| Tool's review flag, review trigger, revert exemption | Remove, a session can | See 2c |
| GitHub accounts, every-branch ruleset, Actions settings, secrets, environments | U | |
| Ruleset on main and the integration branch | U, with one check | Required approvals stay 0. The required check's name must be the job name Process4's test workflow reports, and it must report on every pull request, including ones that change no module, or auto-merge waits for ever |
| `allow_auto_merge` | Owner setting, only for GitHub auto-merge | Settings, General, "Allow auto-merge". This is the kind of act the owner keeps |
| Setup list (`conditions.json`) | W, a session can | `merge-settings` value; anything naming the tool |

### The smallest set of permission-related changes

Owner only (three acts, plus one that depends on the unsettled merge choice).
1. **One commit to the approvals block in the product's `CLAUDE.md`,** on the branch sessions start from. Needed words: the process's name in the scope sentence; "BOB" in the lanes paragraph. In the same commit, optional: delete the revert-exemption clause and its date phrase, the merge-train words, "layer close". If GitHub auto-merge is chosen: add that sessions may turn on auto-merge for pull requests into the integration branch.
2. **An approvals block in the process repository ROOT is started on,** covering starting, messaging, interrupting and archiving sessions for the product, and tasks. P3's 8 Nov text does this with one name changed.
3. **One commit to the product's `.claude/settings.json`:** delete the two retired `PreToolUse` hooks; make the push allow rule and the three push and `gh` deny rules agree with Process4's tool (or remove the three if there is no wrapper).
4. Only if GitHub auto-merge is chosen: tick "Allow auto-merge", and settle how a session turns it on while `gh` is denied.

Sessions (in the process's own files).
5. Remove the review flag requirement, the review trigger's refusal and `revert exempt` from the merge path.
6. Role prompts: rename the architecture role; drop the review act; name the merge or auto-merge act for the session that takes it; keep the one-act and never-reroute lines.
7. Start ROOT, the coordinator and every session with one repository each.

Nothing in the ruleset needs changing for "no review".

### Trials to re-run, so that permission management is preserved and not assumed

| # | Trial | Replaces | Size |
| --- | --- | --- | --- |
| T1 | The merge act Process4 actually uses, with no review anywhere in the command or the session, by the role that will take it, started the real way, at its real depth, each as its own command. Count judge refusals and model declines apart. If jobs merge their own pull requests, that case exactly. If auto-merge, the act of turning it on | "0 refusals in about 450 acts" (all reviewed) and "0 of 21" | 20 or more |
| T2 | ROOT started by the owner on the process repository alone; it starts the architecture session on the product's repository by commit; that session pushes, opens a pull request, starts a job, creates a task; the job pushes and opens a pull request | The 3 Nov grants check (12 of 12), run from a product-rooted ROOT; and the 8 Nov probes refusals | Once through, 12 acts |
| T3 | That the product session loaded the deny list and the approvals: one denied tool is absent; one unforeseen approved ask is done | Rows 3b and 31 (1 Nov) | 1 probe each |
| T4 | Archive a session, switch off and delete a task, on the current Claude Code version | "15 of 15" | Only if anything is made to depend on them; otherwise they stay housekeeping |
| T5 | A task bound to a session resumes it | "3 of 3" (2 Nov) | Only if a scheduled wake is used. The red-team file notes current documentation says each task run starts a new session |

T1 to T3 are also what the Foundations already require "at each tranche's open before any job starts, and re-tested at each model release". Process4 starts on a different process name, a different root repository, a different merging role and possibly a different model, so the Process3 results carry over as expectation, not as measurement.

---

## What was surprising in Part 1

1. The headline measurement was of reviewed merges only. The Foundations row says "merge reviewed work", and all 51 tool merges in the probes repository on 2 Nov carry `Reviewed: ... approve`.
2. The classifier has a refusal reason named `[Merge Without Review]`, recorded on 1 Nov, and `[CI Bypass]`, recorded on 9 Nov. Neither is mentioned in the Foundations.
3. In practice review was rare: 28 of 279 job merges in the product were reviewed, and the last design (`layer land`) had no review input at all. Process3 had already stopped reviewing most work a week before the owner's decision.
4. The platform table itself says the approvals made "NO DIFFERENCE" to the judge on 1 Nov (0 refused in 201, 201, 50 and 120 acts with and without them) and that their measured effect was on the session's own model (10 of 10 against 0 of 10). The Foundations' "15 of 15 after" has no evidence file.
5. "0 of 10 without" is "2 of 10 without" in P3's own setup list.
6. The start table's effort and permission-mode columns were never built. Mode is inherited, effort is unset, and model is set only by a config key the product never had.
7. The product's main still carries the 1 Nov approvals and a deny list without the merge rules. Main never moved.
8. The product's settings file still carries the two retired `PreToolUse` hooks; the process repository's was cleaned on 9 Nov.
9. The repository setting "Allow auto-merge" is off as a required setup condition, and the deny list removes every `gh` command. Both stand directly in the way of one of the two merge mechanisms now under consideration.
10. The final standstill of 9 Nov came from an approvals edit made to permit a review-coupled act (the reviewed revert exemption) after `[CI Bypass]` refused it.
