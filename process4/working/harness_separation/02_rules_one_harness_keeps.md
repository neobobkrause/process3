# Rules that only one harness can keep as written

Length: 78 lines. Last section: "7. The most important things not known".

Written by a Claude worker on 18 Nov 2026 for the session continuing the Process4 design. A worker's findings, not Bob's words. Nothing here reopens a rule. Each entry says only which harness can keep the rule as it is worded today, and what is not known.

"Design state" is `working/design_state_18nov.md`. "Sixth draft" is `definition/process4_definition_v6.md`; bare numbers in brackets are its line numbers. The other short names are those listed in `01_neutral_terms.md`.

## 1. Rules that rest on Claude Code's approvals, forbidden commands and permission checker

Codex has no shown carrier for any of the three (see `01_neutral_terms.md`). So each rule below can be kept as written on Claude Code only. What Codex would use in its place is unknown.

1. "His approvals and the list of forbidden commands are protected by the permission checker alone." (design state, section 9)
2. "Bob rewords his approvals in the process's repository to say a process change is merged only on his word given at PROCESS." (design state, section 9) On Claude Code this is an edit to CLAUDE.md. Where the reworded text would live on Codex, and whether Codex would act on it, is unknown.
3. Bob commits his approvals to CLAUDE.md and the deny list to settings.json, on GitHub's website (183, 406, 410). The recorded line "CLAUDE.md and settings.json continue to serve the purpose they did in Process3" (155) names two Claude Code files.
4. "Every session runs in Auto mode" (404).
5. The deny list makes the process's tool "each session's only door to GitHub" (410). On Codex the trial's controller "may be bypassable by inherited raw tools" (register, line 42).
6. A session must be started "with one repository only, because a session that holds more loads no deny list" (414). This is a measured fact about Claude Code. Whether it means anything on Codex is unknown.
7. "Consent merely quoted in a session's starting text was declined 11 times out of 11" (406). Measured on Claude Code. Unknown on Codex.
8. The working rules that exist because of the checker: "One judged act per command. A refused act is never reworded or handed to another session. Three refusals in a row stop a session" (420). The design state's question to Bob at each new model version asks about "working rules that exist because of the permission checker" (section 10). All of this is Claude Code's.
9. A long-lived session "compares the approvals it loaded with the newest, and on a difference does nothing", and an edit to the approvals is "one act together with restarting ROOT" (408). On Codex the public source says an edited instruction file is not reloaded by a running session (instruction notes, line 8). That is documented, not measured on a hosted session, and says nothing about approvals.

Bob's own view of how much of this Codex needs is on record: "I see role-specific permission enforcement as important and useful, but not essential" (Bob on Codex, line 41). The trial's register adds that restrictions on "public releases, accounts, secrets, grants, repository settings, protected refs and production resources" should stay strong (register, line 42). That second sentence is an assistant's, not Bob's.

## 2. Rules that rest on separate sessions

On Claude Code each role is a session of its own. On Codex, as tested, each role is a child inside one chat that Bob opened. A separate session could not be started from a hosted session (feasibility, line 3).

1. "ROOT is the first session. You start it with a plain prompt on the product's repository." (188) and "Bob starts ROOT, and ROOT rebuilds everything from the shared state and the repository" (design state, section 8). On Codex, Bob starts the owner console, and ROOT is a child of it (trial notes, line 26). The trial's proposal for this layout was "awaiting owner decision" (trial notes, line 28); the register says Bob approved it (register, line 22); the five files of Bob's words on Codex hold no words of his approving it.
2. "Sessions are at most three levels deep" (239). The Codex layout has four levels, because the owner console sits above ROOT. Whether a job on Codex can start a helper of its own, a fifth level, is unknown.
3. "The watcher is kept, and ROOT starts it." (design state, section 8) In the Codex layout the watcher is a "sibling" of ROOT, so the console starts it. Replacement there "was shown only with console active and otherwise needs a safety wake" (trial notes, line 27). A watcher's takeover on Codex was not shown (study, line 67).
4. "The coordinator is Bob's front door. He may watch and sometimes speak to ARCH and to lanes ... and with PROCESS directly." (design state, section 4) On Claude Code Bob opens the session. On Codex every word went through the console; there was "not a separate interactive composer for every child" (register, line 26). Bob's words for Codex: "interacting with lanes is crucial" and "these are truly and fully interactive sessions" (Bob on Codex, lines 51 and 53). Whether Codex can give him that is unknown.
5. A second chat opened by Bob could not reach roles started under the first: "live agent path ... not found" (cross-tree result, line 10). So on Codex, "one way back: Bob starts ROOT" starts a new tree that cannot message the old one. What then stops the old tree's children is unknown. That last sentence is my reading.
6. On Bob's stop, ARCH "interrupts each job" (374). Interrupting a running child on Codex was not shown (study, line 67).
7. "who closes a finished session" is owed (design state, section 12). On Claude Code a session can archive a session. On Codex "the available native tools have no archive/close operation" (study, line 150). Whether finished children use up room on the account, as about 50 live sessions did on Claude Code (515), is unknown.
8. "Every session passes your suggestion on to each session it starts", for model and effort (233). On Codex the trial's children ran with "no model/effort overrides", and a hosted child shows no model name (protocol, line 6; window note, line 46). Unknown.

