# Process3 post-mortem: a sample of the changes that added or removed checks, 1–9 Nov 2026

Independent analysis of `/home/user/neobobkrause/process3` (read-only). The record is the commit and merge messages on `origin/tranche` plus `DECISIONS.md`; pull-request descriptions were not available. Every quotation is from a commit message, a merge message or a decision record. Classifications (what counts as "adding a check", what triggered it, whether it fails closed) are my judgment from that text and, where stated, from the diff.

Two reading notes. Merge times are in the owner's local time (UTC−8) as the merge commits record them; times inside quoted messages are UTC. "The copy" is the product repository the process was building.

## Summary

- **121 of the 296 merges into the integration branch (41%) added or strengthened a check**, gate, refusal, hold, review requirement, audit, alarm or bookkeeping duty. They carry 60% of all tool code lines added. 61 merges removed or loosened one.
- In a sample of 72 additions, **9 (12%) weighed any cost of the check** and **8 (11%) mentioned doing nothing or accepting the risk** (another 6 set aside part of a reviewer's list). **32 (44%) guarded against something never observed; 22 (31%) against something seen once.** 54 (75%) fail closed.
- **The process fed itself.** Across all 121 additions the primary trigger was a failure of the process's own earlier machinery in 46 (38%), a plan line in 30, the owner's words in 26, a reviewer's constructed case in 13, and a product defect in 5 (4%).
- **Half of what was added did not last.** 34 of the 72 sampled checks (47%) were removed, materially loosened or superseded by 9 Nov; those lived a median of 28.0 h, and 9 lived under four hours. The survival estimate puts the half-life of an added check at about 5 days.
- **The checks that held up ran the product.** Checks that execute the product's own tests, build or walk were mostly kept without repair; checks on the process's own records, and flow holds, were mostly removed. The pattern is in section 5.
- The owner's instruction of 5 Nov ("add a check only when study and data show it is needed") did not change the rate: 71 of the 175 merges up to it added or strengthened a check (41%), and 50 of the 121 after it (41%).

## 1. Every merge into the integration branch

The full table of all 296 first-parent commits on `origin/tranche` (date, PR, branch, my class, commit count, lines added and removed in tool code, tests, text and data, keyword counts, subject) is at `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/work/all_merges.tsv`. Tool code is `.mjs` and workflow `.yml` outside `tool/test/`; tests are `tool/test/`; text is Markdown.

| Day (local) | Merges | Add a check (A) | Mixed: feature that also adds refusals (a) | Loosen or remove (L) | Feature / fix (F) | Text, decisions, owner patches | Code lines +/− | Test lines +/− |
|---|---|---|---|---|---|---|---|---|
| 01 Nov | 9 | 2 | 1 | 1 | 3 | 2 | +1,738 / −61 | +995 / −2 |
| 02 Nov | 28 | 10 | 2 | 2 | 6 | 8 | +2,725 / −976 | +3,732 / −1,046 |
| 03 Nov | 61 | 19 | 6 | 9 | 26 | 1 | +7,213 / −1,114 | +8,432 / −203 |
| 04 Nov | 49 | 14 | 7 | 14 | 14 | 0 | +4,994 / −1,184 | +6,041 / −413 |
| 05 Nov | 34 | 6 | 8 | 4 | 12 | 4 | +6,922 / −1,358 | +8,243 / −1,036 |
| 06 Nov | 47 | 18 | 5 | 9 | 9 | 6 | +7,178 / −4,359 | +7,433 / −5,767 |
| 07 Nov | 23 | 5 | 2 | 8 | 3 | 5 | +1,235 / −361 | +1,665 / −149 |
| 08 Nov | 31 | 8 | 4 | 6 | 2 | 11 | +2,819 / −518 | +2,947 / −336 |
| 09 Nov | 14 | 3 | 1 | 8 | 1 | 1 | +1,918 / −2,605 | +2,289 / −2,899 |
| **All** | **296** | **85** | **36** | **61** | **76** | **38** | **+36,742 / −12,536** | **+41,777 / −11,851** |

In nine days the tool went from nothing to about 24,200 lines of code and 29,900 lines of tests at the tip. Of 776 non-merge commits, 285 (37%) are review-fix commits ("review fixes", "cold review's findings", "confirming review"); they added 10,924 code lines, a quarter of all code added. The 259 merges that record a count ran 365 review rounds; 17 ran three or more, each with a recorded "Decision:" line allowing it.

## 2. How many merges added or strengthened a check

A keyword pass over the diffs (added lines containing refus-, fail closed, finding, hold, owed, alarm, audit, blocked, must, never, reject, stale, unread) found a net increase of such lines in 223 of the 296 merges, and of five or more in 162. That pass over-counts, because features and fixes also print refusals.

By judgment from the commit messages, **121 merges add or strengthen a check: 85 whose main purpose is the check and 36 features or fixes whose merged diff also adds refusals, holds or duties**. Four of the 85 are decision-record-only merges that create a duty (PRs 254, 257, 280, 283). Two owner patches (PRs 9, 12) added deny rules and are counted with the owner's patches, not here. The class of every merge is in the `class` column of the table.

Primary trigger for each of the 121 (sampled ones read in full; the rest from the first commit's message):

| Trigger | Merges | Share |
|---|---|---|
| Failure of the process's own earlier machinery | 46 | 38% |
| Product defect that reached or nearly reached main | 5 | 4% |
| A plan or ledger line | 30 | 25% |
| The owner's words | 26 | 21% |
| A reviewer's finding or constructed case | 13 | 11% |
| Nothing cited | 1 | 1% |

Even where the primary trigger was something else, review rounds added further refusals: 104 of the 117 code-bearing additions contain at least one review-fix commit.

## 3. The sample: 72 additions

Spread over all nine days, weighted toward the larger changes, and including every addition I could find from 7–9 Nov (PR 257 is covered under 258, and PR 261 under 260). PR 3 is split into its two mechanisms because their fates differ. "Net" is code lines / test lines, added minus removed, for the whole merge. Life is from the adding merge to the merge that removed or first materially loosened the check.

### 1–2 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 1 | Record check in CI: file-size limit, transient paths, approvals block editable only by the owner's website commit; ledger schema check (+530 / +256). *checks records* | e: plan / ledger line. "Phase 1 build job A" (REC-9, REC-10); review passes 2 and 3 added approvals-heading and workflow-removal findings | no | no | never | yes | **Kept, repaired 3+ times.** Present. First loosened 3 h later (PR 5: 947 findings in pre-process history, 5 min 23 s run); false-positive repairs in PRs 20, 83, 86, 93, 101, 102, 234 |
| 3a | Gate: CI runs the module's own suite on the merged state; revert check (tests must fail when the change is reverted) (+461 / +249). *runs the product* | e: plan / ledger line. "Phase 1 build job C"; five review passes | no | partly: "Stated limit: product code that subverts the gate from inside its own runner is out of the gate's scope (BOB's decision, for Bob's page)" | never | yes | **Kept, repaired 3+ times.** Present. Revert check made advisory 5 Nov (PR 177), restored as a finding 10 h later (PR 185). The suite run is the check the record credits with catches ("20 refuted job claims today", PR 118) |
| 3b | Receipt check: the job's own claim of what it tested is compared with CI's run; merge needs an agreeing receipt; gate rows trusted only via run artifact (+461 / +249). *checks records* | e: plan / ledger line. same build; anti-forgery rules came from review passes ("so a session cannot forge or edit a green run") | no | no | never | yes | **Removed.** Life 3.9 d (ended by PR 177). About 20 follow-up merges touched it (40, 64, 74, 81, 95, 101, 108, 122, 126, 134, 155 ...). Removed 5 Nov (PR 177: no catch in 1,187 gate runs), restored 10 h later (PR 185), removed for good 9 Nov (PR 296; Bob: "get rid of it completely") |
| 13 | Gate workflow split in two jobs so product code cannot read a write token; post job refuses rows naming another run/head (+168 / +167). *trust rule* | c: reviewer / hypothetical. "Product code could read a write token from the gate's own process (setup audit, 2 Nov)" | no | no | never | yes | **Kept.** Present; simplified by PR 111 ("gate never posts") |
| 15 | setup check: ~12 repository conditions read through the API; job start runs it first and refuses when any is "missing" (+231 / +290). *checks records* | e: plan / ledger line. setup list from the plan; DEVELOPER.md is "Bob's direction, 2 Nov"; confirming review made the bypass check "fail closed" | no | no | never | yes | **Loosened.** Life 7.0 d (ended by PR 296). Refused every job start on the copy after Bob applied new settings (C17, PR 230); read a Cloudflare 429 as "missing" and stopped a pin move (C20, PR 235); grew to ~15 min, twice per pin move (C50, PR 289); cut to once per pin on 9 Nov (PD-21) |
| 16 | Record check: any change under .claude/ not made by the owner on GitHub's website is a finding; merges cannot roll guarded files back (+38 / +175). *trust rule* | d: owner's words. "Settings are the owner's (Bob's standing rule: sessions never change permission settings)"; rules 2 and 3 from confirming reviews | no | partly: "every finding within the threat model fixed, the rest recorded as known limits" | never | yes | **Kept, repaired 3+ times.** Present. 15 false findings on the copy's layer/10 when merges carried Bob's own commit (C19, PR 234); tightened again by review (C21, PR 238) |
| 24 | setup check gains approvals, classic-protection, session-branch and deploy-token conditions (ten review passes) (+208 / +393). *checks records* | e: plan / ledger line. developer steps; passes 2-10 were re-review findings on session-branch edge cases | no | no | never | yes | **Loosened.** Life 5.6 h (ended by PR 32). Its approvals reader and session-branch helpers were cut by PR 32; deploy-token later misread a 429 (PR 235) |
| 26 | Approvals "newest owner block" rule with history walk, date floor, carry-dating (six review passes) (+376 / +769). *trust rule* | c: reviewer / hypothetical. "Review follow-ups (2 Nov)"; each re-review found another way a stale approvals block could arrive | no | partly: "the rest listed as known limits or owed (coordinator's word)" | never | yes | **Removed.** Life 3.1 h (ended by PR 32). Removed by "Build J: cut the tool back" (PR 32): "Drops the history machinery, the date floor, carry-dating, the owner's-own range and eligibility" |
| 28 | start check (exit 1 when the session's HEAD or approvals differ from its start branch); refusal counter; one-act PreToolUse hook (dropped before merge) (+175 / +255). *checks records* | e: plan / ledger line. "Build H, session safety" | no | yes: "Drop the one-act hook from build H (BOB's word): the script, its tests and its README text" | never | yes | **Kept.** Present; its depth-1 fetch dropped next day (PR 88: "it cut the history BOB's merge needs") |
| 29 | Review-round limit: merge refuses a third review round without a recorded --decision (+25 / +44). *flow control* | e: plan / ledger line. "Build I: the loop guard"; narrowed by BOB's design audit | no | yes: "Design audit (BOB, 3 Nov): PR 29 narrows to the review-round limit and the one-act line" | more | partly | **Kept.** Present and never binding: 17 later merges record 3 or more rounds with a "Decision:" line (PRs 95, 97, 98 ran five) |
| 34 | Hourly sweep with heartbeat and a daily watcher that takes over a silent ROOT (+180 / +130). *flow control* | e: plan / ledger line. Foundations, scheduled tasks around ROOT | no | yes: "8 what-ifs left as notes" | never | no | **Kept.** Present; extended (PRs 45, 115, 139, 219) |

### 3 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 39 | Four gate checks: imports match uses, no committed generated artifacts, regenerate-and-verify, entry checks (+136 / +91). *runs the product* | e: plan / ledger line. Ledger lines ARC-1, JOB-8, GAT-4, ARC-4; no incident cited | no | no | never | yes | **Kept, repaired 3+ times.** Present. Generated-file half repaired in PRs 75, 80 (41 of 113 tests ENOENT), 84, 95, 131, 174, 209, 251 |
| 40 | job complete demands a --test for every struck requirement mark, carried in the receipt (+40 / +41). *checks records* | e: plan / ledger line. P7 | no | no | never | yes | **Removed.** Life 5.8 d (ended by PR 296). Loosened at 22 h (PR 122: the notice test "answered nothing and the revert check found it inert"), again in PRs 152, 175; removed 9 Nov with the receipt |
| 53 | Requirements cap (70 KB): a split is "owed"; job start refuses an over-cap module unless --over-cap (+53 / +58). *checks records* | e: plan / ledger line. REQ-6; cap set at the measured p90 | no | no | never | partly | **Loosened.** Life 45.5 h (ended by PR 177). Start refusal removed after 45 h (PR 177: no measured catch); the "cap debt" line remains |
| 54 | Provider notices: a provider's merge leaves a notice for each user module; the user owes a test for it in its receipt (+192 / +189). *checks records* | e: plan / ledger line. "The provider-change route"; no incident cited; 8 review findings | no | no | never | yes | **Loosened.** Life 18.7 h (ended by PR 122). Twelve follow-ups (57, 68, 79, 82, 100, 105, 107, 109, 122, 286, 293, 298). First notice listed 56 modules as next work (PR 68); notice test dropped at 19 h (PR 122) |
| 68 | Notice triage: a triage by a worker is owed before any notice-only job starts (+214 / +139). *checks records* | b: own machinery failed. "jurisdictions PR 40 struck R119 and its notice listed 56 modules as next work ... most never touching the changed behaviour" (output of PR 54) | no | no | once | yes | **Loosened.** Life 5.5 d (ended by PR 293). Loosened after 5.5 days (PD-20) on Bob's "Triaging used to be pretty instantaneous... how do we get it back to a lightweight process" |
| 82 | A notice is recorded on ANY change to a provider's source (no requirement or export change needed) (+269 / +161). *checks records* | f: nothing cited. no failure cited; widens what PR 79 had narrowed 34 minutes earlier | no | no | never | yes | **Loosened.** Life 5.4 d (ended by PR 293). PD-20, 9 Nov: "Widely imported providers ... raise notices with 100 or more importing users per bug-fix pull request, so BOB ran many worker shares, one after another, before starting jobs" |
| 85 | merge refuses a conflicted pull request at once; one pin move at a time (+70 / +114). *flow control* | b: own machinery failed. "so no merge waits on checks GitHub never starts (copy PR 108, 4 Nov)" | no | no | once | yes | **Kept.** Present, untouched: a fast refusal that replaced a wait |
| 95 | Guarded route for refreshing generated files through a plain PR: byte-for-byte regenerate compare plus six review-added refusals; config refuses overlapping paths (+129 / +362). *checks records* | b: own machinery failed. "Copy PR 148 (4 Nov): BOB's refresh of the six stale dist/*.bundle.json manifests was refused as module files"; the refusals came from five review rounds | no | no | never | yes | **Kept, repaired 3+ times.** Present; widened by rulings in PRs 131, 209, 240 |
| 97 | Approvals "anchor": config keys judged on every plain merge; duplicate keys, deleted configs refused (five review rounds) (+154 / +335). *trust rule* | c: reviewer / hypothetical. "review of PR 96"; merge note: "rounds 3-5 each found and fixed a real anchor bypass" | no | no | never | yes | **Kept.** Present. Round 3's fix "refused every plain pull request" into a base that deleted its config; round 4 repaired it |

### 4 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 98 | Workflow changes at the tranche close judged by an allowlist of diff shapes instead of going to Bob (five review rounds) (+310 / +603). *trust rule* | d: owner's words. "judged by rules, not sent to Bob (Bob, 4 Nov ~07:04)" | no | no | never | yes | **Kept.** Present. Plain PRs stayed shim-only, so "process3 PR 188 and copy PR 625 were merged by hand" until PR 192 |
| 105 | job complete refuses a missing or zero --cost-usd (+119 / +171). *checks records* | b: own machinery failed. "Cost rows read 0: the copy's signatures a4/a5 passed --cost-usd 0" | no | no | more | yes | **Removed.** Life 45 min (ended by PR 106). Removed 45 minutes later: "A job reading its own get_session mid-turn gets no ... usage (measured 4 Nov, 11:49), so PR 105's required --cost-usd blocked every job complete" |
| 108 | Gate runs the whole suite on a records-only head so there is a run for the receipt to agree with (+14 / +42). *checks records* | b: own machinery failed. "Copy PR 247 ... every gate run on its head was 'record' with the receipt not checked, so merge could never find an agreeing run" | no | no | once | yes | **Removed.** Life 30.8 h (ended by PR 177). Removed with the receipt comparison (PR 177), back with PR 185, gone 9 Nov (PD-21) |
| 112 | Job gate also runs the suites of every module that uses the changed module (+6 / +39). *runs the product* | a: product defect. "Copy PR 95 (op-declarations) merged green on its own suite and broke plane's worker.test R6, unseen until the first development deploy served 500s" | yes: "transitive users reach 43 suite minutes against the gate job's 45 (direct worst 29)" | no | once | yes | **Removed.** Life 2.2 h (ended by PR 118). Reverted 2 h 9 min later: "Bob, 4 Nov 17:15: ... cost +7.6 min median and +28.6 worst per job gate, and of 20 refuted job claims today none came from another module's failure" |
| 113 | pin move requires --pin naming a released process commit; a stray positional sha is refused (+1 / +19). *checks records* | b: own machinery failed. "pin move without --pin defaulted to the tranche tip of the repo it ran in (the product's own, not a process3 commit)" | no | no | once | yes | **Kept.** Present, untouched |
| 120 | Product smoke list (120 s cap) run on every job PR (+52 / +41). *runs the product* | d: owner's words. "Why (Bob, 4 Nov): the cheap catch for cross-module breaks, in place of running every user's suite" | yes: "seconds (default 120)"; "Net growth: the smoke function and its README line" | yes: offered as the cheaper alternative to PR 112 | once | yes | **Removed.** Life 27.1 h (ended by PR 177). Removed after 27 h (PR 177: no catch in 1,187 gate runs) |
| 125 | Review triggers: a change to security paths or a deleted/loosened test must be reviewed before merge; measures recorded per merge (+209 / +164). *checks records* | d: owner's words. "Bob, 4 Nov, about 19:05: two triggers, review before merge, measured for a day or two" | yes: --review-minutes, --findings, --acted-on recorded on every merge row | no | never | yes | **Loosened.** Life 4.8 d (ended by PR 296). Security half cut 9 Nov (PD-21: "no paths configured since 5 Nov; useful 0 of 4 times"); test half present |
| 136 | Internal walk of the built product before each dev deploy ("never a gate") (+91 / +84). *runs the product* | d: owner's words. "deploy.internal_walk ... (Bob, 4 Nov; K4111, K4162, K4781)" | no | no | n.a. | no | **Kept.** Present; made required at round close (PR 239) and the round's end (PRs 269, 278). Found 63 failing steps at round 1 |
| 139 | Holds recorded as state; a hold over 2 h needs Bob's verified website commit; IDLE CAPACITY alarm in the sweep (+176 / +168). *flow control* | b: own machinery failed. BOB sessions holding startable work "by words"; "no one's words hold startable work below the cap" | no | no | more | partly | **Loosened.** Life 53 min (ended by PR 141). Bob-commit path and 85% target removed 54 min later by the coordinator's audit (PR 141); 2-h limit removed PR 177. The alarm itself misfired for 2 h 22 min on layer 11 (C25, PR 243) |
| 140 | Flow control: "starts owed" state that made BOB's other acts refuse; an idle check run before every tool command; safety holds (+189 / +236). *flow control* | d: owner's words. "Bob, 5 Nov, Build Plan R10: Process3 watches whether the job cap is used, safely, live" | no | no | more | yes | **Kept, repaired 3+ times.** Refusal softened to a printed marker in the same PR by audit. Read commands pushed bookkeeping rows (C18, PR 236); the pre-command idle check cost 1,564 git spawns at the copy's scale (C50, PR 289) |
| 146 | Merge train: provider-first hold (a user PR waits while a provider PR that changes its exports is open) and ordering (+232 / +278). *flow control* | c: reviewer / hypothetical. throughput study option B plus "coordinator correction"; no failure of the unheld order cited | partly: ordering by "shortest expected gate" | yes: "the extra disk checks dropped"; "The study's disk defect was a misread" | never | no | **Removed.** Life 36.4 h (ended by PR 191). Removed with the train after 36 h. PR 177 had added "provider hold data" to learn whether the hold ever mattered |

### 5 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 157 | In-flight gate holds the whole tranche: nothing else lands, and merges outside the train refuse, until the held gate ends (+174 / +246). *flow control* | b: own machinery failed. "copy PR 290, 5 Nov 13:15" (a land under a running gate forced a re-gate) | no | yes: notes/train-robust-options.md, "item 8 options" | once | partly | **Removed.** Life 28.8 h (ended by PR 191). Removed with the train after 29 h |
| 165 | Gate rows bound to the PR's own branch and repository (+45 / +171). *trust rule* | c: reviewer / hypothetical. "a second PR from a job branch into a base with a workflow of its own, then closed, leaves its run listing only the job PR" (constructed, not observed) | no | no | never | yes | **Removed.** Life 2.3 h (ended by PR 177). Removed 2 h 19 min later (PR 177: "no measured catch") |
| 167 | Scheduled branch cleanup that deletes nothing until the owner's approval sentence is in the approvals block (+331 / +405). *trust rule* | d: owner's words. standing approvals forbid deleting branches; "deletes only per Bob's 5 Nov sentence" | no | no | n.a. | yes | **Kept.** Present; the sentence match was simplified to a substring by PR 177 |
| 171 | The merged result's "gate" check bound to the process gate's own Actions job (+48 / +96). *trust rule* | c: reviewer / hypothetical. "a run of another branch at the merged result's commit could stand in for it" (constructed) | yes: "one getRun, ~0.3 s"; merge note "~0.7 s per land" | no | never | yes | **Removed.** Life 1.7 h (ended by PR 177). Removed 1 h 40 min later (PR 177) |
| 185 | Restores the revert check as a gate finding and the receipt comparison; adds a reviewed revert-exemption block (+222 / +186). *checks records* | e: plan / ledger line. "AUD-1 (JOB-12) ... AUD-2 (JOB-7, SES-12)": an audit of the code against Ledger lines; Bob's Keep-and-Drop answer of 6 Nov is cited for AUD-1 | no: "Removes PR 177's uncited '29 reds' advisory comment" | no | never | yes | **Loosened.** Life 3.4 d (ended by PR 296). Receipt comparison removed for good after 3.4 days (PD-21); revert check and exemption present |

### 6 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 192 | Five workflow limits (L1-L5) and a strict YAML reader (+669 code, +1,059 test) so workflow changes can merge without Bob (+644 / +1,056). *trust rule* | d: owner's words. "on 6 Nov he approved R1 and one more limit"; predecessor "refused every change that was not a shim byte for byte" | no | no | more | yes | **Kept.** Present. On 9 Nov the one-line CI change still went to Bob: "the merge tool holds a workflow change for his word" |
| 194 | Status warns when a suite passes 70% of its timeout; test-time rows written to the state branch (+156 / +177). *flow control* | d: owner's words. "Bob, 'go R2'"; "Bob, 6 Nov: how much time goes to tests against real work; the state rows could not say" | no | no | more | no | **Kept.** Present, untouched |
| 195 | Lane qualification: lane ask is refused until the lane's research has landed (+98 / +153). *checks records* | d: owner's words. Bob, 6 Nov, quoted at length (SES-19 to SES-23) | no | no | never | yes | **Kept.** Present |
| 198 | SLB-12: after a pin move, layer merge refuses until a layer sync PR has landed on a green gate (+212 / +206). *flow control* | b: own machinery failed. "layer/8's gate, run with the base's own tool, refused R4's carried entries (the four new jobs 658-661 red)"; "SLB-8 (Bob, 6 Nov)" | no | no | once | yes | **Removed.** Life 2.9 d (ended by PR 298). A sync carrying only the pin took a 54-minute full gate (copy PR 1092). Hold removed after 70 h (PD-23; Bob: "Pin moves should be lightweight fixes that improve velocity, not ruin it") |
| 200 | Self-ending records: every hold carries a checkable end condition; a hold with only words for its end is refused (+368 / +237). *checks records* | d: owner's words. Bob: "Go with option 2, fix it in the tool ..." after holds 19-22 outlived layer 6 and "ending them by hand was refused by the session permission judge" | no | yes: options were put to Bob ("option 2") | once | partly | **Kept.** Present, untouched |
| 201 | layer merge refuses while a module is "deferred with work done" unless --defer-done "<why>" (+38 / +50). *flow control* | b: own machinery failed. layer 8's four PRs were "BLOCKED only on a process finding" | no | no | once | partly | **Kept.** Present |
| 203 | A lane may declare checks (its own build commands); the gate runs them on that lane's PRs (+104 / +97). *runs the product* | a: product defect. "a broken words build landed green on a lane-only pull request (ux lane Q7)" | no | no | once | partly | **Kept.** Present, untouched; opt-in ("A lane without checks keeps the records-only path with nothing run") |
| 204 | Census and preflight: every module cross-checked against five lists; layer open refuses with gaps (+289 / +274). *checks records* | d: owner's words. Bob: "we keep hitting items when checks are refusing modules with no ledger entry. Can we anticipate those conditions ..." | no | no | more | yes | **Loosened.** Life 7.3 h (ended by PR 213). Its own review found it "would refuse layer open 11" falsely; loosened 7 h later (PD-4: "a finding ... never a stop") |
| 205 | GitHub pacing: per-call spacing, session caps (jobs 4, lanes 1), back-off, a ledger of every call; a refusal pauses every session (+729 / +345). *flow control* | b: own machinery failed. "The civicsmith account was suspended 6 Nov 19:19Z, likely for automated bulk activity; the copy pushed its state branch 1,387 times that day" | no: "conservative defaults" | no | once | yes | **Removed.** Life 2.7 d (ended by PR 295). 17 follow-up merges in 64 h. Retired 9 Nov (PD-22): "Primary use never went above about 12% of the limit, and about 11 builder fixes in three days went into that machinery" |
| 206 | Account-wide push ceiling of 120 an hour (a limit GitHub does not publish); state pushes held too (+162 / +186). *flow control* | b: own machinery failed. coordinator's ruling PD-3 after the suspension | yes: PD-3: "the layer flow can be throttled at busy hours" | yes: PD-3: "Options weighed: no ceiling (GitHub sets none, but the suspension came anyway)" | once | yes | **Removed.** Life 17.2 h (ended by PR 237). Tripped at 121/120 the next morning and layer 10 was held ~20 min; retired after 17 h (PD-6). The study found 6 Nov's 73 pushes/h sat below the ceiling: "would not have prevented the suspension it was set against" |
| 208 | github audit (exit 1 on unexplained traffic) and a PreToolUse hook that counts and paces every connector call and refuses raw git push / gh / curl (+363 / +391). *checks records* | d: owner's words. "Bob, 6 Nov: does all GitHub traffic go through the mechanism and get tracked?" (a question) | no: latency measured only afterwards: "5 s cold" (PR 210) | no | never | yes | **Removed.** Life 2.6 d (ended by PR 295). Ten follow-up merges (210, 230, 236, 258, 273, 284, 291, 292 ...); removed after 63 h (PD-22) |
| 209 | Gate names a committed generated file that its own regenerate changes ("stale at this commit") (+83 / +111). *runs the product* | a: product defect. "a pull request that left a committed generated file stale went green (copy, 6 Nov: ... 9 failures on the tranche)" | no | no | once | partly | **Kept.** Present, untouched; softened in-PR by two rulings (staleness the base already had is a notice) |
| 216 | admit: every command the tool tells a session to run is checked against the deny list; a refused one is a missing setup condition (+90 / +105). *checks records* | b: own machinery failed. "the push check told a session to run `git commit --amend --no-edit`, which the copy's .claude/settings.json denies" | no | no | once | yes | **Loosened.** Life 2.5 d (ended by PR 296). Disagreed with setup check's own rule set (C17); made a warning after 60 h (PD-21 cut 4) |
| 219 | Sweep names each session stuck on a permission prompt (+43 / +28). *flow control* | b: own machinery failed. C15: a lane session waited from ~00:31Z on "permission: Artifact" | no | no | more | no | **Kept.** Present |
| 229 | Census flags every modules row with no ledger entry (+31 / +33). *checks records* | b: own machinery failed. C16, a gap in the census of PR 204 | no | no | more | no | **Kept.** Present |

### 7 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 238 | Record check refuses a carried owner-settings version that the owner has since replaced (+53 / +109). *trust rule* | c: reviewer / hypothetical. found by the cold review of C19 ("bypass found and fixed with failing-first test"); no incident | no | no | never | yes | **Kept.** Present |
| 239 | Internal walk required and started by the tool at every round close; a setup-check condition (+159 / +178). *runs the product* | d: owner's words. "Bob, 7 Nov: required, tool-started; exemption is Bob's word" | no | no | n.a. | yes | **Kept.** Present; reworked by PRs 269, 278 |
| 241 | Requirement marks on sub-lines count; a found-mark change may not leave a requirement met by taking its sub-line (review addition) (+33 / +85). *checks records* | b: own machinery failed. "the parser read only the id's own line, so layer publish --test R92 was refused" | no | partly: "5 findings, 3 fixed with tests ..., 2 kept as ruled/noted" | once | yes | **Kept.** Present |
| 249 | Job cap counted only from a list_sessions file; a typed --live is refused (+23 / +56). *flow control* | b: own machinery failed. "the check took the typed number as fact and refused on the cap while 15 of 20 slots were empty: 73 min of idle capacity" | no | no | once | yes | **Kept.** Present |
| 250 | GitHub budget refuses at once a request larger than a whole window (+15 / +47). *flow control* | b: own machinery failed. "github note --content 987 (PR 987's number, read as 987 connector writes ...) waited four times and refused" | no | no | once | yes | **Removed.** Life 35.9 h (ended by PR 295). Removed with the ledger after 36 h |
| 251 | Gate verifies every built generated row on every PR (PD-9) (+27 / +82). *runs the product* | a: product defect. "Copy layer merge 11 failed on the words-reads verify, a fault screens-action T53 brought in on 7 Nov ... surfaced at round close, a day late" | yes: PD-9: "The cost is the built rows' verify time on each gate (seconds today)" | no | once | yes | **Kept.** Present, untouched |
| 254 | PD-11: the internal walk runs the page checks the live walk runs (decision text only). *runs the product* | a: product defect. "the live walk of p3dev-l11 found 1,690 page faults ... could surface only on a deployed walk, after the layer had merged" | yes: "The cost is the page checks' time on each internal walk" | no | once | no | **Kept.** Decision stands; built in the product, not the tool |

### 8 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 256 | Completion round on the layer machinery; the gate checks each item's tick; a tick is refused over a tranche edit (+162 / +114). *checks records* | e: plan / ledger line. PD-12 (coordinator); the tick checks came from "9 cold-review fixes" | no | no | never | yes | **Superseded.** Life 7.8 h (ended by PR 269). Superseded by Bob's BD-R1 ("it's incorrect to designate the fixes of an internal walk as an additional layer") |
| 258 | start check prints NOT LOADED when the GitHub counting hook is absent; audit names the session; PD-13 has such sessions pipe every connector call through the hook by hand (+67 / +115). *checks records* | b: own machinery failed. "the 08:51Z audit found process3 PR 256 opened with no ledger entry" (the audit of PR 208 reporting a gap in the ledger of PR 205) | no | no | more | yes | **Removed.** Life 29.3 h (ended by PR 295). Removed after 29 h (PD-22) |
| 260 | A pending completion-item join holds the layer merge; later items re-run a landed module (PRs 260, 261) (+41 / +53). *flow control* | c: reviewer / hypothetical. PD-14; PR 261: "the merge could go ahead without it" (not reported as having happened) | partly: "the safe side, at most one more run"; PD-14: "adding items lengthens the round" | no | never | yes | **Superseded.** Life 6.5 h (ended by PR 269). Completion layers stopped opening the same day (BD-R1); code present |
| 269 | Rounds: tranche close refuses, in order, without a clean internal walk, a release and a clean release walk (+268 / +245). *runs the product* | d: owner's words. BD-R1, Bob quoted in full | no | no | n.a. | yes | **Kept.** Present |
| 273 | One repository per session: every create_session call checked; a second repository refused; a test fails on a source_url written elsewhere (+239 / +283). *checks records* | d: owner's words. BD-R2 (Bob, 8 Nov) and PD-13 | no | partly: "cold review 8 fixed, 2 left by design" | never | yes | **Kept.** Present |
| 274 | Deny-list test: the suite fails when a product's name appears in the tool or its documents (+129 / +198). *checks records* | d: owner's words. BD-R2: "Process3 is product-neutral" | no | no | never | yes | **Kept.** Present |
| 278 | Round close is the internal walk only; deploy dev refused after a flawed walk; a finding naming no module holds the release path (+219 / +220). *runs the product* | d: owner's words. Bob, 8 Nov: "The live walk will take a long time and will end up being an expensive means of identifying many of the same the flaws the internal walk found" | yes: the owner's own cost argument | no | n.a. | yes | **Kept.** Present |
| 280 | BD-R5b (decision text): the installer and site updates wait until a release walk with AI on is also clean (decision text only). *runs the product* | d: owner's words. Bob, 9 Nov: "Yes, the installer update and site update wait until a release walk with AI on is also clean." | no | no | n.a. | yes | **Kept.** Stands |
| 283 | PD-17: every new process path must ship with a rehearsal test; "the coordinator's review checks for it" (decision text only). *checks records* | b: own machinery failed. "round 2 stalled on a tool cycle (found, job start --reopen, layer open) that first showed in the product" | yes: "builders write a rehearsal with each process path; tool PRs grow by that test" | no | once | partly | **Kept.** In force; the rehearsals of PRs 284, 289, 291 each needed a follow-up commit because CI's environment differed from a session's |
| 284 | Every push is shared to the GitHub ledger before its command exits; audit reports unshared rows (+35 / +103). *checks records* | b: own machinery failed. C47: a gap in the ledger's own completeness | no | no | more | no | **Removed.** Life 10.4 h (ended by PR 295). Removed after 10 h (PD-22) |

### 9 Nov

| PR | Mechanism added (net code / test) | Trigger | Cost weighed? | "Do nothing" mentioned? | Failure seen | Fails closed | Later fate |
|---|---|---|---|---|---|---|---|
| 288 | Only a genuine layer-sync merge carrying nothing but the pin is "pin-only"; every other PR into a layer, and any unknown, is full (+56 / +186). *checks records* | b: own machinery failed. "copy PR 1092: a 54-minute full gate on a sync that carried only the pin"; the tightening half from the cold review's constructed "evil merge" | no | no | never | yes | **Kept, repaired 3+ times.** Present; reworked 7 h later by the in-place pin move (PR 298), which then produced a false layer-cover finding (PR 302) |
| 290 | Companion join: layer land refuses the dependent job until its companion has landed and its head holds that land (+157 / +253). *flow control* | b: own machinery failed. PD-19: jobs blocked because no route let a companion module join the open layer; no failure cited for the land order itself ("It is never a way around the plan") | no | no | never | yes | **Removed.** Life 3.8 h (ended by PR 294). Deadlocked layer 14 and was removed 3 h 49 min later (PD-19b): "its own suite is red until they land, and they could not land until it did" |
| 291 | The hook starts a detached process that shares each connector write to the ledger (+112 / +158). *checks records* | b: own machinery failed. C52: ledger rows waited for the next p3 command | no | partly: "cold review's 10 findings fixed or accepted with reason" | more | no | **Removed.** Life 3.3 h (ended by PR 295). Its git collided with foreground fetches in shallow clones (C53); removed after 3 h 15 min |
| 292 | Foreground marks so the detached share defers ("fail closed") while any p3 command runs (+116 / +222). *checks records* | b: own machinery failed. "C52's detached share ... ran git in the clone while a p3 command there fetched ... CI met it on git 2.56" | no | no | once | yes | **Removed.** Life 60 min (ended by PR 295). Removed 60 minutes after merge (PD-22) |

## 4. The mirror image: 32 removals and loosenings

"Age" is how long the removed thing had been merged (from the PR named in the last-but-one column). Who pushed: the owner's words quoted or cited in the message; a session acting on a measured obstruction (a false refusal, blocked work, a timed cost); or an audit by BOB or the coordinator.

| Date | PR | What was removed or loosened | Who pushed, and the stated reason | Age of the thing removed (added by PR) | Restored later? |
|---|---|---|---|---|---|
| 01 Nov | 5 | record_since: history from before the process is not checked | **Owner.** "Bob's decision, 2 Nov 2026 (option A)" after the check took 5 min 23 s against a 5-minute limit and raised 947 findings | 3.0 h (PR 1) | No; the review closed three holes |
| 02 Nov | 32 | "Build J: cut the tool back": approvals history, date floor, carry-dating, check-run trust (-710 code, -974 test) | **Audit (BOB / coordinator).** BOB's design audit of 3 Nov; no owner words in the message | 3.1 h (PR 26) | In part: approvals rules grew again in PRs 97 and 238 |
| 03 Nov | 46 | Ownership check admits a job striking marks in its own requirements file | **Session, on a measured obstruction.** "Every layer-1 job on the copy failed the ownership check when it cleared a mark; BOB worked around it" | 47.6 h (PR 3) | No |
| 03 Nov | 79 | Provider notice only when the provider's source changed; notices can be withdrawn | **Session, on a measured obstruction.** triage volume (PR 68's 56-module notice) | 4.2 h (PR 54) | Yes, in 34 minutes: PR 82 widened notices to any source change |
| 03 Nov | 92 | Tranche-into-main gate runs only suites that no job merge already gated | **Session, on a measured obstruction.** "a tranche of 30+ modules would be cancelled and main could never merge" | 2.3 d (PR 3) | No; PR 94 added binding rules to it |
| 04 Nov | 101 | Base-red: a test that also fails on the base is not the PR's failure | **Session, on a measured obstruction.** PRs blocked by failures they did not cause | 2.4 d (PR 3) | No; repaired in PRs 117, 126, 133, 134 |
| 04 Nov | 102 | Size finding waived when the head undoes it | **Session, on a measured obstruction.** "job/interface-assets ... 1,164,695 bytes, split under the cap at tip" was refused | 2.5 d (PR 1) | No |
| 04 Nov | 106 | job complete no longer requires a cost figure | **Session, on a measured obstruction.** "PR 105's required --cost-usd blocked every job complete" (measured 11:49) | 45 min (PR 105) | No |
| 04 Nov | 116 | process-record workflow runs on main and the tranche only | **Session, on a measured obstruction.** process-record "ran on every push (495 runs on the copy, 4 Nov 08:00-16:30), 403 of them on job/, bob/, p3/ and found/ branches. Nothing reads it there" | 2.8 d (PR 1) | No |
| 04 Nov | 118 | Revert of PR 112 (users' suites in the job gate) | **Owner.** "Bob, 4 Nov 17:15: ... +7.6 min median and +28.6 worst per job gate, and of 20 refuted job claims today none came from another module's failure" | 2.2 h (PR 112) | Replaced the same minute by the smoke list (PR 120), itself removed 27 h later |
| 04 Nov | 122 | job complete drops the notice test | **Session, on a measured obstruction.** "a --test notice: answered nothing and the revert check found it inert" | 18.7 h (PR 54) | No |
| 04 Nov | 126 | Receipt agrees when the gate confirms every test it excuses (also PR 134) | **Session, on a measured obstruction.** "the honest receipt disagreed" (copy PR 291) | 2.9 d (PR 3) | Moot: the receipt was removed |
| 04 Nov | 135 | Dev deploy and walk only at a round close, not at each layer | **Owner.** "(Bob, 4 Nov)" | 24.0 h (PR 59) | No |
| 04 Nov | 141 | Audit of PR 139: Bob-commit path for long holds removed, 85% target removed | **Audit (BOB / coordinator).** "Audit of PR 139" by the coordinator | 53 min (PR 139) | No |
| 04 Nov | 147 | Gate job cap 45 -> 90 minutes | **Session, on a measured obstruction.** "the shim's 45-minute job timeout cancelled control-plane PR 290 twice" | 3.3 d (PR 3) | No |
| 05 Nov | 159 | release dev only at a round close | **Owner.** "(Bob, 5 Nov)" | 39.9 h (PR 52) | No |
| 05 Nov | 177 | Six checks removed: receipt comparison, smoke list, size-cap start refusal, branch-bound, gate-check-bind, amended-receipt re-gate; revert check made advisory; hold limits dropped | **Owner.** "Bob, 5 Nov: add a check only when study and data show it is needed, and keep finding the ones that add no safety margin. The copy's audit (1,187 gate runs on 207 job PRs, 3-5 Nov) found these with no catch" | 1.7 h (PR 171) to 3.9 d (PR 3's receipt comparison); smoke list 27 h | Yes, in part, 9 h 48 min later: PR 185 restored the revert finding and the receipt comparison |
| 06 Nov | 191 | Merge train removed (-3,604 code, -5,596 test) | **Owner.** "Bob, 6 Nov: dead code and its tests go." once the shared layer branch was the only flow | 40.0 h (PR 142) | No |
| 06 Nov | 193 | R7/R8: only real interface changes reschedule users; additive ones retest by the gate alone | **Owner.** Bob's rulings R7, R8 "c" (6 Nov) | 10.3 h (PR 183) | No; classifier repaired in PRs 207, 218, 267 |
| 06 Nov | 207 | R8 classifier no longer reads a regular expression as a removed export | **Session, on a measured obstruction.** "Copy PR 696 ... Both were wrong" | 7.6 h (PR 193) | No |
| 06 Nov | 230 | setup check accepts the settings Bob applied | **Session, on a measured obstruction.** "every job start on the copy was refused by setup check ... Two rule sets for one policy disagreed" | 2.4 h (PR 216) | No |
| 07 Nov | 234 | Record check credits a merge that only carries the owner's commit | **Session, on a measured obstruction.** "the record check flagged 15 commits on layer/10" | 5.0 d (PR 16) | No; PR 238 tightened the same code the next hour |
| 07 Nov | 235 | A Cloudflare 429 or 5xx is "unknown", never "missing" | **Session, on a measured obstruction.** "the copy's pin move stopped at step 7 on deploy-token 'missing'" | 4.8 d (PR 24) | No |
| 07 Nov | 237 | Push ceiling, session caps and back-off retired: only GitHub's published limits and refusals brake | **Owner.** "make sure that this baseless overcaution NEVER happens. NEVER!" | 17.2 h (PR 206) | No |
| 07 Nov | 245 | A published job holds no job slot (PD-7) | **Audit (BOB / coordinator).** coordinator, from C25's measurement: "17 job sessions were live against the cap of 20, but 11 of them were waiting" | 2.9 d (PR 130) | No |
| 08 Nov | 287 | Record-only and pin-only PRs run a light gate | **Audit (BOB / coordinator).** coordinator (C45b); pin moves cost the product about 35 min each | 7.3 d (PR 3) | Narrowed 2 h later by PR 288 ("every other PR into a layer is full") |
| 09 Nov | 293 | PD-20: notice triage cleared by rule at the merge | **Owner.** Bob, 9 Nov: "Triaging used to be pretty instantaneous... how do we get it back to a lightweight process" | 5.4 d (PR 82) | No. The cold review's fail-closed additions were reverted 4 min later on the coordinator's word |
| 09 Nov | 294 | PD-19b: a companion no longer orders lands | **Owner.** "Bob's audit of 9 Nov asks that safeguards added without his approval be removed" plus the layer-14 deadlock | 3.8 h (PR 290) | No |
| 09 Nov | 295 | PD-22: GitHub ledger, share, audit and hook retired (-1,732 code, -1,975 test) | **Owner.** Bob: "If github usage reporting is expensive then don't do it beyond just making sure that we don't exceed published limits" | 2.7 d (PR 205) | No; PR 300 had to stop the setup check reading the retired hook as drift |
| 09 Nov | 296 | PD-21 four cuts: receipt end to end, security review trigger, setup check once per pin, admit warns | **Owner.** Bob: "Is this needed at all? If so, it must be done efficiently. If not, then cut it."; "get rid of it completely" | 3.4 d (PR 185) | No |
| 09 Nov | 298 | PD-23/24: SLB-12 sync hold removed; pin moved in place; later rounds are one layer | **Owner.** Bob: "Pin moves should be lightweight fixes that improve velocity, not ruin it" | 2.9 d (PR 198) | No; PR 302 fixed a false finding it exposed |
| 09 Nov | 299 | PD-25 direct flow: no layer branch, layer open, sync, merge gate, join or companion | **Owner.** Bob: "perhaps holding jobs in upper layers until an earlier layer closes isn't necessary" | 3.4 d (PR 183) | No |

Of these 32: the owner's words drove 14, a session acting on a measured obstruction 14, an audit 4. The owner-driven ones are the large ones: the four biggest removals (PRs 191, 295, 296, 177) took out 6,330 code lines and 9,156 test lines between them. Session-initiated loosenings were almost all narrow repairs of a false refusal that had already stopped work on the copy; I found none where a session, unprompted, removed a working check because it was not earning its cost. The nearest are PR 116 (495 workflow runs nothing read) and BOB's tool cut (PR 32).

Median age of the thing removed: 43.8 h; 9 of 32 were under five hours old. Five were restored or replaced in some form, two of them fast: notices re-widened 34 minutes after being narrowed (PR 79 → 82), and the receipt comparison restored under ten hours after the owner-driven removal (PR 177 → 185), by a session citing ledger lines.

Across all 61 loosening merges, 18 cite the owner. They cluster on 4 Nov (14 merges, mostly false-refusal repairs) and 9 Nov (8 merges, 5 citing the owner).

## 5. Synthesis

### The sample tabulated

| Question | Result in the sample of 72 |
|---|---|
| Did the message weigh any cost of the check (time, tokens, blocked work, false positives)? | Yes 9 (12%); partly 2; no 61 (85%) |
| Was "do nothing / accept the risk / remove the failing thing" mentioned? | Yes 8 (11%); partly 6 (some reviewer items set aside); no 58 (81%) |
| Had the failure it guards against been observed? | Never 32 (44%); once 22 (31%); more than once 12 (17%); not applicable (a product walk step) 6 |
| Does it fail closed? | Yes 54 (75%); partly (override flag, opt-in, bounded) 9; no (report or alarm only) 9 |
| Trigger | Own machinery failed 25 (35%); owner's words 19 (26%); plan line 14 (19%); reviewer / hypothetical 8 (11%); product defect 5 (7%); nothing 1 |
| Fate by 9 Nov | Removed 21; loosened 11; superseded 2; kept but repaired three or more times 7; kept with at most two repairs 31 |

Where cost was weighed, the figure usually came from the owner or was a number in seconds: 112 (suite minutes), 120 (a 120-second cap), 125 (review minutes recorded), 171 (0.7 s per land), 206 (PD-3), 251 and 254 (PD-9, PD-11), 278 (the owner's own argument), 283 (PD-17). Once decisions were written as records with a "Consequences: what it costs" line (from 6–7 Nov), cost statements became commoner; before that they were rare. Weighing cost did not predict survival: 5 of the 9 were still removed.

### The self-feeding loop

46 of 121 additions (38%) answer a failure of machinery the process had itself built days or hours earlier; in the sample it is 25 of 72. Adding the reviewer-constructed cases, which are also the process's own output, about half of all additions were generated by the process rather than by the product or the owner. Product defects triggered 5.

The chains are short and visible in the record:

- Provider notices (PR 54, a plan line) listed 56 modules as work → triage owed first (PR 68) → narrowed (79) → widened to any source change 34 minutes later (82) → cost rows, triage rows, withdraw rules (100, 105, 107, 109, 122, 286) → on 9 Nov the owner asks how triage stopped being "pretty instantaneous" (293).
- The receipt (PR 3) → a test demanded per struck mark (40) → records-only heads had no run to agree with, so the gate ran the whole suite to check a record (108) → honest receipts disagreed (126, 134) → amended receipts left gates red (155) → removed (177) → restored (185) → removed (296). About 20 merges.
- The account suspension → a ledger of every call (205) → a ceiling GitHub does not publish (206) → an audit of the ledger and a hook on every tool call (208) → the hook was slow (210), the audit found sessions the hook had not loaded in (257, 258), rows were shared late (284), a detached sharer was added (291), which collided with foreground git (292). Seventeen follow-up merges in 64 hours, all removed in one (295).
- Idle capacity alarm (139, 140) → miscounted (143, 144, 161) → ran falsely for over two hours (243) → pushed rows from read commands (236) → cost 1,564 git processes before every command at the copy's scale (289).

The 72 sampled mechanisms drew roughly 196 follow-up touches by later merges (some merges touch several).

### Half-life

34 of the 72 sampled checks had ended by the tip. Among those, life was: under 4 hours 9; 4–24 hours 7; 1–3 days 11; over 3 days 7; median 28.0 h.

Allowing for checks added late that had little time to be removed (a Kaplan–Meier estimate), the share still intact was 88% after 4 hours, 78% after a day, 59% after three days and about half after 5.4 days. Of the 51 sampled checks added on or before 6 Nov, 26 had ended by 9 Nov and 6 more had needed three or more repairs. This understates the churn: PD-25 says the layer machinery "is retired after" the copy's open layer merges, which would end more of the checks still counted as kept (201, 249 and 288 among them).

Line survival tells the same story more bluntly: 61% of the code lines added by check-adding merges are still attributed to them at the tip, against 65% for feature merges; for additions made on 4 and 5 Nov it is under half.

### What distinguishes the additions that held up

Taking "held up" to mean kept at the tip with at most two later repairs:

| Group | Sampled | Held up | Kept, heavily repaired | Removed, loosened or superseded |
|---|---|---|---|---|
| Runs the product (suite, build, generated-file verify, walk) | 13 | 9 (69%) | 2 | 2 (15%) |
| Trust rule (approvals, settings, forged rows, workflows) | 10 | 6 (60%) | 1 | 3 (30%) |
| Flow control (holds, caps, ordering, alarms, pacing) | 17 | 7 (41%) | 1 | 9 (53%) |
| Checks records or bookkeeping | 32 | 9 (28%) | 3 | 20 (62%) |
| | | | | |
| Trigger: product defect | 5 | 4 (80%) | 0 | 1 (20%) |
| Trigger: owner's words | 19 | 13 (68%) | 2 | 4 (21%) |
| Trigger: own machinery failed | 25 | 8 (32%) | 2 | 15 (60%) |
| Trigger: reviewer / hypothetical | 8 | 3 (38%) | 0 | 5 (62%) |
| Trigger: plan line | 14 | 3 (21%) | 3 | 8 (57%) |
| | | | | |
| Fails closed | 54 | 19 (35%) | 7 | 28 (52%) |
| Reports only, opt-in, or has an override | 18 | 12 (67%) | 0 | 6 (33%) |
| | | | | |
| Guards something never observed | 32 | 9 (28%) | 6 | 17 (53%) |
| Guards something seen once | 22 | 11 (50%) | 0 | 11 (50%) |
| Guards something seen more than once | 12 | 5 (42%) | 1 | 6 (50%) |

Four things separate the minority that proved worth having from the rest.

1. **It runs the product instead of checking a record about the work.** Nine of 13 product-running checks held up, and the two that were removed (112, 120) were removed on a measured time cost, not for being wrong. The record credits this class with the actual catches: 20 false "complete" claims refuted by the suite in one day, 63 failing walk steps, 1,690 page faults, the words-reads fault, the stale `order.mjs`. Twenty of 32 record-checking mechanisms ended; the audit of 1,187 gate runs found no catch at all for the receipt comparison, the size cap, branch binding or gate-check binding, and the security review trigger was "useful 0 of 4 times".
2. **It answers a failure seen in the product, or the owner asked for that product-facing step.** Four of five product-defect additions and 13 of 19 owner-triggered ones held up. Of 25 that answered the process's own breakage, 15 ended. The owner-triggered ones that failed were mostly where a question or a wish for less friction came back as a fail-closed gate: "does all GitHub traffic ... get tracked?" became an audit that exits 1 and a hook on every tool call (208); "Can we anticipate those conditions arising" became a refusal at layer open that would have stopped layer 11 falsely (204); "judged by rules, not sent to Bob" became five review rounds of workflow-diff allowlists (98, 192).
3. **It is narrow and costs seconds.** The clean survivors check one input at one command: a conflicted PR refused at once (85), `--pin` required (113), one built file verified (251), a stale generated file named (209), a lane's own build command (203). The failures are broad: every command (140, 208), every push (205, 206), every job start (15, 216), every importing user (82), every merge into a layer (198).
4. **When it cannot decide, it does not stop the work.** Checks that only report, are opt-in or carry an override held up twice as often as fail-closed ones (67% against 35%). Most of the false stops in the record are a fail-closed check meeting an "unknown": a Cloudflare 429 read as a missing token (235), the owner's own commit read as a forbidden settings change 15 times (234), two rule sets disagreeing so that every job start was refused (230), a companion that could not land before its dependents and vice versa (294).

One caution on the trust rules: seven of ten were kept, but five of those seven guard against something never observed (13, 16, 97, 98, 238). They are cheap and inert rather than proven. They also drew the longest review loops (PR 26 six passes, 97 and 98 five each), because a reviewer asked to find a bypass will always find another.

### Why sessions added rather than did nothing, as far as the record shows

- **The message format had no place for "no change".** Before 7 Nov a commit states a root cause and the fix. The cost of the fix and the option of leaving things alone each appear in about one sampled addition in eight. The principle that "the default answer to a finding with nothing measured behind it is no change" is in the Foundations; I found it applied in loosenings (PD-4, PD-5) and in a handful of additions that left reviewer what-ifs "as notes" (PR 34), not as a routine step.
- **Every code merge required a fresh reviewer ("rule 5"), often briefed to hunt for a bypass.** A finding became a commit ("every finding fixed"); "left as notes" appears, but rarely. The review-round limit added on 2 Nov (PR 29) was overridden by a recorded decision all 17 times it applied.
- **A false refusal was treated as a bug in the check, to be fixed by a more exact check.** The typical 7 Nov message names "the class" of failure and generalises the rule. Removing the check was proposed by a session, unprompted, almost never.
- **Ledger lines and the owner's older words were used as authority to restore.** PR 185 restored the receipt comparison that the owner's 5 Nov instruction had just removed, citing ledger lines JOB-7 and SES-12, and deleted the earlier commit's evidence note as "uncited". (The revert-check half of the same PR is attributed in the Foundations to the owner's own answer on a keep-or-drop page.)
- **The turn came from outside.** The first commit message that declines a reviewer's safeguards and says why is 27221b0 on 9 Nov: "Bob is auditing safeguards that piled up without his approval; C54 adds no new checks beyond the three clearing rules." PD-19b, the same morning, is the first decision record to end "No new check is added."

## 6. Eight case notes

### Case 1. Users' suites in the job gate (PR 112 → 118 → 120 → 177): a real defect, the right instinct, the wrong size

What happened. On 4 Nov a job merged green on its own suite and broke another module; nobody saw it "until the first development deploy served 500s". PR 112 made every job gate also run the suites of the modules that use it. It is the only early addition that weighed cost in its own message: "transitive users reach 43 suite minutes against the gate job's 45 (direct worst 29)", so it took direct users only. Two hours and nine minutes later it was reverted on the owner's word with a measurement: "+7.6 min median and +28.6 worst per job gate, and of 20 refuted job claims today none came from another module's failure". A 120-second smoke list replaced it (PR 120) and was itself removed 27 hours later for having caught nothing.

What "no change" would have cost. The one known cross-module break among roughly 200 job PRs reaching a development deploy, which is where it showed. The cost weighed was the check's worst case against the gate's time limit, not its cost per job against how often the failure occurs; the second comparison took the owner to make.

### Case 2. The required cost figure (PR 105 → 106): 45 minutes

What happened. Two jobs had recorded a cost of 0, so the cost metric read wrong. PR 105 made `job complete` refuse a missing or zero `--cost-usd` "before anything runs". The reasoning, in full, is the defect and the refusal. 45 minutes later: "A job reading its own get_session mid-turn gets no external_metadata.usage (measured 4 Nov, 11:49), so PR 105's required --cost-usd blocked every job complete."

What "no change" would have cost. Some cost rows reading zero in a report. A bookkeeping gap was answered with a refusal on the one command every job must pass, without first checking that a job could supply the number.

### Case 3. The receipt (PR 3, 1 Nov → PR 296, 9 Nov): eight days, about twenty merges, no recorded catch

What happened. The founding design had each job post a receipt of what it tested, which the gate compared with CI's own run. No failure is cited; it is a plan line ("Nothing the model says is evidence"). It then needed a test per struck mark (40), amendments (64), a full suite run on records-only heads purely so the receipt had something to agree with (108), tolerance for honest receipts that disagreed (126, 134) and a re-gate route (155). On 5 Nov an audit of 1,187 gate runs on 207 job PRs "found these with no catch" and the owner's instruction removed the comparison (177). Under ten hours later a session restored it, citing ledger lines (185). On 9 Nov the owner: "It doesn't sound necessary", then "get rid of it completely".

What "no change" would have cost. Nothing measurable: CI's run was already the truth, and the false-done count survives without it ("a red suite or revert check on that attempt's run"). This is the clearest case of a check on a record about the work standing beside a check that runs the work.

### Case 4. GitHub pacing (PRs 205, 206, 208 → 237 → 295): one external event, 17 follow-up merges

What happened. On 6 Nov the session account was suspended, "likely for automated bulk activity"; the copy had pushed its state branch 1,387 times that day, much of it the process's own bookkeeping. The response was a ledger of every call, 2-second spacing, session caps of 4, a push ceiling of 120 an hour that GitHub does not publish, an hourly audit and a hook on every tool call. PD-3 did weigh alternatives ("no ceiling (GitHub sets none, but the suspension came anyway)") and named the cost ("the layer flow can be throttled at busy hours"). The next morning the ceiling read 121/120, a layer merge was held, and the owner wrote: "make sure that this baseless overcaution NEVER happens. NEVER!" The study then found the ceiling "would not have prevented the suspension it was set against". The ledger lived two more days and drew fixes to its own completeness (C34, C47, C52, C53) before PD-22: "Primary use never went above about 12% of the limit, and about 11 builder fixes in three days went into that machinery."

What "no change" would have cost. The record itself points at the cheaper answer that was partly taken later: push less (PR 236, read commands make no pushes) and obey GitHub's own refusal. That would have cost one or two merges. The unmeasured cause was guarded with a guessed number, then the guard was guarded.

### Case 5. Branch-bound and gate-check-bind (PRs 165, 171 → 177): reviewer-constructed attacks, lives of about two hours

What happened. Two cold reviews on 5 Nov constructed ways a gate row or check could be forged: "a second PR from a job branch into a base with a workflow of its own, then closed"; "a run of another branch at the merged result's commit could stand in for it". Each became a fail-closed binding with roughly 100–200 lines of tests, confirmed by a second review as "no bypass, no fail-open". Neither attack had happened, and the only parties who could mount one were the process's own sessions. Both were removed within 2 h 19 min and 1 h 40 min by the owner-driven audit: no measured catch.

What "no change" would have cost. Nothing observed. The foundations already say a reviewer's "what if" "is one line in a report". Here it was two merges.

### Case 6. The companion land order and the reverted safeguards (PRs 290 → 294, and 293): the last additions and the first refusal to add

What happened. On 9 Nov jobs were blocked because a registry module could not join the open layer. PD-19 opened that route, which was needed, and attached an order: the dependent "lands only after its companion", with a list of refusals that "fail closed". No failure of unordered lands is cited; the stated reason is "It is never a way around the plan." Under four hours later layer 14 was deadlocked: the companion's "own suite is red until they land, and they could not land until it did". PD-19b removed the order and ends "No new check is added." The same morning PR 293 shows the change of stance inside one branch: a commit "fail closed on the cold review's holes" is reverted four minutes later, "Bob is auditing safeguards that piled up without his approval ... the cold review's asks go in the PR body for later."

What "no change" would have cost. For the land order, nothing: the layer's merge gate already checked the layer whole. The route was the fix; the ordering was added out of habit and stopped the work it was meant to release.

### Case 7. Verifying built files and matching the two walks (PR 251 / PD-9, PR 254 / PD-11): what a good addition looks like

What happened. On 7–8 Nov two product faults got through to round close: a built file's checker failed only at layer merge, "a day late", and the live walk found 1,690 page faults the internal walk never ran checks for. Each response extends an existing product-running step to where the fault entered, and each decision record states its cost in one line: "The cost is the built rows' verify time on each gate (seconds today)"; "The cost is the page checks' time on each internal walk." PR 251 is a net +27 code lines. Neither has needed a repair.

What "no change" would have cost. A second merge run per round and a deploy-then-fix cycle for every page fault, both measured once already. These are the pattern: an observed product failure, the product executed earlier, a narrow change, a cost in seconds stated up front.

### Case 8. The approvals history rules (PR 26 → 32): six review passes, 1,232 lines, 3 hours

What happened. On 2 Nov a "review follow-ups" change tightened how the owner's approvals block may change. Review A and B asked for changes; four re-reviews each found another route by which a stale block could arrive, and each produced another rule: a date floor, carry-dating of merges, eligibility by ancestry. It merged at +444 code and +788 test lines with the remaining findings "listed as known limits or owed". About three hours later BOB's "Build J: cut the tool back" replaced it with "one rule" and dropped "the history machinery, the date floor, carry-dating, the owner's-own range and eligibility". The round limit added the same evening (PR 29) was meant to stop this; it was overridden every time it applied.

What "no change" would have cost. Nothing observed: no session had tried to alter the approvals block, and branch protection plus the owner's website-commit rule already stood. The case shows the review loop as a generator of checks with no stopping rule: each pass is individually reasonable and the sum is discarded.

## Method and limits

- Merge list: first-parent history of `origin/tranche`, diffed against each merge's first parent. Scripts are in `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/` (`merges.py`, `kw.py`, `classify.py`, `survive.py`, `fate.py`, `records.py`, `tally.py`, `report.py`); per-merge messages are in `work/msgs/`.
- Fates were checked by searching the tip for each mechanism's identifiers and by listing the merges whose diffs touch them. Follow-up counts are approximate.
- "Failure seen" and "fails closed" are read from the messages; I checked diffs only for a minority. A check I mark "never observed" may have had an incident the message does not cite.
- The sample is weighted toward larger and later changes, so its rates are not exact population rates; the trigger tally in section 2 covers all additions but rests on a lighter reading for the unsampled ones.
- The record ends on 9 Nov with the direct flow just merged. Checks counted as kept had between a few hours and eight days to be removed.
