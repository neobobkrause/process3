<!-- Snapshot of the claude.ai document https://claude.ai/artifact/8yMEUaEdwxSXcA8fcZYFnh, exported 2026-11-07T05:45Z for the account switch. The live document stays the working copy until Bob says otherwise. -->

# Ledger map

*Recomposed 5 Nov 2026 from Bob's export of his original; unchanged. No losses were found in the export.*

*Proposed changes awaiting Bob are kept apart, on their own tab: Proposed changes (awaiting Bob)*

Every kept or modified Ledger line, and where it is held: built (named code), a Phase row, a later gate, a nudge (text only, exposed by status), a measurement, or the design itself. Read from the tool at process3 tranche 237c02a and the Build Plan on 3 Nov. On 3 Nov 17 lines had no home or were not built where the plan assumed; each now has a place in a phase, listed first, and stays marked **Gap** below (GAP-9).

## Gaps

| Line | Gap | Where it goes |
| --- | --- | --- |
| ARC-1, ARC-3, ARC-4 | The tool's gate runs no architecture, text-key or scoped checks; the module suite may hold some | Phase 2: read once which checks the copy's suites run; build the missing ones before layer 1's jobs merge |
| JOB-8, GAT-4 | No check that a job commits no generated artifact, and no regeneration step, though the CI table lists one; Phase 2 now runs a layer's jobs at once, which is when they conflict | Phase 2 |
| P18 | The pipeline is a nudge in BOB's prompt only | As the earlier process version held it: the cycle itself (all of a layer's jobs at once, each close straight into the next open, Phase 3) and BOB's preparation in order of value (Phase 2 prompt); BOB's idle time measured before anything more. A listed set of preparation acts with Stop guards was removed by Bob in an earlier product as too inefficient (K5787) |
| P9, PLN-3 | Status prints no reports to route | Phase 2, in the status row |
| P7 | Nothing shows each struck requirement has a test; the mechanical pass has no procedure | The review brief asks the reviewer to check each struck mark has a test (PD-21: no receipt); mechanical pass a later gate |
| REC-8, P20 | The reading audit has no build | Later gate |
| TXT-1 | The product's CLAUDE.md holds only the approvals; no pin or fetch line | Phase 3, with the shims |
| TXT-3, TXT-5 | No rulebooks and no skill written | Phase 3, with the shims, as Text to write says |
| SES-16 | Measured on the first tranche, but nothing runs a stateless wake to compare | Phase 3: one stateless BOB wake, tokens counted against a handover row |
| SHM-5 | Start check runs no product setup script | Phase 3, with the shims |
| MNT-9 | Not in Phase 3's gate | Phase 3 gate |

