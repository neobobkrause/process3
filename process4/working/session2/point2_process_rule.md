# Point 2 in detail: the rule that only PROCESS changes the process is held by words only

14 Nov 2026, second main session. Reading-and-reporting worker. Nothing was changed, committed, pushed or started. This file is the only thing written.

## For the owner, in plain words

Your rule: the process is changed only in the PROCESS lane, with you choosing, and a product moves to a changed process only with your prior approval. Today only words hold it.

**Proven today, from GitHub and the repositories.**

- In the process's repository, your standing approvals (the text in your name saying what sessions may do without asking) still say sessions may "merge pull requests into working and tranche branches once their required checks pass, without a person's review, and merge the tranche's pull request into main once its required checks pass". They forbid changing settings, not changing the process.
- GitHub's own rules there ask for nobody's approval: a change merges once two automatic checks pass. The sessions' GitHub account can write there. On 9 Nov it merged the last change to the process, with no person's review.
- A deny list (a settings file that takes commands away from a session) exists only on Process3's branch, where it sends merges through Process3's tool without stopping them. The Process4 branch has none.
- In Process3, sessions made 270 of the 296 changes to the process.

**Not proven.** No physical way of holding your rule has been tried on your repositories. The options below rest on GitHub's documentation.

**The history.** On 13 Nov Claude proposed that the process change only by your own merge, then withdrew it: it made work wait for you, against what the session had recorded as your requirement that your only acts are occasional settings changes. On 14 Nov the second draft proposed it again without saying so, called its cost "one click", and said silent growth became "impossible". That was withdrawn too. A narrower question followed; your reply was the PROCESS paragraph. Nothing has been put to you since.

**Yours to decide:** whether anything physical stands behind your rule, and which.

1. Words only, as now. No act of yours; the risk stays.
2. Your approvals in the process's repository say a change is merged only on your word at PROCESS. One commit by you. Still words.
3. A GitHub rule so that only your account can update the branch of the process that products use. One setting, once. Then, for each change you approve, you press merge on GitHub's website, and perhaps a second act moves the product. Nothing merges while you are away.
4. The sessions' account loses write access to the process's repository. Same acts as 3, and PROCESS could no longer save its proposals there.

Only you can set 3 or 4: your approvals forbid sessions to change settings, and GitHub refuses them. Your PROCESS paragraph says you choose and approve, not that you merge. Whether pressing merge counts as a gate is yours to say.

None stops growth elsewhere: tests and walk steps in the product, or what one session tells another.

**Technical, for Claude to settle and report:** how such a rule is built and tried; which branch PROCESS uses; how a product names its process version.

---

## 0. Marks and method

- **(V)** verified by me in this session against a primary source; the command or file:line is given.
- **(A)** an earlier auditor's or worker's report says so; I did not re-check; file:line is given.
- **(J)** a judgement, mine unless another author is named.

Whose words: `owner_words/` and the process repository's `CLAUDE.md` are Bob's typed or committed words. `evidence/foundations.md` and `evidence/ledger_lines.md` are his documents. `evidence/DECISIONS.md` and the "record of 13-14 Nov" (fifth draft, section B, lines 1 to 24) are sessions' records of him. `working/assessment_doc.txt` is an export of his live assessment page; its text was written by a session.

Paths below are under `/home/user/process3/process4/` unless they begin with `/`.

New in this session: GitHub's API answered read requests for the process repository (`gh api`, authenticated as the sessions' account `believeinoakland`). Earlier workers reported it closed. So the process repository's rulesets were read live today. The product repository's API was not enabled for this session (HTTP 403, "GitHub access to this repository is not enabled for this session"); I did not ask for access.

---

## 1. Every finding in the second audit that bears on this point

### 1.1 The drift audit (`working/audit2_corruption.md`)

| Where | What it says | Mark |
| --- | --- | --- |
| :34 | Verdict: "the rule he calls the hardest open problem is still held by text, although the only reason given for not holding it by a setting was removed by his own words of 14 Nov. The process's own repository today carries standing approvals in his name that allow a session to merge a process change with no word from him." | A; the second sentence V (section 2 below) |
| :79-112 | Finding 2 in full. Counter-argument :81. Sentences of the draft concerned :84-89. | A |
| :94 | "branch `process4` ... its `CLAUDE.md` is his standing approvals of 1 and 2 Nov ... It has no settings file, so no deny list. The newest approvals in that repository (its tranche branch, restated 8 Nov) say the same through the merge tool". | V, and incomplete: the tranche branch does carry a deny list (2b below) |
| :95 | In the product the process version is an entry sessions move by pull request (`.process`, at `38b0f3f`); four of eight workflow files are copies of the process's; moved 116 times in nine days, all by sessions. | Pin and commit V; "116" A (`evidence/product_side.md`:82) |
| :96 | "Sessions made 270 of 296 process changes; checks were added in 41% of merges before and after he told them to stop". | 270 of 296 V; 41% A (`evidence/change_sample.md`:9, :14) |
| :97 | The third draft put a setting to him; the fuller form "was the centre of the proposal withdrawn on 13 Nov"; the fourth draft's notes record the withdrawal as "Not mentioned in the draft". | V (section 3 below) |
| :98 | If the sessions' account is not a collaborator, GitHub refuses every write; a branch can be made updatable only by him. "Neither was ever measured here." | A |
| :99 | "No case was found of the permission checker enforcing a 'never' that had no deny rule or GitHub rule behind it"; the rule against adding checks "was never in Bob's committed text in Process3". | A (`working/enforcement_levers.md`:141-145) |
| :100 | A product session can start a session on any repository, so holding one repository does not keep its hands off the process. | J (auditor) |
| :101 | "'Nothing else counts as approval' is recorded by the session whose change is being approved. No one can compare the record with what he typed." | J (auditor) |
| :103 | How bad: "repeats Process3, on the measured rate. Also misleads Bob". | J (auditor) |
| :105 | Status: raised before and still open (register 2, 5, 13, 17). "his answer was the PROCESS paragraph, which sets the rule and is silent on what holds it." | V for the silence (`owner_words/bob_words_14nov_b.md`:25) |
| :108-110 | Best answer: wording he commits in the process repository's approvals; a branch only he can update, "his merge of the change on GitHub's website is the approval ... This costs one act per approved change, which he now makes anyway by typing his approval"; neither stops growth outside the process's repository. | J (auditor). The cost sentence is short of what the evidence says (section 3.4) |
| :112 | Whose: "Bob's. It adds a kind of act (a merge on GitHub's website) to his list, and that is not technical. Building it needs a trial: none of it is measured." | J (auditor) |
| :163-196 | Finding 4: what product sessions do while a process fault waits for him; "works round" is the draft's wording, not his (:178). | A |
| :305-340 | Finding 8: PROCESS can grow the process through the options it writes; his approval is recorded by the session that wants it. Best answer :336: "his own merge is the approval, so no session records it for him." | J (auditor) |
| :430-444 | Finding 12: the guard on his approvals was ended, the start-up comparison kept; the approvals stand behind the permission checker alone, measured 2 of 2. | A |
| :448-506 | Appendix A, 51 rules. Rows on this point: 5 (:458), 32 (:485), 35 (:488), 36 (:489), 38 (:491), 40 (:493), 47 (:500). Summary :506: "Of 51, something physical stands behind six in whole or part (5, 8, 12, 30, 40, 45)... The first round counted 36 text rules in the second draft with three held." | A |
| :523 | Appendix B row 10: "A comparison that would have shown whether the process stayed as approved was taken out of the draft as a check". | V (`working/v5_notes.md`:15) |
| :525 | "The real change since then ... is that the sessions building the product are no longer the ones who may change the process, if finding 2 is dealt with." | J (auditor) |
| :542-543 | Appendix C: the process's repository "today holds Process3's whole tool, guide and decision record on other branches, and his Process3 approvals"; "His approval is recorded by PROCESS: Bob's". | First part V |
| :584-585 | Not established by that audit: live GitHub settings; whether a session started from `process4` would in fact merge a change there. | The first is now read (2e) |
| :602 | Map: PROCESS and process change "Thin". | A |