## 3. Rules that rest on messages, alarms and notifications

1. A job "sends ARCH one message when the tests pass" (250), and a role asks its parent to be refreshed (design state, section 8). Both are a child waking its parent. On Codex a parent waking a child is measured. The earlier trial reports "reactive supervision" (feasibility, line 7), but no file in this repository says plainly that a child's message woke its parent, and one note says the tested child's tools "lacked notify_parent" (trial notes, line 25). The owner console was not woken by a message (trial notes, line 25). So whether a child's word reaches its parent at once on Codex is unknown, and it reaches the console only when the console next runs.
2. "Once an hour an alarm wakes it as a safety net" (188), and ROOT reads the stop "at every wake" (374). On Codex a scheduled run is documented and the trial has a timer. Whether it wakes ROOT, which is a child, or only the console, is unknown.
3. "A notification goes to his phone when something arrives that only he can clear." (design state, section 4) Claude Code has a push notification in Bob's approvals. No Codex file shows one. In the trial, "idle owner-visible notification may wait" (trial notes, line 27).
4. "One standing page always shows everything waiting for Bob." (design state, section 4) Neither the sixth draft nor any Codex file says what carries this page. Unknown on both.

## 4. Rules that rest on a fill level

1. "Each long-lived role is refreshed on purpose, at a natural pause in its work or at a stated fill level, whichever comes first." (design state, section 8) On Claude Code a session can read its fill. A hosted Codex session cannot: "No current-context meter exposed to the acting agent" (study, line 136). So on Codex only "at a natural pause" can operate today.
2. Bob's requirement for Codex "that we be able to avoid compaction entirely" (`owner_words/bob_words_17nov_compaction_avoidance.md`, line 7). A hosted Codex session cannot see its window, its fill, or whether it compacted. So nobody can say the requirement is being met there. The study: "Without the active trigger and live usage, even a conservative percentage cannot rigorously guarantee compaction avoidance" (line 202).
3. "Its successor starts only from the shared state and the repository." (design state, section 8) Both harnesses can do this in principle. On Codex the trial's role state is a local file on the host, not on GitHub, and a restored role record "intentionally" leaves out "routine transcripts, answers, ACKs, and native bindings" (trial notes, line 11). The trial's own source says "host loss needs a meaningful recovery snapshot" (trial notes, line 12).

## 5. Rules that rest on where state and secrets are kept

1. Shared state "lives in one place on GitHub, in the product's repository" (235), and "Git and GitHub hold all state" (434). Bob, for Codex: "Codex needs to be careful about using github as a communications channel" (Bob on Codex, line 49). The Codex trial keeps messages and role state off GitHub. My reading: the two do not conflict if GitHub holds decisions and state and never carries messages, but the sixth draft puts "notifications" in the shared state, and that needs a ruling for Codex.
2. Bob enters "the deploy token and other secret values into Claude's cloud environment" (184); deploy tokens held there are "the only route measured to work" (481). No Codex file says where a secret goes. "Who can read the deploy token" is owed for both (design state, section 12).
3. "Sessions act as a second GitHub account that can push and merge but cannot change settings" (412). No Codex file says which GitHub account a Codex session acts as.
4. "Connect Claude to GitHub" is one of Bob's acts (184). On Codex Bob's matching acts are not listed anywhere. One is known: renewing Codex's sign-in about every 30 days (Bob on Codex, line 29).

## 6. Rules that rest on measured Claude Code limits

Each of these is a measured fact about Claude Code that a rule was built on. The Codex figure is unknown in every case.

1. "a session can run one thing for about 30 minutes", so a walk is shared among sessions (271).
2. New starts failed "at about 50 live sessions" (515).
3. A session started by an alarm "could not start sessions: 0 of 3" (462).
4. The cloud handed ROOT "a saved copy of that branch about an hour old", so "ROOT's first act is to fetch the newest copy of its branch" (416).
5. Eight slots "across the account" (254). On Codex the trial's proposal says "actual native concurrency can be lower than the owner's account job-slot cap" (trial notes, line 18). How many children one console can run at once is unknown.
6. "Whether a session's browser can reach the development site is unmeasured" (548). On Codex the trials' managed browser was not signed in and refused local files (study, lines 17 and 234). Unknown on both.

## 7. The most important things not known

1. What on Codex holds Bob's approvals, the forbidden commands, and the judging of risky acts. Bob asked for this to be studied and proposed (Bob on Codex, line 33). No result is in this repository.
2. Whether Codex can give each standing role a session of its own that Bob can open and speak to. Tested and blocked on 17 Nov; the files say this is "a runtime obstacle, not an account entitlement failure" (feasibility, line 11).
3. Whether a hosted Codex session can ever read its own fill level or learn that it compacted.
4. Whether a scheduled wake and a child's message can reach a ROOT that is a child, with Bob's console idle.
5. Where secrets go on Codex, and which GitHub account a Codex session acts as.
6. How Bob is notified on Codex.

One file disagrees with the design state on a matter outside the harness. The register says that every user of a changed module is told and that the filter "is superseded" (register, line 15). The design state says the notice "is a way of saving work, not a guarantee" and that a notified job "checks only the changed parts" (section 1). The design state rules.
