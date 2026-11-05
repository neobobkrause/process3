Process3 coordinator handoff, 5 Nov (e), ~07:25 UTC, from session_018BhcecFLE3NZJnVDC127ku (Bob's account "Sparky", GitHub as civicsmith). Bob is the owner; his words are instructions. Read with notes/coordinator-handoff-5nov-b.md (rules, Bob's words), the speed rules in notes/coordinator-handoff-5nov.md, and notes/coordinator-findings-3-4nov.md from "# 5 Nov, coordinator session_018BhcecFLE3NZJnVDC127ku" down.

WHY THIS HANDOFF
- Bob saw permission dialogs all through this session. Cause, as far as known: this coordinator had three repositories attached (process3, the copy, the probe) and did outward acts itself (session starts, task creates and deletes, pushes and merges into the copy and the probe). Auto mode stops on those. A one-repository session also reads the repository's committed .claude/settings.json; a three-repository session does not.
- So: the new coordinator runs with ONLY process3 attached. It does not attach the copy or the probe. Copy and probe acts go through the roles (BOB merges and starts jobs, ROOT starts roles) and through short sessions started on that repository (coordinator id, pin moves), as the process was built. Bob was offered, and has not yet answered, allow rules in process3's .claude/settings.json for the coordinator's routine acts (his standing approvals forbid sessions to change permission settings without him).
- Ask Bob which session titles show dialogs. If BOB, the MERGER or job sessions show them too, the cause is wider: look before changing anything.

START, in order
1. Record your id as `coordinator` in process/config.json on the copy's and the probe's tranche, each by a SHORT SESSION started on that repository (source_url the repo, clone_depth 1, from tranche): its prompt edits the one field on a branch p3/coordinator-<x>, opens a PR into tranche, runs `node .process/tool/p3.mjs merge <pr> --plain --no-review "one-field coordinator id change"` and reports back. Copy PR 448 and probe PR 224 are the pattern.
2. Move my scheduled tasks to yourself (list_triggers; create the same prompt bound to you; delete mine): hourly flow trig_01K1C44kP7orMgaFwUEeXLoM (:51), review-trigger check trig_01TYsmhr38k7MdTote3hm7Z7 (5 Nov 19:00), merge-train report trig_0117LM8PADy3UZh1V162srvV (6 Nov 04:50), survival reads trig_01MX1uVwo4NPdwNFNRHrRMYk (16 Nov 17:00), trig_01VhfvTC7zXsJdwAQoSZdxBr (18 Nov 17:00). Delete my check-in trig_01AkGDwHoJeV1jKYJoJomeCg if it has not fired.
3. Tell ROOT, BOB and the MERGER your id once config names you. Archive me.

ROLES LIVE (all on this account, all from the restart)
- ROOT session_018BhcefwaVtx4V7dYW63amA (sweep trig_01Hvg2iQ6kzaZUvoF3LJNYww, :55).
- BOB session_018BhcecdJKXpFycvRBgqmS5.
- MERGER session_018BhceeZ4P42p7PhwvxNiVm. Clone unshallowed by hand 07:18; train restarts ~07:27:30 when its own lease lapses (see DEFECTS).
- Watcher session_018BhceeMjF6AwKvAHJwkQ1L (daily trig_01AvKAsQ3dLkB3pryqQ6C3Ji, 11:17).

STATE AT HANDOFF
- process3 tranche: 7ce6425 (PRs 145, 147, 146, and 148 merged 07:24: the train unshallows a shallow clone at start; 804/804; one cold review). Copy pin is still c4f2cae: move it to 7ce6425 with the next batch (this MERGER is already unshallowed, so it is not urgent).
- Copy: tranche e234b71, pin c4f2cae (PR 449), process-gate.yml job cap 90. Coordinator id in config names me (PR 448); probe too (PR 224).
- Live jobs at 07:19: 1/20 (control-plane restart on PR 290, release path). BOB is making the other replacement starts one at a time: journey-check 314, answer-envelope 386, interface-assets 443, member-roster 446, screens-daily 439, screens-settings 437, question-explorer 346, capture-requests, screens-wizards, case-checker (--reopen), plane (--fresh-branch, ruled 07:19).
- Release path: control-plane 290 and journey-check 314 need a gate on a branch that took in the tranche (a pull_request gate runs the head's process-gate.yml). Then round close for the first dev release (handoff b OPEN 2).
- Merge train: no land since 06:32 (Bob's stop, then the restart, then the shallow-clone stall). ~20 green job PRs queued. 406 noted by BOB, mergeable.
- Holds in force (BOB's draft marks; provider first): 420, 431 until 396; 441 until 423; 425, 432 until 430; 394 after 364. With the clone unshallowed the train's own provider hold works (429, 398 held on 422; 427 on 398); BOB drops a manual draft when the train holds it.
- Still Bob's: train study option C (speculative parallel gates, asked, no answer); words queue; lanes after LAN-1..10; allow rules (above).

DEFECTS FOUND TODAY (process3; none built except PR 148)
1. Role start check fails on any tranche move during the start (I caused it twice). Start roles only after the last queued tranche merge lands; a fix would re-anchor roles as job start does.
2. BOB counts live sessions by paging the account's whole history (1,843 sessions, ~5 min per wake).
3. BOB ran git in parallel in one shallow clone (review subagent deepen + notice triage + job start): "shallow file has changed", stale shallow.lock, no job started. Rulebook or tool: one git user per clone; reviewers in their own clones.
4. Train in a shallow clone: hold reads fail open and burn minutes. Fixed by PR 148 once pinned.
5. A killed train cannot retake its own session's lease until it lapses (~9 min lost 07:18-07:27).
6. After a train merge, the module's job branch holds the train's merged-result push, off the tranche; the next tranche-cut start cannot push (plane). Needs --fresh-branch by hand today.
7. Account switch: tasks, sessions and addresses are per account; ~40 reports to old sessions sit unanswered in status. A switch runbook would list: attach civicsmith first, setup check, then ids, roles, tasks, restarts.

MY MISTAKES TODAY (with cost)
- Started ROOT and the watcher before my own id merge moved the tranche, then BOB and the MERGER before my pin move did: four failed start checks, a few minutes each.
- Ran unchanged tests once after a failed edit chain (caught before push).
- Did copy and probe acts from a three-repository session, which raised Bob's permission dialogs.