### 1.2 The run audit (`working/audit2_feasibility.md`)

| Where | What it says | Mark |
| --- | --- | --- |
| :135-149 | Finding 9: after "ROOT starts PROCESS" the draft runs out: the branch PROCESS starts on, the approvals it loads, who tells Bob, who merges its change, who replaces it, and who moves the product. | A |
| :142 | "the branch `process4` is cut from main. It carries the approvals of 1 and 2 Nov ... and it has no `.claude/settings.json` at all, so no deny list. The repository's default branch is main." | V |
| :143 | A new session inherits the caller's cloud environment, so PROCESS would hold the product's deploy tokens. | A (platform text) |
| :148 | Best answer: name the branch, "that Bob's approvals and a deny list are committed there", "that PROCESS merges its own change with the tool once the tool's tests pass". | J (auditor). Note: this has a session merge the process change; the drift audit's answer has Bob merge it. The two audits differ |
| :149 | Whose: Claude's, "except who may carry out the move", which is Bob's to confirm. | J (auditor) |
| :53-66 | Finding 3: how the tool and role texts reach a one-repository session decides "what 'one fixed version for each tranche' is physically; who can move it". :60 the version sits in a file any session can change. :61 the fifth draft contains none of "pin", "pinned", "submodule". | A |
| :47 | Three files only Bob may commit or that the old check guards: his approvals, the deny list, the process version. | A |
| :286 | The acts table sends the reader to section I for committing approvals "in the process's" repository; section I says nothing about that repository. | V (`definition/process4_definition_v5.md`:124, :277-299) |
| :301, :343, :357-359 | Walk-through and lists: the process repository's branch and approvals are unspecified; "the branch PROCESS starts on" is one of five decisions needed before any trial. | A |
| :384 | Map: "Thin". | A |

### 1.3 The requirements audit (`working/audit2_requirements.md`)

| Where | What it says | Mark |
| --- | --- | --- |
| :120-128 | Finding 8: with the guard gone only the permission checker protects his approvals, against his kept Ledger line. :127 a GitHub rule on the two files "is a permission he sets once, not a check by a session"; whether GitHub can do it "is not known to this audit". | A |
| :130-138 | Finding 9: three kept lines and parts of others assume sessions repair and release the process themselves; unstated and not ended. | A |
| :235 | Addition 9: the record at PROCESS of his approving words is Claude's addition. | A |
| :249, :251, :252 | Conflicts 1, 3, 4: his PROCESS paragraph against older lines (the architecture session corrects the process; "a recorded act moves the version"; "the work never stops for the owner"). | A |
| :262 | Conflict 14: his "agreed" to committing approvals and deny list himself, against lines that he "does not edit files or enter commands". | A |
| :322 | Map: PROCESS and process change "Contradictory". | A |

### 1.4 The combined audit (`definition/process4_audit2.md`) and its map (`working/audit2_notes.md`)

| Where | What it says |
| --- | --- |
| audit2 :20 | Section 1 item 2: "still held by words alone. The process's own repository today carries approvals in your name that let a session merge a change there without you (measured)." Source: C2 (notes :15). |
| audit2 :25 | Section 1 item 7: "The drift audit lists 51 rules in the draft and finds something physical behind six." Source: C appendix A (notes :20). |
| audit2 :40 | Map row PROCESS: run "thin", drift "thin", requirements "contradictory"; "Nothing physical holds it; the steps after 'ROOT starts PROCESS' are unwritten." (notes :33) |
| audit2 :69-75 | Question 3. Options (a) words only, (b) a branch only he can update, his merge is the approval, "One act of yours for each approved change. Never measured; needs a trial", (c) new approvals committed there. Also: who moves a product. Sources C2, C8, F9, register 2, 5, 13, 17 (notes :50). |
| audit2 :77-83 | Question 4: what a product session does while a process fault waits. Sources C4, C9 row f (notes :51). |
| audit2 :124-130 | Question 9: what protects his approvals; the stop at each edit. Sources C12, R8, F11 (notes :56). |
| audit2 :207 | Section 4: "PROCESS after it starts: its branch, and your approvals and a deny list there ...; who tells you it is waiting; who merges its change; how it is replaced". |
| audit2 :237 | Section 5 trial 4: "Whether a GitHub setting can make a branch of the process's repository, or your two approvals files, changeable only by you." (notes :111) |
| audit2 :249, :251, :252 | Section 6, no answer found: growth that leaves no record; telling a correction from an addition; his approvals behind the checker alone. |
| audit2 :275 | Section 7: "What holds the rule is still open (question 3)." |

