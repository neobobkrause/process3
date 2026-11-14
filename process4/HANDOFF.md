# Process4: handoff to a fresh session

Written 14 Nov 2026 by the session that produced drafts two to five. Read this file in full before anything else. Nothing in Process4 is in force.

## Who you are working for, and how

Bob is the owner. He is defining Process4, the successor to Process3, in which Claude Code sessions build his product Civicsmith unattended. In this role he is not a programmer. His rules, in his own typed words (all of his messages of 14 Nov are in `owner_words/`, exactly as typed; read both files in full):

- "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen. I have not read your working files."
- "Decide technical matters yourself and tell me what you decided. Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation."
- "Only words I wrote count as my word. Never record your decision or your summary as mine."
- "Do not assure me that something will work. Say what is proven and what is not."
- "Do not add tests, gates, reviews or checks. Process4 has three tests, ever."
- "Keep your context under 70%. Do the heavy reading with workers."
- "When you change something I defined you need to describe the PROPOSED change in words I understand so that I know what you're proposing and whether to approve the change or not."

Lessons the previous session learned the hard way; do not repeat them:

1. It brought him twenty-four questions of which twenty-three were technical. Decide technical matters and report them.
2. It then went too far the other way and changed or ended things he had defined as "Claude decided". Anything he defined (in his typed words, the record of 13-14 Nov, his ledger or his Foundations) changes only by a proposal he answers.
3. It wrote his short answers out as longer statements ("I think it has to check tests too" became "So it does"). Quote him exactly or not at all.
4. It wrote "checked by Claude" about something it had not checked. Say only what you have verified yourself or name the worker who did.
5. It re-proposed, as if new, the centre of a proposal already withdrawn, understated its cost and attached an assurance.
6. It filled its context by reading workers' long reports. Have workers write files and return short summaries; read files only in part.

## Where everything is

Repository `neobobkrause/process3`, branch `process4`, folder `process4/`. Bob approved keeping all Process4 material here ("You have my approval to add any and all information related to the process4 update to the repo"). Push each change as it is made. Never push to `main`. The other two repositories (`neobobkrause/civicsmith-copy`, the product; `neobobkrause/process3-probes`, which Bob named as the throwaway repository for trials) are read-only unless he says otherwise.

- `owner_words/`: Bob's messages of 14 Nov, verbatim. These outrank everything.
- `definition/process4_definition_v5.md`: the current draft. Its section B lists his typed words and the session's record of his decisions of 13-14 Nov.
- `definition/process4_audit2.md`: the second audit of the fifth draft: verdict, map of each area, fourteen questions that are his, Claude's corrections owed, what needs a trial or the build, what has no answer.
- `definition/process4_definition_appendix_v5.md`: where each of his 288 requirement lines stands (codes allowed there).
- `definition/process4_counterarguments.md`: the first audit's 87 counter-arguments with their answers.
- `evidence/`: the Process3 post-mortem and his requirement documents (`foundations.md`, `ledger_lines.md`, `DECISIONS.md`, `process4_disposition.tsv`, and others).
- `working/`: workers' reports. The three second-audit reports are `audit2_feasibility.md`, `audit2_corruption.md`, `audit2_requirements.md`; `audit2_notes.md` maps the combined document to them. `trial_plan_facts.md` is the trial plan's groundwork. `replay/` and `notice_study/` hold the measurements on notifications.
- His live documents (read with the Artifact tool, never web-fetch): the assessment https://claude.ai/artifact/WLa8nNmD7AWtkgNswvnRTF, the Keep and Drop Ledger https://claude.ai/artifact/W8TboyMGCLXCvrRkRWGQG8, the field report https://claude.ai/artifact/SPmVhKHEhCvLD2LusiSEDb.

## What is settled, in his typed words of 14 Nov

- Three tests and no others: module tests, the internal walk, the external walk. The notification to a module that uses a changed module is not a test.
- A tranche ends only when an external walk of a development deployment completes without flaws; flaws go to the next round. A tranche can end without an AI-enabled run. Installer and website are outside the tranche and wait for a clean development release walk. A release can optionally be started after a tranche completes.
- The internal walk uses the UX Screens document; the external walk follows the UX journeys.
- A job writes its own tests. A job for one module is not allowed to change another; the only other way is a mechanical edit.
- The process is changed only in a separate lane, PROCESS, that he interacts with. ROOT starts it. A product moves to a changed process only with his prior approval.
- Eight job slots across the account. The watcher beside ROOT stays (the previous session withdrew its proposal to drop it).
- Answers "agreed" to the fourth draft's proposals 5, 6, 9, 10, 11, 12 (the proposals are in `definition/process4_definition_v4.md`, section O).

## What Bob asked for next (his sixth message, verbatim in `owner_words/`)