## Platform facts

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| PLT-1 | Dated table of measured behaviours | The platform table on the probe | Phase 0, met |
| PLT-2 | Depend only on acts the approvals cover and measured to pass; archive and task deletion are housekeeping (restated by Bob, 3 Nov) | Permission physics; archive and task acts are housekeeping | Built |
| PLT-4 | Long steps run in CI | The gate workflow | Built |
| PLT-5 | No session starts its own successor; depth at most 3 (restated by Bob, 3 Nov); ROOT (depth 0, Bob's app) starts BOB, the watcher and the coordinator, and "whoever starts ROOT starts the watcher" is read as ROOT starting it (coordinator, 6 Nov) | start | Built |
| PLT-6 | A task is never needed for correctness | Sweep and watcher design | Built |
| PLT-7 | One repository; process as a pinned clone | The .process submodule | Built |
| PLT-8 | Privileged GitHub acts by workflows | Privileged workflow | Phase 3 |
| PLT-9 | Grants gathered once, checked at open | setup check; grants at tranche open | Built; Phase 3 |
| PLT-10 | Platform status is not work state | status reads git | Built |
| PLT-3 | Replaced by GAP-6 |  |  |

## Hooks and enforcement

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| ENF-1 | A handful of command hooks at most | No hooks today; drift check with the shims | Built; Phase 3 |
| ENF-2 | No model judge on messages | The design | Design |
| ENF-3 | Nothing holds a turn | The design | Design |
| ENF-6 | Early stops caught without /goal | status and the sweep | Built |
| ENF-7 | Every hard rule has a blocked exit | block | Built |

## The record

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| REC-1 | Durable on the tranche, transient on a state branch | process-state branch; home measured | Built; Measure |
| REC-2 | One writer per file | Per-participant state files | Nudge |
| REC-3 | Status reads the whole state | status | Built |
| REC-4 | Record writes cost no gate run | Gate's record-only pass | Built |
| REC-5 | Recorded from the result | The tool | Built |
| REC-6 | Address read from git | address, send | Built |
| REC-7 | A halted build is readable | status; five handovers 3 Nov | Built |
| REC-8 | Reads are a matter of record | Start prints the reading set; no audit | **Gap** |
| REC-9 | JSON ledger, one mutable field | ledger check | Built; Measure |
| REC-10 | Size and transient check; prune | record check; prune | Built; Phase 3 |
| REC-11 | Decision records; process technical decisions are the coordinator's and product decisions BOB's, each a decision record, reported; only what P17 makes Bob's comes to him, with options and context (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-5) | Template file | Later gate |

## Architecture and checks

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| ARC-1 | Uses match imports | Not in the tool's gate | **Gap** |
| ARC-2 | One owner module per file | gate and merge | Built |
| ARC-3 | Tests assert on text keys | Not in the tool's gate | **Gap** |
| ARC-4 | Scoped checks; layer checks; whole product at release | Scoped: not in the tool; layer and release workflows | **Gap**; Phase 3 |
| ARC-5 | Machine-readable findings | gate | Built |

## Requirements

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| REQ-1 | Public and private parts, permanent ids | The product's requirement files | Built (product) |
| REQ-2 | Behaviour at the interface | BOB writing requirements | Nudge |
| REQ-3 | Scale figures are measurements | START and review brief | Nudge |
| REQ-4 | Marks struck only by their job | ARC-2's ownership | Built |
| REQ-5 | A meaning change goes to Bob only by DES 1 | BOB's prompt | Nudge |
| REQ-6 | Cap triggers a split, never a refusal | Requirements cap | Phase 3; Measure |
| REQ-7 | Rulings deleted once absorbed | Template file | Later gate |

## Planning

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| PLN-1 | Layers in rounds in tranches | merge, tranche open and tranche close | Phase 3 |
| PLN-2 | Plan from the remaining work | status next work | Phase 2 |
| PLN-3 | Found work placed at once | Reports to route; walk findings | **Gap** (Phase 2) |
| PLN-4 | Completion round's own file |  | Phase 3 |
| PLN-5 | Pause and resume | The plan field in process/config.json, read by the sweep; the 3 Nov halt switched tasks off by hand | Built (sweep); status prints it in Phase 2 |
| PLN-6 | Tranche report | release; tranche close | Phase 3 |
| PLN-7 | Nothing names a product | Config-driven tool | Built |

## Jobs

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| JOB-1 | A job is one module's work in the open layer: branch cut from layer/\<n>, green publishes by small PR, report a comment, complete at its last green publish with no reschedule outstanding (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-2) | job start; publish | To build; trial on layer 7 (SLB-10) |
| JOB-2 | START names only tool acts | START generator | Built |
| JOB-3 | Take in earlier work | job start | Phase 3 |
| JOB-4 | Never restarted for a process reason | Pin by pull request; BOB's prompt | Nudge; Built |
| JOB-5 | Fast local checks; gate in CI; never a full suite in the session (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-7) | job complete | Built |
| JOB-6 | Restart a dead job | job start restarts from the branch and pull request | Phase 2 |
| JOB-7 | CI's own run of the job's tests is the evidence; no receipt (Bob, 9 Nov, PD-21) | gate | Built |
| JOB-8 | No generated artifact committed | Nothing | **Gap** (Phase 2) |
| JOB-9 | Turn ends COMPLETE or on a named wait | status and the sweep | Nudge; Built |
| JOB-10 | Reading set and tokens per attempt | metrics | Built |
| JOB-12 | Revert check: inert tests fail the gate; a refactor whose tests rightly pass before and after takes a reviewed exemption recorded on its PR (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-1) | gate | Built |
| JOB-13 | Mutation sampling | Nightly workflow | After the first tranche |
| JOB-14 | Fresh session after two failed corrections | Review-round limit in merge; brief rule | Built; Nudge |
| JOB-11 | Replaced by GAP-2 |  |  |

## The gate

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| GAT-1 | Gate in CI once per publish PR tip, never in a session (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-3) | Gate workflow | To build; trial on layer 7 (SLB-10) |
| GAT-2 | Module suite only | gate | Built |
| GAT-3 | A provider's interface change (exports, Public / Provides text, or a test of a Provides requirement) reschedules every user in the open layer; a running job halts and restarts; a run started before the provider's newest publish never counts; higher layers get an unmet requirement (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-6) | Provider-change route at publish | Phase 3; trial on layer 7 (SLB-10) |
| GAT-4 | Regenerate artifacts, verify changed | Nothing | **Gap** (Phase 2) |
| GAT-5 | Every lock file; product's Node | gate, test | Built |
| GAT-6 | Triggered by the module's paths; a green tip skips the re-gate only when the tranche moved by record paths; the wider skips go with the merge train (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-3) | Gate workflow | Built |
| GAT-7 | Full regression at release | Release workflow | Phase 3 |
| GAT-8 | No re-gate on the merged result: a publish merges into the layer branch on its own green gate; the layer merges into the tranche once every job is complete and the layer's checks pass (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-4) | merge; layer close | To build; trial on layer 7 (SLB-10) |

## Integration and review

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| INT-1 | Done means merged, at the layer: a module at its last green publish with no reschedule outstanding, a layer when merged into the tranche, a tranche when merged into main by one PR; main never moves while a tranche runs (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-5) | publish; layer close; tranche close | Phase 3; trial on layer 7 (SLB-10) |
| INT-2 | BOB decides on a reviewer | merge --reviewed or --no-review | Built |
| INT-4 | Layer closes when every job is complete and the layer's checks pass; module tests do not run again at close; the next layer starts at once (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-7) | layer close dispatches the layer checks | Phase 3; trial on layer 7 (SLB-10) |
| INT-5 | Nothing waits on an archive | Handover design | Built |
| INT-7 | One-pass review | review brief | Built |
| INT-3 | Replaced by GAP-10 |  |  |

## Sessions and roles

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| SES-1 | ROOT, BOB, jobs, workers; BOB, one per product, starts every job from the tool's list of startable jobs, and starts lanes (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-8); under the layer branch no MERGER runs and nothing else starts jobs; its code is removed if the trial keeps the layer branch (SLB-11; coordinator, 6 Nov) | start, roles | Built; no-MERGER roles on the layer 7 trial (SLB-10, SLB-11) |
| SES-2 | Two-phase handover | handover | Built |
| SES-3 | Tool-written handoff | handoff | Built |
| SES-4 | REFRESH printed by status | status | Built |
| SES-5 | Reading set printed | status, job start | Built |
| SES-6 | Budgets are fractions; overrun reported | REFRESH percent; size alarms | Built; Nudge |
| SES-7 | Summaries optional | The design | Design |
| SES-8 | Model, effort, mode table | start | Built |
| SES-9 | Usage read or named unmeasured | metrics | Built |
| SES-10 | Workers return receipts | Worker briefs | Nudge |
| SES-11 | Overhead per tranche | Overhead share per job and layer, then the tranche report; no target (Bob, 3 Nov) | Phase 2; Phase 3 |
| SES-12 | False-done rate by independent re-verification and cost per surviving job, counted per job (one module's work in one layer) (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-9) | metrics; survival read 16 Nov | To build; trial on layer 7 (SLB-10) |
| SES-13 | Outliving a parent is ordinary | The design | Design |
| SES-14 | Lanes; a process triage lane and a product triage lane bring Bob options with context before a response is chosen; a chosen short-term response reaches later sessions in their starting prompt with its end condition (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-8) | UX lane | Phase 3 |
| SES-15 | BOB routes | Routing share measured | Phase 2; Measure |
| SES-16 | Stateless BOB, measured | No comparison arm | **Gap** (Phase 3) |
| SES-17 | Urgency as a nudge | BOB's prompt | Phase 2 |
| SES-18 | Workers for three uses only | Worker briefs | Nudge |
| SES-19 | A lane is the load-bearing source of truth in its area, qualified before it decides anything (Bob, 6 Nov) | lane start, lane ask (qualification record) | Built (build/lane-qualification) |
| SES-20 | First run qualifies: workers research the canon, the existing code and best practice of the lane's area (Bob, 6 Nov) | lane start's QUALIFICATION brief; lane ask refuses until it lands | Built (build/lane-qualification) |
| SES-21 | A lane-specific research area in the product repo, read first, drawn from and evolved by every later session (Bob, 6 Nov) | lanes\[\].research (default \<dir>-research), counted as the lane's folder by the gate | Built (build/lane-qualification) |
| SES-22 | Research continues as the lane works; lane ask workers read the research area first (Bob, 6 Nov) | lane start and lane ask briefs; job START of a lane's module | Built; Nudge for keeping it current |
| SES-23 | Lanes cut by design area; for the first product, investigation design and publication design beside UX (Bob, 6 Nov) | The product's lanes in process/config.json, set by BOB | Design; BOB adds the lanes after the pin |

## Instruction files and rules

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| TXT-1 | CLAUDE.md under thirty lines, pin and fetch | Approvals only today | **Gap** (Phase 3) |
| TXT-2 | Per-line test | Review at each gate | Nudge |
| TXT-3 | Rulebooks, ten rules each; temporary measures live in the triage register with their end condition, never as rulebook lines (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-9) | Not written | **Gap** (Phase 3) |
| TXT-4 | Trimmed principles per role | Text; measured | Phase 3; Measure |
| TXT-5 | Each role prompt names its rulebook in the pin (restated by BOB 4 Nov: a skill cannot be chosen by role without a hook, ENF-1; built, process3 PR 58) | Not written | **Gap** (Phase 3) |
| TXT-6 | Every rule cites its source; Bob is cited only where he said it, quoted with its date, and other decisions name their maker (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-4) | Rule 2; this map | Built (text) |
| TXT-7 | Plain words, named audience | Every text | Nudge |

## Messages

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| MSG-1 | Git carries state; a message wakes | send | Built |
| MSG-2 | BOB's address is instruction, else data | Role prompts | Built |
| MSG-3 | Push-then-send, numbered | send | Built |
| MSG-4 | One plain message to Bob per turn | Every role | Nudge |
| MSG-5 | Flaw route by state branch and main | flaw | Later gate |
| MSG-6 | Undelivered recorded and listed | send, status | Built |

## Maintenance and certification

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| MNT-1 | The thin process under itself |  | Phase 4 |
| MNT-3 | Built with the last release |  | Phase 4 |
| MNT-4 | Pinned per tranche, verified at start | start check; merge | Built |
| MNT-5 | Blocking fix by a pin move | Plain pull request; merge holds pins to forward moves onto process3 tranche or main commits | Built |
| MNT-6 | Non-blocking fix waits; during Process3's own first build, process fixes may land while a product's tranche runs, each recorded against the Ledger line it serves (GAP-9), until the first certified release (Bob's answer, Keep and Drop page, 6 Nov 2026, AUD-6) | Rule 6 | Built (text) |
| MNT-7 | Flaw reports | flaw | Later gate |
| MNT-8 | Slice shadow, then the live tranche |  | Phase 3 |
| MNT-9 | Shadow flaws fixed, run repeated | Not in the gate | **Gap** (Phase 3) |
| MNT-10 | Release names rows and sizes | Release note | Phase 3 |
| MNT-11 | Ablation per model |  | Phase 4 |

## What a product receives

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| SHM-1 | CLAUDE.md, skill, settings, gate, prune; drift check | shims | Phase 3 |
| SHM-2 | Shims regenerated on the runner | shims | Phase 3 |
| SHM-3 | Onboarding skeleton and size measure | setup check; onboard | Built; Phase 3 |
| SHM-4 | Mid-tranche conversion | onboard | Phase 3 |
| SHM-5 | Product setup script at first command | Not run | **Gap** (Phase 3) |

## Principles

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| P1 | Purpose: correct, quick, cheap, surviving | Rule 1; the health metrics | Built (text) |
| P2 | The build state tells BOB what to do | status next acts | Phase 2 |
| P3 | A serious process flaw pauses the product | Rule 6; pin by pull request | Built (text) |
| P4 | Total order, uses checked | As ARC-1 | **Gap** |
| P5 | Requirements' four-part shape, concise | BOB writing; cap | Nudge; Phase 3 |
| P6 | A module fits one reading | Reading-set sizes; cap | Phase 3 |
| P7 | Every requirement tested; mechanical pass | Revert check only | **Gap** (Phase 2; later gate) |
| P8 | One job per module | job start refuses a second | Built |
| P9 | Reports routed by BOB | Not in status | **Gap** (Phase 2) |
| P10 | Layer at a time, all its jobs at once | status next work; layer close | Phase 2; Phase 3 |
| P11 | Tests follow the architecture | gate; release | Built; Phase 3 |
| P12 | Done means merged; close merges main in | merge; tranche close | Built; Phase 3 |
| P13 | Sessions short; refresh | REFRESH | Built |
| P17 | Bob defines, BOB decides | Walk-through; every role | Design |
| P18 | Pipeline: prepare the next stage | The cycle (close into open); BOB's prompt in value order; idle time measured | **Phase 2; Phase 3** |
| P19 | Never idle; never stop for Bob | status, sweep wake, BOB's prompt | Phase 2 |
| P20 | Act on what was read in full | Reading audit not built | **Gap** (Later gate) |
| P21 | Bob's questions become designs; lanes | Walk-through; UX lane | Built (practice); Phase 3 |
| P22 | Release deployed and walked | Deploy and walk; release | Phase 2; Phase 3 |
| P23 | The repository holds only what is needed | record check | Built |
| P24 | Recorded state ends itself: a checkable end condition, ended by the tool, stale state cleared by the process (Bob, 6 Nov) | ends.mjs conditions; expire.mjs at every write, layer open and the sweep; status reports stale; hold refuses words alone | Built (R13, build/self-expiring-records) |
| P25 | Refusals and inconsistencies are anticipated and reported ahead of the act (Bob, 6 Nov) | census.mjs census and preflight: setup check, status --role bob gaps block, layer open, the gate's census finding | Built (R15, build/preflight) |
| P26 | The account switch is rehearsed and preflighted before it's needed (Bob, 6 Nov) | switch.mjs: switch out --dry-run, switch in --preflight and the session checks, the manifest's layers, lanes, asks and old sessions, switch/retired.json read by ends.mjs session\_gone; rulebooks/account-switch.md; notes/account-switch-canary.md | Built (R16, build/switch-ready) |
| P27 | Process3 conforms to GitHub's published limits, using up to 80–90% of them, and obeys rate-limit responses (Bob, 6 Nov) | pace.mjs: GITHUB\_LIMITS, pacing.target, ghTurn's windows and primary check, ghAfter's pause and stop, budgetGate on job and lane starts, github budget; ghshare.mjs: github/pause.json and github/use/ on the state branch; github resume | Built (R17, build/github-pacing; unpushed while GitHub is suspended) |

## Gaps found 3 Nov

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| GAP-1 | Runs with no one watching | Phase 2's gate | Phase 2 |
| GAP-2 | Cost per attempt is an alarm | Sweep row | Phase 2 |
| GAP-3 | Nothing without a failure or Bob's word | Rule 2 | Built (text) |
| GAP-4 | Status names next acts | status | Phase 2 |
| GAP-5 | Events wake BOB | Subscribe step; sweep wake | Built; Phase 2 |
| GAP-6 | Approvals are the one policy | record check; start check | Built |
| GAP-7 | Public release waits for Bob | Production environment | Phase 3 |
| GAP-8 | Move accounts on one request | A tested page of steps | Later gate |
| GAP-9 | The three documents agree | This map | Built (text) |
| GAP-10 | Merge on green without Bob | merge | Built |
| GAP-11 | Measure once by default | Rule 3 | Built (text) |
| GAP-12 | BOB's idle time and Bob's minutes reported | Sweep row; tranche report | Phase 2; Phase 3 |

## Shared Layer Branch, 6 Nov

New lines from Bob's answers on the Keep and Drop page, 6 Nov 2026; the lines they modify are updated in their own tables above.

| Line | Requires | Held by | Where |
| --- | --- | --- | --- |
| SLB-1 | Adopt the Shared Layer Branch: one branch per open layer; a job publishes onto it only when its own tests pass; a provider's interface change reschedules its users; the layer merges into the tranche once every job is complete and the layer's checks pass (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-1) | Design note; publish; layer close | To build; trial on layer 7 (SLB-10) |
| SLB-10 | Trial on the first product's layer 7 after layer 6 closes and product work pauses; measures and stop rule as on the Keep and Drop page (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-10) | Trial measurements | Layer 7 |
| SLB-11 | If the trial keeps the layer branch, remove the merge train, the MERGER, the parallel window, provider holds, the in-flight hold, the plain queue and the fixes built for them (Bob's answer, Keep and Drop page, 6 Nov 2026, SLB-11) | process3 pull requests | After the trial |
| SLB-12 | Every pin move made while a layer is open is followed by layer sync \<n> for that layer, before any job in it lands; a pin move does not reach an open layer branch, because the gate runs the base's own tool (Bob, 6 Nov 2026) | layer sync; layer jobs and status lead with it while the pins differ; layer merge refuses until in sync | To build: process3 PR 198 (R11); rulebooks/layer-branch.md step 2 |