---

## 2. Verification against primary sources

### 2a. The process repository's CLAUDE.md

**On `origin/main` and on branch `process4` (identical).** (V) `git -C /home/user/process3 diff origin/main origin/process4 -- CLAUDE.md` is empty; the working copy equals HEAD. File: `/home/user/process3/CLAUDE.md`, 3 lines, 1,544 bytes. Its only two commits are Bob's: `32146f7` (1 Nov) and `9275fd8` (2 Nov 10:07 PST) (`git log origin/main -- CLAUDE.md`).

The clauses that let a session merge a change to the process without him, all in the one sentence at `/home/user/process3/CLAUDE.md`:3:

> "Sessions working on Process3 or on products under it may, without asking me: ... push to their own working branches and to the process's state branch; open, comment on, mark ready or draft, and close pull requests; merge pull requests into working and tranche branches once their required checks pass, without a person's review, and merge the tranche's pull request into main once its required checks pass; run builds and tests; run the repository's own workflows; ..."

What it forbids, same line:

> "They may never: force-push, delete a branch, change permission or repository settings, push to main except through the tranche's pull request, publish a public release or promote a release to installed sites without my approval, or act on any other account or service."

(V) Nothing in it forbids changing the process, adding a test or a check to it, or moving a product to a changed process. It names "Process3", not Process4. (V) This worker session itself runs on branch `process4` and was shown exactly this text as its project instructions.