1. "Lanes are an important element of the development process, though they haven't been fill into the process4 design." Lanes are barely present in the fifth draft. Find what his documents say about lanes (Foundations, ledger lines on design lanes, his standing approvals, Process3's record) with a worker, and fill them into the design starting from his documents, not designing afresh. PROCESS is itself a lane in his words.
2. "Let's begin the next session by going into greater detail on each of the points you make in the 'What most stands in the way' section of your last response." Those five points, as the previous session gave them to him:
   1. **The end of a tranche.** The documents the walks are measured against are not in the folder he named (`docs/development/ux-substrate/` in the product repository); the folder's README says they are claude.ai pages; it holds machine data (a registry of screens and acts, and a script of journeys). Sessions made most of the changes to that folder. One session alone (ARCH) decides that a walk is clean. No tranche size is set, and no walk of either kind finished clean in Process3.
   2. **The rule that only PROCESS changes the process is held by words only.** The process repository's own CLAUDE.md still lets sessions merge without him, and it has no deny list. His words of 14 Nov accept both the acts and the waiting that a setting only he can change would cost; the question of such a setting has not been put to him again since he defined PROCESS.
   3. **The first hour.** The fifth draft's fix for ROOT's start (make the tranche branch the default branch) was aimed at the wrong fault: the record shows his ROOT of 5 Nov came up on an old copy of the right branch. Also: no order or actor for converting the product or the trial repository; no stated way for the process's tool and role texts to reach a session that holds one repository.
   4. **The release reads two ways**, and none of it is built. His statements of 9 Nov (in Process3's decision record) and 14 Nov differ on whether a release has a walk of its own.
   5. **His 288 lines.** 112 are stated in the draft; 53 he kept are stated nowhere; 33 were ended by Claude without a proposal; his ledger and Foundations still say the opposite of the definition for 75 lines and nothing says which governs.
   Begin by having workers pull the detail for each of the five from the three second-audit reports, then go through them with him one at a time, in plain words.

## Still owed by Claude

- Correct the wrong and stale statements in the fifth draft listed in section 4 of the second audit (including the false "checked by Claude", the four short answers written long, sections that still call his answered readings open, his fifth and sixth messages missing from section B).
- Restore the 33 lines Claude ended without a proposal and put them to him as proposals, grouped, for a yes or no.
- State the 53 kept lines that the fifth draft states nowhere, or say plainly where they stand.
- Then a sixth draft, and the appendix brought into line with it.

## Still open with Bob

- The fourteen questions in section 3 of the second audit. He has not answered them.
- What the walks read: the claude.ai pages, files in the folder, or the machine data; and how a session reaches the pages.
- Whether "a clean development release walk" is the tranche's external walk or a further walk.

## The notification study

Bob is starting a separate session for the question of when a changed module's users must be updated. Its brief is `working/notice_study/session_brief.md`; the groundwork is `working/notice_study/study.md`. Do not duplicate that work here. Until it reports, the definition keeps his rule (a job that changes a module's interface notifies every user of that module) and marks what counts as an interface change, who is told and what a told module does as under study.

## Trials

Only one has run: the offline replay of Process3's recorded notifications (`working/replay/results.md`). No session has been started on his account and no setting of his has been changed. Ask before either. The combined trial needs things built first; see `working/trial_plan_facts.md` and section 5 of the second audit. The second audit found the trial plan weak and its cost to him understated.

## Added by the second main session, 14 Nov 2026

What this session did. Nothing of Bob's was changed, no session was started on his account, and no setting was touched. The product repository was cloned for reading only.

- `definition/process4_five_points.md`: the five points of "What most stands in the way" in detail, in plain words, with what is Bob's to decide and a recommendation for each. Given to him in chat. He has not answered yet.
- `definition/process4_lanes.md`: lanes filled in from his documents, as a proposed section for the sixth draft. Section 3 holds five questions that are his; section 4 holds wording of his that Process4 cannot keep as written. He has not answered yet.
- `working/session2/`: the workers' reports behind both (one for each of the five points, two on lanes, one on requirements missing from the 288). Each begins with a plain-words section. `point5_288_lines.md` holds the 33 lines grouped as seven yes-or-no proposals, ready to be put to him.
- `evidence/foundations_tranche_9nov.md`: the later copy of his Foundations, taken from the process repository's `tranche` branch. The 288 lines were made from the earlier copy and from the first Keep and Drop page only.

Corrections to this handoff and to the audits, found by checking primary sources:

1. His standing approvals in the process repository's `CLAUDE.md` say nothing about lanes. The lanes paragraph is in the product repository's `CLAUDE.md` on its `tranche` branch.
2. All the lane machinery of Process3 is on the process repository's `tranche` branch. The `process4` branch and `main` carry the tool of 2 Nov, with no lane code.
3. "The documents are not in the folder" is only partly right: the folder differs between the product's main branch and its tranche branch, and the Screens page is built from the folder. There are three journey lists (27, 27 and 32 journeys).
4. All 63 November changes to that folder were by sessions, not 61.
5. The fifth draft's sentence on ROOT's start of 5 Nov is wrong in three ways; the third and fourth drafts had it right.
6. The process repository's `tranche` branch has a list of forbidden commands; `main` and `process4` have none.
7. The audits' "33 lanes" is 33 branches; Civicsmith had three lanes.
8. The set-up check was not ended on Bob's instruction of 9 Nov: Process3's decision record kept it, run less often. Ending it was Claude's.
9. GitHub's settings for the process repository can be read from a session (a worker did). The product repository's cannot without attaching it.

Withdrawn by Claude in this session, and to be removed from the sixth draft: the request that Bob make the tranche branch the default branch; the sentence "Only your word ends a tranche that will not come clean" (it was Claude's, unmarked).

Still owed: everything under "Still owed by Claude" above, plus bringing the requirements found in `working/session2/later_requirements.md` into the appendix, comparing the 27-journey and 32-journey lists for him, and a written order for converting the three repositories that lists Bob's own acts.
