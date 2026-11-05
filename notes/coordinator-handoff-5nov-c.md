Process3 STOPPED, 5 Nov 05:44 UTC, on Bob's word: "stop all work so that I can start it up under another account". Last coordinator: session_01RAN5emGGSGfSPCvNY5yUpv (old account). Read with notes/coordinator-handoff-5nov-b.md (its rules still bind) and notes/coordinator-findings-3-4nov.md (every finding, newest at the end).

WHAT WAS STOPPED (old account)
- Scheduled tasks switched off (enabled=false, kept, not deleted): sweep trig_01CvCFiaqFxxDJJ6jxh4VVCJ (ROOT, :14 hourly), watcher trig_0112LZi3YvbYtEDcRq7BJ7rS (daily 11:17), coordinator hourly flow trig_01WqgpLR3GtHEMiD286RLWCE, review-trigger check trig_01JKhKPQfDkWQM8VP9ibm9AQ (5 Nov 19:00), merge-train report trig_01BjeJaDb1X75cQefzsAUgEe (6 Nov 04:50), survival reads trig_015zqrVaogCGYXT2uzuNAQoB (16 Nov), trig_01MRGUY7NyfRrVmqYwNywVD8 (18 Nov). The p0-row* "Reply OK" probe tasks (31 Dec) were left as they are. Scheduled tasks belong to an account: recreate those you want on the new account (prompts: get_trigger on the old account, or the findings file).
- STOP sent (priority now) to: MERGER session_01RAN5ep7bdABTc1Cuxosa4J (finish one in-flight merge, stop the train, release the lease), BOB session_01RAN5ejkzH3MteyRfhrb2cm, ROOT session_01RAN5emK1snYonbEbVPHbAP, builds train-order session_01RAN5ekTNu2YHqrY4K4kMFy (PR 146, draft) and abandoned-attempt session_01RAN5ekgxxnyTjxfAGcQHeu (PR 145), working jobs answer-envelope, screens-wizards 445, capture-requests 444, interface-assets 443 (push WIP, end). Idle job sessions were left idle. Nothing archived by the stop.

STATE AT STOP
- Copy pin: process3 86a12f1 (start-anchor, copy PR 442). Copy coordinator field still names session_01RAN5emGGSGfSPCvNY5yUpv (PR 424); probe too (PR 222). A new coordinator records its own id first (handoff b, START 1).
- Merge train trial (merge_train: true on the copy): landed 416, 175 (plane, release path), 409, 410, 412 by 05:42; 413 prepared; ~21 green queued. Restarting means ROOT starts a MERGER again (`start merger`, no clone_depth now).
- Release path left: control-plane 290 (gate cancelled twice; cause asked of BOB) and journey-check 314 (gate re-run). Then round close for the first dev release (handoff b OPEN 2).
- Draft holds (provider first) in force: 420, 431 until 396; 441 until 423; 425, 432 until 430. agent-worker 364 needs a review note (merger-5). agent-runner 394 after 364; ai-runs reopen after 391; registers F1 after 440; citation after 422/426/427/423.
- Parked on the restart/reopen loop until PR 145 merges and the pin moves: case-checker, question-explorer 346 (agent-steps 392 was worked around by unarchiving).
- Builds open: process3 PR 145 (abandoned-attempt: --reopen of never-merged work starts the next attempt branch; --restart for COMPLETE-but-red with open PR) and PR 146 (train-order: release first, shortest gate, 45-min aging, precise provider-first hold; disk_mb is disk used, not free). Both need suite, reviews, merge, then a pin move (`pin move` from process3 prints the short session).
- Design study for Bob: notes/train-throughput-study.md on study/train-throughput (ebfae95). Recommends F: speculative parallel gates k=4 + ordering + plane gate cuts. BOB ASKED, NO ANSWER: may the train gate up to 4 PRs in parallel on speculative bases (train/spec-* branches kept)?
- Ruled to BOB, not yet reported done: plane E1 (base-red load tests to regression tier, by the right route) and E2 (test concurrency, measured).
- Gap noted: `job start --ready` does not list base-red reopens, restarts or over-cap splits; BOB starts them by hand.
- Still Bob's: the 8,402-sentence words queue (words-unreviewed.json); lanes after he reads LAN-1..LAN-10.

TO RESTART ON THE NEW ACCOUNT
1. Bob adds the new account where the standing approvals need it (CLAUDE.md names "the Claude account the acting session itself runs under"; GitHub and Cloudflare access as before).
2. Start a coordinator from start/coordinator-4nov; it reads this file, then handoff b.
3. Coordinator records its id on copy and probe tranches; ROOT, BOB, MERGER and watcher are started fresh on the new account by the process's own start commands; recreate the scheduled tasks above.
4. Archive the old account's sessions once the new ones run (old sessions cannot be messaged from another account).

STOP REPLIES (05:44-05:45)
- build/train-order stopped: tip 4015f05, 792/792; PR 146 draft. Left: cut the disk part to the rename (disk_used_mb + disk_free_mb), independent review, confirming review, suite, ready, merge.
- build/abandoned-attempt stopped: tip 5aa3eaf (784/784 on 513595c; last commit a help comment); PR 145 unmerged, ci check was running. Left: `merge 145 --plain --reviewed "..." --rounds 1` once green, then pin move.
- BOB stopped, nothing half done. 441 back to draft. CONTROL-PLANE 290 CAUSE: process-gate.yml:30 timeout-minutes: 45 cuts the gate (runs 1619, 1671; last green took 40): raise the timeout or shorten the suite by a workflow PR before 290 can merge (release path). answer-envelope restarted (session_01RAN5ejpY66LXEUm7cFwFEi, PR 386). Plain PRs 338, 368 brought up to tranche, need a fresh gate, unmerged. plane attempt 4 not started: remote job/plane has 4cc71be1ff (train's merged-result push) not on tranche (likely the reopen loop; check after PR 145). question-explorer 346 reopen refused while its PR is open. agent-worker 364 review note still owed. Live job sessions 13.
- Old BOB session_01RAN5eomXNvM23EMwtLVBHG still showed working: STOP sent.