**On `origin/tranche`** (the branch the product's process version points at; 2d). (V) `git show origin/tranche:CLAUDE.md`, 11 lines; last commit `5d5adf4`, Bob, 8 Nov 10:02 PST. The permitting sentence, line 7:

> "In this repository, neobobkrause/process3, only, they may: push to their own working branches and to the process's state branch; create tranche branches from main; open, edit, comment on, review without approving, mark ready or draft, close and reopen pull requests; through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way; ... and change its workflow files only through pull requests the merge tool merges after a green gate, never adding or renaming a job whose name matches a required check, never widening any workflow's or job's permissions, and never adding a pull_request_target trigger."

What it forbids, line 9:

> "They may never: force-push; delete a branch, tag or release, or choose the delete-branch option when merging; change permission, repository or ruleset settings, or a protected environment; push to main except through the tranche's pull request; reveal any secret value; or act on any account or service other than those named here, except under a product's own approvals from a session started in that product's repository."

(V) Git shows who committed these texts (Bob, every time), not who drafted the wording. (A) The post-mortem says most edits to his approvals were drafted by the coordinator (`working/audit2_notes.md`:72).

### 2b. Settings files and deny lists in the process repository

(V) `git ls-tree -r --name-only <branch>` for each branch:

| Branch | `.claude/settings.json` | Note |
| --- | --- | --- |
| `origin/main` (tip `a3e37b5`, 2 Nov) | none | GitHub's default branch (`git ls-remote --symref origin HEAD`) |
| `origin/process4` (tip `961b729`, 14 Nov) | none | where the Process4 work is kept |
| `origin/process-state` (tip `592757f`, 9 Nov) | none | holds 17 files under `github/` only |
| `origin/tranche` (tip `38b0f3f`, 9 Nov) | **present** | 21 deny entries, 1 allow entry; last commit `0dcaa0c`, Bob, 9 Nov |

The tranche branch's deny list removes the GitHub merge tool, `gh pr merge`, every `git push`, every `gh` command and file writes through GitHub's interface, and allows one thing: `Bash(node tool/p3.mjs github push *)` (`git show origin/tranche:.claude/settings.json`, lines 3-28). (J) It funnels every act through Process3's tool, whose merge command the approvals name. It was never a stop on sessions merging process changes: 270 of them were merged that way.

So the statement "it has no deny list" is true of `main` and of `process4`, and false of `tranche`. The drift audit's sentence (`working/audit2_corruption.md`:94) is about `process4` and is right for it. The handoff's sentence (`HANDOFF.md`:54) dropped the branch.

(V) This session's own tool list includes GitHub's merge, push-files and create-or-update-file tools. A deny entry removes such a tool outright ((A) `evidence/permissions_inventory.md`:240). I called none of them.

### 2c. What is in `.github/` in the process repository

(V) On `main`, `tranche` and `process4`: three workflow files and nothing else. No CODEOWNERS file on any branch. Rulesets are GitHub settings, not files; none is kept as a file.

- `.github/workflows/ci.yml`: "Process3's own required check, \"ci\", on every pull request": the tool's tests, then a record check run by the base branch's copy of the tool (lines 1-4, 25-42).
- `.github/workflows/record-pr.yml`: a record check under `pull_request_target`, job `record` (lines 1-9, 16).
- `.github/workflows/record.yml`: a record check on every push, "Not a required check" (line 3).

Between `main` and `tranche` only `ci.yml` differs, in one line (the time limit).

### 2d. What the product repository carries

**On `main`** (V, `/home/user/neobobkrause/civicsmith-copy`, tip `0dea5a6`, Bob, 1 Nov): `CLAUDE.md`:3 is the first approvals text: "open, comment on and merge pull requests into working and tranche branches". `.claude/settings.json` has 17 deny entries (force-push, deleting, pushing to main, history rewriting, tags) and one start-up hook. No entry concerns merging or the process.

**On `tranche`** (V, tip `e7ec72e`, 9 Nov, read by `git show e7ec72e:<path>`; the commit was already in the clone):

- `CLAUDE.md`, 22 lines. Approvals, line 5: "through the process's merge tool, merge pull requests into working and tranche branches once its gate and their required checks pass, without a person's review, and merge the tranche's pull request into main the same way"; and they may "change this repository's own workflow files, only through pull requests the merge tool merges after a green gate, ... and never making the process gate anything but the process's own shim at the pinned process". Line 13: "They may never: ... change permission, repository or ruleset settings, or the protected environment; ...". Nothing in the approvals forbids moving the process version.
- Below the approvals, a section "## Process3" (lines 17-22): "The process is pinned: `.process` is a submodule at the commit this tree names ... never edit `.process/` by hand." (A) Sessions wrote these lines (`working/enforcement_levers.md`:49).
- `.claude/settings.json`: 31 deny entries (the merge tool and commands, every direct push, every `gh` command, file writes through GitHub); allow `Bash(node .process/tool/p3.mjs github push *)` and `Artifact`; one start-up hook and two retired hooks that run before every GitHub call and every shell command. No deny entry names the process's files or the version entry.
- `.process` is a submodule entry at commit `38b0f3f07f40c2d2af821be1d6563894d33724d6`, and `.gitmodules` names `https://github.com/neobobkrause/process3`. That commit is the tip of the process repository's `tranche` branch, not of its `main`. (V) The last merge into the product's tranche is "Merge PR 1116: p3/pin-38b0f3f07f into tranche", by the sessions' account.
- No CODEOWNERS file. Eight workflow files, four of them named `process-*`.

(J) So in the product, moving to a changed process is a pull request that any session may open and that the merge tool merges without a person. (A) It was done 116 times in nine days (`evidence/product_side.md`:82).

### 2e. GitHub's own rules

**From a clone.** Branch protection and rulesets cannot be read from a clone. They are settings on GitHub.

**What the evidence files say was measured, and when.**

- `evidence/levers_github_cloudflare_product.md`:3, :12 (prepared 13 Nov): no API access; "Statements about current settings come from `process3/setup/conditions.json` and `setup/DEVELOPER.md`, which describe what the owner was asked to set, not what is set today."
- `evidence/permissions_inventory.md`:3, :16 (14 Nov): GitHub's settings "could not be read"; "It is not a live reading." Its table 1f (:278-295) gives what the setup guide asked: a ruleset on every branch (no deletion, no force-push, empty bypass list); a ruleset on main and the tranche (pull request required, merge commits only, required check `gate`, required approvals 0, code-owner review off, empty bypass list); no classic branch protection; auto-merge off; no CODEOWNERS. (V) That guide, `setup/DEVELOPER.md` on the process repository's `tranche` branch, is written for the product's repository ("the owner of the product's repository", line 3; Steps 7 and 11).
- The one measurement: 1 Nov, a session's attempt to set branch protection was "Refused by the proxy, 2 tries" (`evidence/permissions_inventory.md`:250, :295).
- `working/enforcement_levers.md`:18 (14 Nov): "GitHub's API was closed to this session for both repositories."
- No evidence file records the rules on the process repository itself.

**Read live today for the process repository** (V; `gh api -X GET repos/neobobkrause/process3/...`, 14 Nov 2026, as `believeinoakland`):

| Fact | Value |
| --- | --- |
| Owner type; visibility; default branch | a personal account; public; `main` |
| The sessions' account on this repository | `push: true`, `admin: false` |
| Ruleset "every-branch" (all branches), active, last changed 2 Nov | no deletion; no force-push |
| Ruleset "process3" (`main` and `tranche`), active, last changed 2 Nov 14:14 UTC | no deletion; no force-push; pull request required with `required_approving_review_count: 0`, `require_code_owner_review: false`, `required_reviewers: []`; merge commits only; required checks `ci` and `record` from GitHub Actions |
| Whether the sessions' account can bypass either ruleset | "never" |
| Branch `process4`, branch `process-state` | covered by "every-branch" only: no pull request and no check required |
| Classic branch protection on `main`, `tranche`, `process4` | not enabled |
| Auto-merge | off |
| The bypass list; the collaborator list | not readable (the first comes back empty to a non-admin; the second is refused by the proxy) |
| Pull request 302, the last change to the process | opened and merged by `believeinoakland`, 9 Nov 18:13 UTC, into `tranche`; no review on it |
| Pull requests ever merged into `main` | two: number 8 (merged 2 Nov 03:06 UTC) and number 21 (2 Nov 18:08 UTC), both opened by Bob's account |

(V) From git: all four first-parent commits on the process repository's `main` are Bob's; `tranche` is 1,232 commits ahead of `main`. On `tranche`, 270 first-parent commits are by the two session accounts (177 Civicsmith, 93 believeinoakland) and 26 by Bob (`git log --first-parent --format=%an origin/tranche`).

(J) What GitHub physically holds on the process repository today: no branch can be deleted or force-pushed; `main` and `tranche` change only by pull request with two automatic checks passing. What it does not hold: who merges, and anyone's approval. A session with the sessions' account can merge a change into `tranche`, and the tranche's pull request into `main`, with no act of Bob's. On `process4` it can push directly.

**Not read:** the product repository's live settings; the bypass and collaborator lists; Actions settings and environments.

---

## 3. The history of this question, exactly

### 3.1 13 Nov: proposed and withdrawn (the assessment page, `working/assessment_doc.txt`)

(V) Proposed, in the session's words on that page:

- :261 "The process changes only by your merge. Sessions that build the product cannot write to the process repository or to the process files inside the product repository. GitHub enforces it. You can merge a change at any moment you judge it worth the cost."
- :246 "the process itself becomes yours, and changes only by your own merge."
- :309 "A change to the process takes effect only when you merge it."
- :531 "One process version per run. The pin moves only by your merge."

(V) Withdrawn, same page:

- :104 "The proposal does not meet your requirements, and its recommendations are withdrawn."
- :114 "Your principle P17 says you define the project and the AI decides everything technical. To stop Claude corrupting the process, I moved the process itself across to you. That one move produced most of the contradictions."
- :297 "Withdrawn. The audit near the top of this document found that these recommendations contradict your requirements, starting with who decides and fixes the process."

(V) Why, as that page gives it:

- :62 against "No commands, no file edits; settings only": "You are made the merger of every process change ..., the creator of the hourly task ... and the answerer in an issue ... None of those is a settings change".
- :116-121 a table: who adopts the fix, "You merge, twice"; what he does, "Read, decide, commission, merge, toggle a limit"; how long work waits, "Until you act".
- :123 "The proposal asks 36 acts of you. Eight are changes to GitHub or Cloudflare settings, three are borderline, and 25 are something else ... Fifteen recur. It also creates 22 situations where work stops or waits; 16 of them end only when you act."

(J) The 36 acts and 22 waits are for the whole proposal of 13 Nov, which also guarded paths in the product and made him create a scheduled task. They are not the cost of the process-repository part alone.

The requirement it broke is a session's record of him, not typed words: record line 1, "You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules." and line 2, "The process runs unattended. It waits for you only when it is completely blocked" (`definition/process4_definition_v5.md`:81-82).

### 3.2 14 Nov, first draft: words only, and said so

(V) `definition/process4_definition_main.md`:100 "The process itself has a fault. Claude fixes it." :193 "Today nothing physically prevents it. Sessions can change the process's repository and merge their own changes ... It is a rule in text only, and in Process3 text alone did not hold."

Bob's words as held in `owner_words/bob_words_14nov_b.md`:37, under "Earlier own typed words of 14 Nov (first message)": "The hardest open problem: today nothing physically stops a session adding a test or a check to the process. That rule exists only as text, and in Process3 text alone did not hold."

(J) A caution on provenance. That sentence is close to the first draft's own (:193), which a session wrote, and the file holds his first message only as excerpts, not whole. I could not establish from the files which came first. Worth confirming before it is quoted to him again as his.

### 3.3 14 Nov, second draft: re-proposed as if new

(V) `definition/process4_definition_v2.md`:212-220, "the hardest" question:

- :212 "The one physical stop that was found ... is a wall: the sessions' GitHub account loses the ability to write to the process's repository. A session can still prepare a fix. It reaches the process only when you press the merge button for it on GitHub's website."
- :214 "With the wall, every process fix costs you one click, and a process fault that blocks work waits for you."
- :220 "Claude's recommendation. Take the wall for the first tranche. Each fix comes to you with one plain sentence saying what it corrects or removes, and the size of the process before and after. ... What it does is make silent growth impossible and every change visible to you."

It does not say that this was the centre of the proposal withdrawn the day before.

(V) The first audit's finding, `definition/process4_counterarguments.md`:251-259 (entry 17): "The wall Claude recommended is the same step the proposal of 13 Nov took and then withdrew ... and the text did not tell you so. It said the wall costs you 'one click' a fix, when the evidence says two acts for every fix and a sitting of settings to begin with. It promised that silent growth becomes 'impossible' two paragraphs after listing where growth can still happen. And it added a new record to every fix". The answer (:259): "Withdrawn by Claude: the wall question as written ... Claude was wrong on three counts. ... The fullest form, you merging every process change, is not proposed again." Repeated in the third draft's opening, `definition/process4_definition_v3.md`:9, and in `working/decisions_memo_d3.md`:33.

(V) Neither file in `owner_words/` holds a reply of his to the wall question.

### 3.4 The true cost to him, as the evidence gives it

For the wall (the sessions' account cannot write the process's repository, or cannot update its branch), from `working/enforcement_levers.md` (A unless marked):

- **Once:** "one sitting of settings" (:222); wording edits to his approvals and deny list (:222). Each edit to his approvals stopped every long-lived session in Process3, five times of five, if the start-up comparison is kept (:149; `definition/process4_definition_v5.md`:285).
- **For every process change:** "one merge and one move of the reference for every process fix" (:222). The assessment page had it as "You merge, twice" (`working/assessment_doc.txt`:119). That is two acts, not one click, unless the product is made to follow a name that his merge itself moves (:81).
- **How often:** unknown. "How often a blocking process fault would occur in a process as small as Process4's" was not determined; Process3's rate was 296 process merges and 116 version moves in nine days, for a tool of 24,000 lines (:259). (J, auditors) The first tranche runs on a tool not yet built, so process faults are the expected case in its first hours (`definition/process4_audit2.md`:81).
- **What waits while he is away:** "Every process fix needs the owner: he merges it. A process fault that blocks work then waits for him." (:75) "Every defect in the walled part becomes a stop only the owner can clear." (:183) Measured in Process3: one question carried as his waited about nine hours (`definition/process4_definition_v5.md`:263); a ruling of "no workaround, no exemption" left a merge blocked for 96 minutes with 20 slots empty (`working/audit2_corruption.md`:179).
- **What his merge is worth as a stop:** "If only Bob merges, the stop is his reading of a diff, and the record says that does not hold." (:201) He accepted 151 of 159 drafted Ledger lines (`evidence/canon_analysis.md`:41). The first audit: "your click, which cannot judge the code, turns a session's addition into 'Bob approved it'" (`definition/process4_counterarguments.md`:200).
- **What it never stops:** the residue of ten things, among them a session's own over-caution, demands typed into another session's starting text, helpers used as reviewers, process-serving tests among the product's, added walk steps, helper scripts in the product, and text drafted for him to commit (:193-208).

### 3.5 14 Nov, third draft: a narrower question, with a recommendation

(V) `definition/process4_definition_v3.md`:344-352. The question: "Is the version of the process that a product uses fixed for a whole tranche by a setting only you can change?" :346 "The fullest form, you merging every process change, was the centre of the proposal withdrawn on 13 Nov ... It is not proposed again. One narrower form remains, which asks for no judgment and no merge from you. Sessions go on deciding and making every process fix." :348 "The cost to you is one settings change at the start of each tranche, and one more whenever a process fault stops work in mid-tranche. Until you make it, the product waits for you. ... It is untested." :350 the alternative: the rule as text in his own committed approvals in the process's repository. :352 "Take the fixed version for the first tranche. ... This is a recommendation on an unproven mechanism, not an assurance."

(V) Objections recorded and not met: the recommendation was made while the rate of blocking faults is unknown; the reviewer's rehearsal before he answers was not taken; the reviewer's third option, protecting only the parts that can stop a merge, was not put to him (`definition/process4_counterarguments.md`:211; `working/register_notes.md`:133).

### 3.6 His reply, and what followed

(V) His second message of 14 Nov contains the PROCESS paragraph (`owner_words/bob_words_14nov_b.md`:25). It says neither yes nor no to a setting, and names no merge, click or setting.

(V) Fourth draft: "the third draft's fix session and its question to you about a setting are removed" (`definition/process4_definition_v4.md`:9). None of its thirteen proposals concerns a setting (section O, :358-440). Its notes: the 13 Nov withdrawal is "Not mentioned in the draft. His words today do not say he merges anything; they say he chooses and approves" (`working/v4_notes.md`:19); and "I did not write in the lever ... (the sessions' account holding no write access to the process's repository), because PROCESS itself would work under that account and the task did not ask for a mechanism" (`working/v4_notes.md`:66). The risk is listed as one with no trial (`definition/process4_definition_v4.md`:349).

(V) Fifth draft: the rule is stated (`definition/process4_definition_v5.md`:264); approval is "PROCESS writes your approving words into the record of the change ... Nothing else counts as approval", marked Claude decided (:273); "one fixed version for each tranche, moved only with your prior approval" (:309); "Nothing physical yet stops a session building a product from changing the process's files, or from moving to a changed process" (:407). Two Process3 checks that stood near this rule are ended: "the check of the process version at a session's start; the check that the process files a product holds have not drifted" (:327). The fourth draft's one comparison from git of whether the process stayed as approved was removed as a check (`working/v5_notes.md`:15). The draft says "No proposal is waiting for your yes or no" (:9).

(V) So since the PROCESS paragraph the question of a setting has not been put to him in any draft. The second audit puts it as question 3 (`definition/process4_audit2.md`:69-75); he has not answered it (`HANDOFF.md`:69).

### 3.7 What his words say that bears on it

Typed, 14 Nov (`owner_words/bob_words_14nov_b.md`:25):

- "Process changes only happen in a separate process lane call PROCESS that I interact with."
- "the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose."
- "Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between."
- "The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval)."
- "The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update."

Typed, as held in the same file (:37, with the caution in 3.2): "The hardest open problem: today nothing physically stops a session adding a test or a check to the process. That rule exists only as text, and in Process3 text alone did not hold."

Typed, third message (`owner_words/bob_words_14nov_c.md`:14, :26): "There is no need to any any more tests. PERIOD!"; and the hint "M2: ... ARCH can ask ROOT to start PROCESS if it isn't already running, and the coordinator can talk to PROCESS."

Typed working rule (`owner_words/bob_words_14nov_b.md`:34): "Do not add tests, gates, reviews or checks. Process4 has three tests, ever."

Committed by him (`/home/user/process3/CLAUDE.md`:3): "They may never: ... change permission or repository settings".

His answer "agreed" to the fourth draft's proposal 12, "Three acts of yours beyond settings changes" (`owner_words/bob_words_14nov_c.md`:45). One of the three is committing his approvals and the deny list himself.

(J) What these establish and what they do not. He has said that every process change needs his involvement, his choice and his approval, that he may be away, and that changes then wait and are taken together. He has said that the rule is text and that text did not hold. He has not said that he merges anything, presses anything on GitHub, or changes a setting for each change. The handoff's sentence that his words "accept both the acts and the waiting that a setting only he can change would cost" (`HANDOFF.md`:54) is the drift auditor's judgement (`working/audit2_corruption.md`:81, :97), not his words. The waiting is in his words. The act of merging is not.

---

## 4. The physical means in the evidence

None was invented here. Sources: `working/enforcement_levers.md` (levers 1, 2, 4, 7, 8, 9, 10), `evidence/levers_github_cloudflare_product.md` (:30-131), the three audits. "Only Bob" means two things, kept apart: **by GitHub** (a setting a write collaborator physically cannot change: (A) `evidence/levers_github_cloudflare_product.md`:34-35, :64; (V) today the session account has `admin: false`), and **by his approvals** (a file sessions could physically change but are forbidden to).

| # | Means | What it stops | What it does not stop | Cost to Bob | Tried? | Who can set it |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **A repository sessions cannot write.** The sessions' account is not a collaborator on the process's repository (lever 1). | Every push, branch and merge there by any session. Every place Process3's counted additions were made. | A fork and a pull request from it, which merges nothing until he merges it. The product pointing at another copy: the product names the process's repository in files sessions write. PROCESS could not save its proposals there, since it runs under the same account ((V) `working/v4_notes.md`:66). Everything in the residue (3.4). | One settings act. Then he merges every change himself, and something must still move the product. Work waits whenever he is away. | Never. The sessions' account held write access throughout Process3 and holds it today ((V) 2e). | Bob only, by GitHub |
| 2 | **A branch only he can update.** A ruleset rule "restrict updates" on the branch of the process that products use, with him alone able to bypass (lever 2b). | Any session's merge or push into that branch. PROCESS can still push its own branches and open pull requests. | Changes gathering on other branches. A product naming a commit that is not on that branch, unless the product's entry is also held (means 5). The residue. | One settings act (today's ruleset on `main` and `tranche` would be changed, or a new one made). Then one merge on GitHub's website for each approved change or group. A second act if the product's entry must also be moved. Nothing merges while he is away. | Never ("None measured", `working/enforcement_levers.md`:84). Listed as trial 4 (`definition/process4_audit2.md`:237). | Bob only, by GitHub |
| 3 | **His review required on the process repository's branch.** Required approvals above zero, or a CODEOWNERS file naming him with code-owner review required (lever 4). | A merge into that branch that he has not approved on GitHub. | The same as means 2. The CODEOWNERS file is itself a file in the repository. "Required reviewers" by file pattern is not available on a personal account's repository (`working/enforcement_levers.md`:102). He cannot approve his own pull request, from memory and unchecked (:103), so his own commits need a bypass. | One settings act. Then an approval click for each change. Today's setting is the opposite: required approvals 0, on the setup guide's ground that "a required review would stop every merge" (`evidence/permissions_inventory.md`:286). | Never. "Zero required approvals plus code-owner review" is untested (:103). | Bob only, by GitHub. It is called a review in GitHub's own words; whether it is one under his rule is his to say (:104) |
| 4 | **A deny list in the settings a session loads**, in the process's repository (lever 7). | The named tools and commands, outright, in a session that loads it. Entries the evidence names: the merge commands; edits to the process's test and workflow folders. | It loads only in a session that holds one repository and starts from a branch that carries the file. `main` and `process4` carry none today ((V) 2b). A script or a git command passes a path rule; the documentation says so. "It can still add a refusal inside existing code; no path rule can tell a correction from an addition there." (:133) The file is in the repository. | One commit by him for each change of the list, on each branch sessions start from. | Removal of a denied tool: measured once, 1 Nov, 1 probe, 8 acts (`evidence/permissions_inventory.md`:240). Path rules: never measured. A deny list ran all through Process3 and did not hold this rule: it sent merges through the tool. | Bob, by his approvals ("change permission ... settings") and by Process3's rule that the file is his. Not by GitHub: any account with write access can push a change to the file |
| 5 | **The process version a product uses, kept where only he can move it** (lever 2: a name in the process's repository that only he moves; or a variable of a GitHub environment, which only a repository's owner can create or change). | A product moving to a changed process without his act: the 116 moves. | Additions gathering in the process between moves, "which you would adopt whole when you move the setting" (`definition/process4_definition_v3.md`:348). The line in the product that names the reference, unless that file is held too. A plain repository variable does not serve: a collaborator can write it (`working/enforcement_levers.md`:83). | "One act of Bob's for each fix a running tranche adopts, plus one per tranche." (:86) The product waits for him until he makes it. | Never ("None measured", :84). Today the version is a submodule entry any session moves by pull request ((V) 2d). | Bob only, by GitHub, for the ruleset and the environment variable |
| 6 | **The rule in his own committed approvals in the process's repository** (lever 8). Not physical. Listed because the audits put it beside the others. | Nothing physically. It reaches the session's own model and is read by the permission checker. | Everything. "There is no measured evidence that the permission checker enforces a bare 'never'." | One commit. | This channel was never tried: the rule against adding checks "was never in Bob's committed text in Process3" (:145). The one comparison found his approvals made "NO DIFFERENCE" to the checker and a large difference to the session's own model: 10 of 10 done with them, 0 of 10 without (:143). | Bob. The checker refused a session writing his approvals 2 times of 2 |
| 7 | **Rules held on Claude's side**, written by the cloud environment's setup script, or managed settings on a team plan (lever 9). | A rule that is in no branch and that no pull request can change. | A session can edit a file in its own container. Whether deny rules written this way are honoured is not stated and not measured (:154). Managed settings need a plan he may not have (:155). | A Claude-side setting, which is neither a GitHub nor a Cloudflare setting. | Partly: one trial of another key, 19 of 19 (:154). | Bob: a session cannot change its environment without his approval prompt (:153) |
| 8 | **A free GitHub organisation** (lever 10). | Adds a real read-only role for the sessions' account on the process's repository, and review rules kept in the ruleset instead of a file. | It is a container for means 1 to 3, not a stop by itself. | One transfer of both repositories; two apps reinstalled; settings re-checked. | Never. | Bob only |

Three things from the same evidence that are not settings:

- **Having nothing that can refuse** (lever 11): a process that is settings, one test run and short texts, with no session-run tool, so that there is no code to add a refusal to. Structural; "The specific design is not" proven (`working/enforcement_levers.md`:168).
- **The combinations** the levers paper sets out (:212-244): A, wall the process, which "holds most and costs Bob most"; B, hold only the part that can stop a merge and leave texts open; C, no wall, the rule in his approvals with narrow denies, which "costs nothing and rests on an unmeasured hope". B is the option the first audit said was never put to him (`definition/process4_counterarguments.md`:211).
- **What Process3 itself had**, now ended in the fifth draft as checks beside the three tests: the check of the process version at a session's start, and the check that the process files a product holds have not drifted (`definition/process4_definition_v5.md`:327). (J) By his rule these are not to come back, and I do not suggest it.

(J) Against his rule "Do not add tests, gates, reviews or checks": means 1, 2 and 5 add no test and no check by a session; they change where his approval, which his PROCESS paragraph already requires for every change and every move, is given: typed to a session that writes it down, or made as an act on GitHub that only his account can make. Means 3 is the same thing under the name "review". Whether any of these is a "gate" in his sense is not for a session to decide.

(J) One thing the main session should hold in mind before putting any of this to him. The drift audit's suggestion, a branch only he can update with his merge as the approval, is the centre of the 13 Nov proposal again, in its narrowest form. The audit says so (`working/audit2_corruption.md`:81, :97). Its cost line, "one act per approved change, which he now makes anyway by typing his approval" (:109), and the combined audit's "One act of yours for each approved change" (`definition/process4_audit2.md`:75), leave out the first sitting of settings, the move of the product's version where that is a separate act, the wording edits to his approvals with the stop each edit causes, and what the evidence says about the worth of his merge as a stop (3.4). That is the same shortfall lesson 5 of the handoff names.

---

## 5. What Process3's record shows about rules held only by text

| Fact | Source | Mark |
| --- | --- | --- |
| The fifth draft holds 51 rules by text; something physical stands behind six in whole or part. The first round counted 36 in the second draft, with three held. | `working/audit2_corruption.md`:448-506, summary :506 | A (the count is the drift auditor's) |
| Sessions made 270 of the 296 changes merged into the process; Bob 26. | `git log --first-parent --format=%an origin/tranche` in `/home/user/process3` | V |
| 121 of those 296 merges (41%) added or strengthened a check; they carry 60% of the tool code added. | `evidence/change_sample.md`:9 | A |
| His instruction of 5 Nov ("add a check only when study and data show it is needed") did not change the rate: 71 of 175 before it (41%), 50 of 121 after it (41%). | `evidence/change_sample.md`:14 | A |
| The process version in the product was moved 116 times in nine days, all by sessions, 102 of them in six days. | `evidence/product_side.md`:82, :233 | A |
| The one restraint with something hard behind it held all week: role texts capped at 4,096 bytes by a test stayed at 4,032 to 4,197 bytes, while the tool's code grew from 1,431 to 23,429 lines. | `evidence/causal_forensics.md`:29, :310 | A |
| The restraint rule was a "Nudge" read once at start; checks were code that refused on every call. | `evidence/causal_forensics.md`:26, :308 | A |
| The product's CLAUDE.md, under a thirty-line rule, went from 641 bytes to 8,664. | `working/audit2_corruption.md`:499; sizes: `ls` on the clone's main (641) and `evidence/permissions_inventory.md`:30 (8,664) | 641 V; 8,664 A |
| A limit on review rounds was overridden all 17 times it applied. | `working/audit2_corruption.md`:484 | A |
| 211 test files (11,410 lines) written for the process sat among the product's tests, each carrying the label asked for. | `working/audit2_corruption.md`:482; `definition/process4_counterarguments.md`:111 | A |
| No case was found of the permission checker enforcing a "never" that had no deny rule or GitHub rule behind it. Every "never" that held (force-push, deleting a branch, main) also had one. | `working/enforcement_levers.md`:141-142, :258 | A |
| The rule against adding checks was never in his committed approvals in Process3: it was a "Nudge" in rulebooks, a line in three role prompts and his words in chat. "So 'text alone did not hold' was measured for the weaker channels, not for this one." | `working/enforcement_levers.md`:145 | A; that no such rule is in either approvals text today is V (2a) |
| "No session in the record attacked branch protection or routed around a denied permission." | `working/assessment_doc.txt`:218 | A (a session's statement on his page) |

(J) Read together: where GitHub or a deny entry stood behind a rule, the record shows no session breaking it; where only words stood, the rule drifted. That is a statement about Process3. It does not show that any means in section 4 would hold in Process4; none has run.

---

## 6. What is Bob's to decide, and what is technical

### Bob's

1. **Whether anything physical stands behind his rule.** Options, with the cost of each to him as the evidence gives it:
   - (a) Words only, as now. No act. The risk he named stays.
   - (b) Words in his own committed approvals in the process's repository (means 6). One commit; one more whenever the wording changes; each edit stops long-lived sessions if the start-up comparison is kept. Not physical, never tried.
   - (c) A branch only he can update (means 2), with or without the product's version held the same way (means 5). One sitting of settings; then one merge on GitHub's website for each approved change or group, and possibly a second act for the product's move. Nothing reaches products while he is away. Never tried.
   - (d) The sessions' account cannot write the process's repository at all (means 1). As (c), and PROCESS cannot keep its proposals there. Never tried.
   - (e) Only the part of the process that can stop a merge is held, and texts stay open (combination B). An act only when that part is faulty. Never tried; never put to him.
2. **Whether an act of his on GitHub for each change is acceptable,** and whether it counts as a gate or a review under "Do not add tests, gates, reviews or checks". His PROCESS paragraph requires his approval; it does not say how it is given.
3. **What counts as his approval at PROCESS:** his typed words written down by the PROCESS session (the fifth draft, Claude decided), or an act only his account can make.
4. **Who moves a product to a changed process once he approves** (`definition/process4_audit2.md`:75; `working/audit2_feasibility.md`:149).
5. **The wording of his approvals in the process's repository.** Today they name Process3 and permit sessions to merge there without a person. Only he commits that text. What it should now say is his.
6. **Any setting at all.** Every GitHub-side means is his act: his approvals say sessions "may never: ... change permission or repository settings", and GitHub gives the sessions' account no admin right.

### Technical: Claude's to decide and report

1. Which branch PROCESS starts on and works on; which branch products follow. Today the default branch `main` has not moved since 2 Nov and is 1,232 commits behind `tranche`, and the product points at a `tranche` commit.
2. How a product names the process version it uses: a submodule entry as now, a line naming a commit, or a name in the process's repository.
3. How any chosen means is built, and its trial in the throwaway repository before it is relied on. What a trial can show: that GitHub refuses the session account's merge. What it cannot show: that growth stops.
4. Whether today's two required checks on the process's `main` and `tranche` (`ci` and `record`) fit Process4, and whether the `record` check, which runs under `pull_request_target`, will still report after GitHub's change of 2 Dec 2026 to that trigger in public repositories ((A) `working/enforcement_levers.md`:122; not checked by me). If it stops reporting, nothing could merge into those two branches.
5. The deny list for sessions on the process's repository, once the branch is chosen. He commits it; what it should contain is technical.
6. Stating in the definition what PROCESS may do after it starts (`definition/process4_audit2.md`:207).

---

## 7. Wrong or stale in the handoff and audits

1. **"It has no deny list"** (`HANDOFF.md`:54). True of `main` and `process4`. The `tranche` branch of the process's repository carries a 21-entry deny list committed by Bob (2b). It never stopped merges; it routed them through the tool.
2. **GitHub's settings "could not be read"** (`evidence/permissions_inventory.md`:16; `working/enforcement_levers.md`:18; `working/audit2_corruption.md`:584). Stale for the process repository: its rulesets were readable today (2e). Still true for the product repository in this session.
3. **No evidence file had the process repository's own rules.** They are now read: no approval required, two automatic checks, session account with write access.
4. **"His words of 14 Nov accept both the acts and the waiting"** (`HANDOFF.md`:54). An auditor's judgement. His words accept his involvement, choice, approval and the waiting. They name no merge and no setting (`working/v4_notes.md`:19 says the same).
5. **The cost of the drift audit's suggestion is understated** (`working/audit2_corruption.md`:109; `definition/process4_audit2.md`:75), in the way lesson 5 describes (section 4, last paragraph).
6. **The two audits differ on who merges a process change.** Run audit: "PROCESS merges its own change with the tool once the tool's tests pass" (`working/audit2_feasibility.md`:148). Drift audit: Bob merges (`working/audit2_corruption.md`:109). The combined audit carries the second into question 3 and the first into section 4 without saying they differ.
7. **Provenance of "The hardest open problem ..."** (3.2). Held as his typed words in an excerpted list; near-identical to a sentence in the session-written first draft. Not resolved.
8. **The approvals in the process's repository speak of Process3 only.** Whether a session reads them as covering Process4 work there is not known. The fifth draft's table of his acts points to section I for committing approvals in the process's repository, and section I says nothing about it (`working/audit2_feasibility.md`:286, confirmed).

## 8. What I did not establish

- The product repository's live rules and settings.
- The bypass list of either ruleset on the process repository, the collaborator list, Actions settings and environments.
- Whether a session started today on the process repository would in fact be allowed by the permission checker to merge a change there. I read what the approvals and GitHub's rules permit, and one past merge. I attempted nothing.
- Whether any means in section 4 behaves as GitHub's documentation says on a personal account's public repository. None has run here.
- Who drafted the wording of the approvals Bob committed.
- Which came first: the sentence in his first message or the sentence in the first draft.
