# Point 1: the end of a tranche (worker report, 14 Nov 2026, second main session)

## For the owner, in plain words

**Proven** (checked today by this worker in the product's repository and Process3's stored records):

- The folder you named differs between the product's two lines of work (branches). On the main branch, unchanged since 1 November, it holds 133 files, among them a Journeys page (27 journeys) and a Screens page. On the branch Process3 built on, an AI session removed 49 files on 6 November, the Journeys page among them, and wrote a note saying the design documents are pages on claude.ai. 90 files remain.
- So "the documents are not in the folder" is only partly right. On the build branch the Journeys page is gone. The Screens page is still there as an old copy (28 October), with everything needed to rebuild it, current to 8 November. The claude.ai Screens page says it was built from that folder.
- There are three journey lists: the claude.ai Journeys page (27 journeys, 6 October, the oldest); the Journeys page on the main branch (27, marked on 13 October as folded into the Screens page); and a script in the folder that the Screens page draws from (32 journeys). Nothing says which is "the UX journeys".
- This session could open both claude.ai pages, read-only.
- All 892 changes to the folder from 2 October to 9 November were made by AI sessions; none by your own GitHub account. Many cite a ruling of yours. Your account committed, on 5 November, the approvals sentence that design documents are claude.ai pages; the same paragraph lets design sessions "decide design and wording there".
- Process3 stored five walk reports, three internal and two external. None was clean. Both external walks visited each screen as administrator and as member; neither followed journeys. So the external walk as you now define it never ran.
- Process3's tranche never ended: the main branch still stands at 1 November.
- In Process3 the walking program's own pass-or-fail decided each walk, and sessions wrote the rules for what could be excused.

**Not proven:** that any walk can come clean; how long a walk by journeys takes; whether a session can run one.

**Yours to decide:**

1. What each walk is measured against (the claude.ai pages, pages in the folder, or the folder's data), and which journey list counts.
2. Whether sessions may change it. Process4 has not said.
3. What "without flaws" means, beyond what you agreed.
4. What a tranche contains, and whether an older flaw holds it open.
5. What happens to a tranche that never comes clean. The draft's sentence that only your word ends it is Claude's, not yours.
6. Whether journeys that begin at the installer or website, or need AI, count toward "all journeys".
7. Who runs walks: sessions (your hint) or GitHub's machines (a line you kept).

**Technical, for Claude to decide and report:** which files a walk reads once you choose; correcting the draft's wrong sentences; naming which session deploys; one trial run of the existing walking program.

---

## How to read the rest

Marks: **(V)** verified by me in this session against a primary source (command or file:line given); **(A)** an auditor's report says so, not re-checked; **(J)** a judgement. "Tranche branch" = `origin/tranche` of `neobobkrause/civicsmith-copy`, tip `e7ec72e` (9 Nov). "Main" = `origin/main`, tip `0dea5a6e` (1 Nov).

How I verified: the shared clone (`/home/user/neobobkrause/civicsmith-copy`, main, depth 1) was busy with other workers' fetches, so I read main from its working tree and made a private read-only clone in my scratchpad: `git clone --bare --filter=blob:none --depth=500 --single-branch --branch tranche` (40,213 commits, back to 2 Oct 2026), plus depth-1 fetches of `process-state` and nine other branches. Nothing was written to any repository. I also read two claude.ai pages with the Artifact tool (read-only).

Paths: `F` = `/home/user/process3/process4/working/audit2_feasibility.md`; `C` = `.../working/audit2_corruption.md`; `R` = `.../working/audit2_requirements.md`; `N` = `.../working/audit2_notes.md`; `A2` = `/home/user/process3/process4/definition/process4_audit2.md`; `D5` = `.../definition/process4_definition_v5.md`; `PD` = `/home/user/process3/process4/evidence/DECISIONS.md` (Process3's decision record, written by sessions, in places quoting Bob).

---

## 1. Every audit finding bearing on this point

### The combined audit (`A2`)

| Where | What it says |
| --- | --- |
| A2:19 | Section 1 item 1: the two documents "are not in the folder as the draft says (measured)"; sessions write them; one session decides a walk was clean; no walk came clean; the external walk as now defined never ran; nothing bounds rounds or sets tranche size |
| A2:37 | Map row "Rounds, the two walks, the end of a tranche": run audit "contradictory and thin", drift audit "thin, contradictory in one place", requirements audit "stated but unproven". Needs: questions 1, 2, 13; a trial |
| A2:53-59 | Question 1: what the walks are measured against, whether sessions may change it, meaning of "without flaws". Options (a) claude.ai pages, (b) files back in the folder (drift auditor's suggestion), (c) the machine data |
| A2:61-67 | Question 2: tranche size; a tranche that will not come clean. Options (a) all open work, (b) a smaller content set by Bob for each tranche; and merged-with-flaws or dropped |
| A2:162-168 | Question 13: who runs the walks: "sessions" (his hint) against his kept Ledger line; options (a) sessions, (b) GitHub's machines |
| A2:101-114 | Question 7 (release): three journeys begin at the installer or website, about nine need the assistant (A2:110) |
| A2:116-122 | Question 8: what "no more tests" bounds; walk steps went 238 to 357 in one round |
| A2:174 | Question 14, third bullet: "Nothing the model says is evidence" against sessions writing and counting walk steps |
| A2:184 | Section 4: "'Checked by Claude' about the folder was false" |
| A2:185 | "sessions" was written as "So sessions run both" |
| A2:193 | Sentences that cannot both hold: walk "at any time on your word" and "when no job is open"; a tranche ending with no AI run beside a clean walk that leaves out no earlier step |
| A2:197 | Unmarked additions of Claude's: "Only your word ends a tranche that will not come clean"; an internal walk at any time on his word |
| A2:208, 215 | Not enough to build from: who deploys; telling him when a round ends |
| A2:222-223 | Missing from the unbuilt/unproven lists: the walker must be changed before a walk can be shared; that a session's browser can reach the development site; what is in the walks' folder; the two documents the walks need; that a tranche's end is one session's reading of a report; the one-off trial (same walk twice on an unchanged build) |
| A2:234-235, 238, 240, 242 | Section 5 trials 1 and 2 (run the existing walker once; same walk three times; one external walk by journey); the made-up-modules trial "can show nothing about walks"; only a copy of the real product can; only the first real tranche shows whether a tranche can end |
| A2:246-248 | Section 6, no answer found: 1 nothing makes a tranche end; 2 a session loosening a walk step or merging before the walk is clean; 3 a walk step that fails for no reason in the product |

### The run audit (`F`)

| Where | What it says |
| --- | --- |
| F:5, F:8 | Verdict: the folder "says of itself that the design documents are not in it"; holds machine data; 135 of 679 screen acts "marked as not built yet" |
| F:14 | Its counts were taken at the tranche branch tip `e7ec72e` only |
| F:78-91 | Finding 5 (NEW): the named folder does not hold the two documents; nothing says how much a tranche's walk must cover. F:83 README quoted; F:84 the approvals sentence; F:85 90 files, registry 91 screens / 679 acts (462 declared, 82 by function, 135 "owed"), `mock-journeys.js` "32 journey entries", `layouts.html` "a 1.5 MB built mock"; F:86 folder owned by module `ux-design` and by design lanes whose changes merge with no test; F:87 three unsettled things; F:90-91 best answer and "Bob's to decide" |
| F:93-106 | Finding 6: a walk shared by several sessions never ran. F:98 the walker is one program with two arms and no option to run one journey; F:99 PD-16; F:100 60 and 64 minutes, ran on GitHub's machines; F:101 the 30-minute/2-hour limit and kept Ledger line; F:102 "has the product deployed" names no session; F:105 best answer (one-off trial, then probably one walking session) |
| F:151-159 | Finding 10: first walk after about 177 jobs; "No answer found that makes the tranche end"; tranche size is "the only lever in his hands that is not a new check" (F:158) |
| F:211-219 | Finding 16 (release): BD-R3 and the 8/9 Nov sentence on a release walk with AI on |
| F:225-236 | Finding 17: walks, deployment and release cannot be tried on made-up modules |
| F:288, 290, 292 | Finding 22 rows e, g, i: walk at any time vs when no job is open; "without flaws" vs a tranche ending without an AI run; "which files each walk reads" left to the build though counted as decided |
| F:311-313 | Walk-through: internal walk stops (no document, no scope, no way to share); deployment has no session named; external walk never run from a session |
| F:344-349, 353 | Missing from sections M/N/O: items 5, 6, 7, 10; trials that cannot settle |
| F:381 | Map row: "Contradictory and thin" |

### The drift audit (`C`)

| Where | What it says |
| --- | --- |
| C:30-31 | Verdict items 1 and 2: the first tranche does not end, or ends because the walk was made to end |
| C:40-75 | Finding 1: tranche end decided by one session reading a report, against documents sessions rewrite. C:56 journeys.html removed 6 Nov by commit `ef9a2c7fde` (49 files, 40,887 lines), README quoted, mock script "32 journeys"; C:57 "Of 63 commits to that folder from 1 to 9 Nov, 61 are by sessions", commit `922154ffd1` quoted; C:58 36 and 34 notes "the designed absence, BOB, 8 Nov"; C:59 PD-10, PD-16, 9 of 35 walker changes excuse/retire/postpone a step; C:60 Process3 held this gate by a tool refusal; C:61-62 "one walk back" weakness of the agreed wording; C:69-73 best answer; C:75 whose |
| C:116-159 | Finding 3: a tranche may never end for reasons other than growing tests. C:130-138 table of the five stored walks; C:138 about 68 of 147 failing steps were one browser crash; C:140 deployments; C:142 deployed walks were screen visits in two roles, only journeys 3 and 28 appear by name; C:143 journeys 1, 28, 29 begin at the installer or website; C:144 starting state and no tranche size; C:146 shared walk risks; C:153-157 best answer incl. two one-off trials; C:159 whose |
| C:200-230 | Finding 5 (release): C:217 about nine of 32 journeys need the assistant |
| C:236-265 | Finding 6: growth goes to the product; C:247 walk steps 238 to 357; C:252 agreed "without flaws" makes steps only accumulate; C:260 question on bounding walk steps to his documents |
| C:412-426 | Finding 11: a tranche that does not end reports nothing; suggested two lines at each round's end |
| C:463, 475-479, 504 | Appendix A rows 10, 22-26, 51: text-only rules on lanes, clean internal walk before deploy, flaws to modules, "without flaws", tranche end, "Only your word", shared walk |
| C:537-539 | Appendix C: order of a round; walking sessions; tests and steps |
| C:560-576 | What the three tests do not see |
| C:580-583 | Not established: the claude.ai pages were not read; whether R7/R9/R21 labels are numbered journeys; the cause of the 68 browser-closed failures |
| C:599, 607-608, 610 | Map row; omissions from unbuilt/unproven; "where the focus is still needed" puts findings 1 and 3 first |

### The requirements audit (`R`)

| Where | What it says |
| --- | --- |
| R:9 | It checked the folder in the read-only clone |
| R:70-78 | Finding 3 (NEW): the draft turns his "screens and journeys" into "the UX Screens document and the UX journeys" and adds "Checked by Claude"; README on the tranche branch and his approvals say the documents are kept elsewhere; R:74 "90 files ... 61 under `screens/`, one whose name holds 'journey' (`screens/mock-journeys.js`, 29 scripted journeys)"; R:77-78 best answer; Bob's to decide |
| R:140-148 | Finding 10: "development release" undefined |
| R:183 | Finding 14(b): "sessions" became "So sessions run both" |
| R:217 | "Nothing the model says is evidence" against walks whose steps sessions write and count |
| R:229, 230, 234 | Additions 3, 4, 8: walk "at any time on your word"; "Only your word ends a tranche that will not come clean"; walks shared "by journey" |
| R:241, R:301 | The extra condition in "without flaws" is not an addition: he was asked (proposal 10) and answered "agreed" |
| R:255-258, 261 | Conflicts 7, 8, 9, 10, 13 with his typed words of 14 Nov |
| R:275 | Attribution fault 4: "Checked by Claude" |
| R:319 | Map row: "Stated but unproven" |

### The map file (`N`)

N:14 (item 1 = F5, F6, F10; C1, C3; R3); N:30 (map row); N:48-49 (questions 1, 2 sources); N:60 (question 13); N:72-73 (attribution cautions on the approvals sentence and the folder note); N:84; N:111, N:113 (trials; section 6); N:136 (the audits disagree on the journey count, 32 against 29, not re-counted); N:148 (could not settle the date and first author of the approvals sentence).

---

## 2. The facts, verified against the product repository

### 2.1 What is in `docs/development/ux-substrate/`

**On main (tip `0dea5a6e`, Bob's commit of 1 Nov 2026 14:24 -0800). (V)** `find docs/development/ux-substrate -type f | wc -l` = 133. Top level: `README.md`, `HANDOFF.md`, `NEXT-SESSION-PROMPT.md`, `T50-requirements-gaps-2026-10-17.md`, `journeys.html` (122,774 bytes), `layouts.html` (1,501,953), `ux-substrate.html` (857,474), `ux-substrate.json`, `ux-substrate-v2.json`, `ux-experience.json`, `build_ux.py`, `build_ux2.py`, eight more `.html` pages, and directories `archive/` (19 files), `marks/` (1), `oq-research/` (3), `screens/` (58), `views/` (4), `visual-language/` (28).

**On the tranche branch (tip `e7ec72e`). (V)** `git ls-tree -r --name-only HEAD docs/development/ux-substrate | wc -l` = 90: `README.md` (2,184 bytes), `layouts.html` (1,551,051 bytes), `marks/` (1), `screens/` (61), `visual-language/` (26). No `journeys.html`, no `ux-substrate*.json`, no `ux-experience.json`, no `build_ux*.py`, no `ux-substrate.html`.

**The difference. (V)** Main's tip is an ancestor of the tranche tip (`git merge-base --is-ancestor`); the tranche is 7,354 commits ahead; 111 of them touch the folder; `git diff --name-status 0dea5a6e HEAD -- <folder>`: 49 deleted, 6 added, 34 modified.

**Other branches. (V)** (`git ls-remote --heads origin`: 1,177 branches; depth-1 fetches.) `lane/ux` (8 Nov): folder identical to the tranche (same tree `a54d6209`). `lane/journeys` (28 Oct): identical to main (tree `59d8e122`). `job/ux-design`, `bob/lane-ux-module`, `bob/ux-design-lane`, `claude/ux-dec491`, `lane/ux-ai-use-r13-built`: 133 to 138 files, each still with `journeys.html`. `ux-study` (24 Sep): no such folder.

### 2.2 What the README says

**Tranche branch README, complete first paragraph (V, `git show HEAD:docs/development/ux-substrate/README.md`, line 3):**

> "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts, kept by the ux lane and recorded with `p3 lane artifact ux`. Their earlier repository copies, the old handoff notes and the archive are in git history, before the commit that removed them."

Line 8: "`layouts.html`: the design mock, built by `screens/build_page.py`. `bio-plane/src/journey-check/design.mjs` reads it from git at the interface's `ASSETS_COMMIT`." Lines 15-25: a table of nine claude.ai links, among them "Journeys | https://claude.ai/artifact/9hNPVCMcT8eyewWqKXfgSu" and "Screens | https://claude.ai/artifact/MjC8pWKDj5PrYwm417GLAV". This README was written by a session (commit `dea48973e`, 6 Nov); "(Bob, 5 Nov 2026)" is the session citing him, not his typed words.

**Main branch README (V, working tree).** It describes the files as being in the folder: "`journeys.html`: step 3 of the design phase, SETTLED 2026-10-06 (DEC-128 to DEC-137) ... twenty-seven journeys ... Folded into the screens page on 13 October (DEC-204) and no longer updated"; "`layouts.html`: step 5 of the design phase ... Built by `screens/build_page.py`. Published at https://claude.ai/artifact/4FjPjGmCVppDnMYfM7xkCw, Bob's working page (DEC-204); since 13 October it also holds step 3's journeys material."; "`build_ux2.py`: renders both into `ux-substrate.html`"; "`ux-substrate.json`, `build_ux.py`: the first inventory and its renderer, kept for reference."

### 2.3 Is there a "UX Screens document" or "UX journeys" a walk could be measured against, and in what form

| Thing | Where | Form | Made by | State (V unless marked) |
| --- | --- | --- | --- | --- |
| `layouts.html`, `<title>Civicsmith Screens</title>` | main and tranche | Human page with live mock screens; its section 3 is "Journeys and wizards, walked" | **Generated** by `screens/build_page.py` from `screens/page.src.html`, `registry.json`, `library.json`, six `mock-*.js` files (among them `mock-journeys.js`) and the visual-language CSS | Tranche copy last committed 28 Oct (`9b799bb7e`); main's copy 27 Oct (blobs differ). Product decision BD-5 (BOB, 6 Nov; product `DECISIONS.md` on the tranche, line 56): the file is 1.55 MB, over a 1 MB cap, "so no commit can rewrite it; it is frozen at 28 Oct"; decision: build it, do not commit it |
| `screens/page.src.html` and the mock scripts | main and tranche | The Screens page's source (HTML and JavaScript) | Hand-kept by sessions | Tranche: last changed 8 Nov (`8cf8324e3`); `page.src.html` changed 4 times in November |
| The claude.ai "Screens" page | claude.ai (link in the tranche README; registered in `lanes/artifacts.jsonl` on the product's state branch, 6 Nov 05:04Z) | Human page | The same build, published by a session | Read by me with the Artifact tool: title "Civicsmith Screens"; "Version: built from tranche 8cf8324e3f on 2026-11-08, through DEC-504"; its embedded script has 32 journey entries (`grep` of the saved page source). The folder has one later commit (`fc5359cc2`, DEC-505) |
| `journeys.html`, `<title>Civicsmith Journeys</title>` | **main only** | Human page: "4. Twenty-seven journeys", "5. Seventeen wizards" | Hand-kept HTML; no generator found (`grep -rl 'journeys\.html'` finds only documents and a comment) | Last changed 13 Oct (`8bf4830c2`, "DEC-204 (Bob's direction): the journeys page folded into Civicsmith Screens"); carries the banner "Folded into Civicsmith Screens on 13 October 2026." Removed from the tranche on 6 Nov |
| The claude.ai "Journeys" page | claude.ai | Human page | Published by a session | Read by me: "Civicsmith Journeys", "SETTLED by Bob, 6 October 2026", 27 journeys. `diff` against main's `journeys.html`: it is an **older** copy; it lacks the 13 Oct "Folded into" banner |
| `screens/mock-journeys.js` | main and tranche, **identical** (blob `9fddec18`) | Script data: `const J = [...]`, each entry a numbered journey with a title, who, and either a wizard name or steps naming a screen, an act and a sentence ("say (what happens, in Bob's words)", file header) | Hand-kept by sessions | **32 entries**, n = 1 to 32; 14 point to a wizard, 18 list their own steps (139 steps); last changed 27 Oct (`eec58f486`); not touched in November |
| `screens/registry.json` | main and tranche | Machine data, "GENERATED by check_library.py from registry.src.py (DEC-139)" | Generated from `registry.src.py` | Tranche: 91 screens, 679 acts: 462 "declared", 82 "function", 135 "owed". Main: 91 screens, 662 acts (459 / 82 / 121). The file's own note defines "owed" as "a ruling owes it"; `build_page.py` prints it as "owed by your earlier rulings" |
| `screens/library.json` | main and tranche | Machine data: 23 wizard scripts with steps (screen, act, what, why) | Generated from `library.src.py` | Last changed 25 Oct |
| `ux-substrate.json`, `ux-substrate-v2.json`, `ux-experience.json` | **main only** | Machine data: an inventory of constructs, acts, roles, audiences, use cases, "step-by-step experience", screen rules, open questions | Hand-kept data; `build_ux2.py` renders the last two into `ux-substrate.html` ("Civicsmith UX Substrate"); `build_ux.py` is the first renderer and reads from a scratchpad path that no longer exists | A third design document ("The UX substrate"), not the Screens or Journeys documents |

What Process3's walker in fact read **(V, `bio-plane/src/journey-check/design.mjs` and `run.mjs` headers on the tranche):** the frozen `layouts.html` "as committed at the interface's `ASSETS_COMMIT` (read from git ...)", compared screen by screen with the live page; and the registry's screens. The local arm "walks journey 28 from the installer through the hand-over into the copy and on, then journey 3, then sweeps the registry's screens"; the live arm "signs in to a named test instance as its administrator and as a member ... and sweeps every working screen beside the design mock".

### 2.4 Who changed the folder

**(V)** `git log HEAD -- docs/development/ux-substrate` on the 500-deep clone (2 Oct to 9 Nov): 892 commits.

| Period | Author name | With a `Claude-Session:` trailer | Without |
| --- | --- | --- | --- |
| 1 to 9 Nov (63 commits) | Claude `<noreply@anthropic.com>` | 57 | 4 |
| | BOB `<noreply@anthropic.com>` (the architecture session) | 1 | 0 |
| | believeinoakland (the sessions' GitHub account, a merge commit made through GitHub) | 0 | 1 |
| 2 to 31 Oct (829 commits) | Claude | 792 | 24 |
| | UX design session `<neodall-e2@neologic.com>` | 13 | 0 |

Commits to the folder authored by the owner's identity (`Bob Krause <neogithub@neologic.com>`, 43 commits in the whole fetched history, all through GitHub's website): **0**. That `believeinoakland` is the sessions' second account is (A): `evidence/permissions_inventory.md:297`, `evidence/product_side.md:236`.

Of the 63 November commits most change the word files (76 file-touches under `screens/words*`); the journeys script was not touched; the registry twice. Many commit titles cite a ruling or direction of Bob's (for example `8bf4830c2` "DEC-204 (Bob's direction)", `d129fe129` "to Bob's BD-18") **(V, titles only; I did not check the rulings).**

The removal **(V):** `dea48973e` (6 Nov 05:11Z, "ux: keep only what the build reads in the ux-substrate folder", 49 files, 40,887 deletions), reverted by `429f06210` (05:12Z, "BOB holds it for later"), re-applied by `ef9a2c7fd` (05:14Z). All three carry the same session trailer.

### 2.5 The approvals sentence

**(V)** Product `CLAUDE.md` on the tranche, line 11: "Design lanes, run under BOB, own their lane folders, the design stream (docs/development/ux-substrate) included, and each lane runs as one session at a time. Within the product's principles they decide design and wording there. Their design documents are claude.ai artifacts, not repository files. A pull request that changes only files in its own lane's folder lands through the merge tool without a test suite run, and the large files a lane's generators build are built at layer close, deploy and release, never committed."

`git log -S'Their design documents are claude.ai artifacts' -- CLAUDE.md`: one commit, `2a14a3eb8`, author Bob Krause, committer GitHub, 5 Nov 2026 10:23 -0800, "Revise standing approvals and design lane details". Main's `CLAUDE.md` (1 Nov) has no such paragraph. Git does not show who drafted the text.

A related session record of Bob **(V, product `DECISIONS.md` on the tranche, BD-4, line 51-54; a session's record, not his typed words):** "Bob, 6 Nov ~18:05Z, through the coordinator: 'agreed'. Decision: Bob keeps the product's UX direction, its audiences and its principles. Beneath them, the ux lane decides design and wording: screens, flows, words, layout and visual language. It records each decision in its design artifact".

### 2.6 Where the auditors' statement is wrong, stale or partly right

1. **"The two documents ... are not in the folder" (A2:19; F:78; C:42, C:56; R:70; the handoff).** Partly right. Right for a file called the Journeys document on the tranche branch, and right that the tranche README says the design documents are claude.ai pages. Wrong or incomplete in four ways:
   - It is true of the tranche branch only. All three audits counted there (F:14; R:73 "on the tranche branch"). On main the folder still holds `journeys.html`, `layouts.html` and the rest. **(V)**
   - The Screens document is generated from the folder. Its whole source is on the tranche branch and current to 8 Nov; an older built copy (28 Oct) is there too; the claude.ai page states it was built from the tranche. What is missing from git is only the current built page, kept out by a size cap and by the approvals sentence "never committed". **(V)**
   - The claude.ai Journeys page is the oldest copy of the journeys (27 journeys, 6 Oct, without the "folded" note). The newest journey list (32) is the script in the folder. So "the documents are claude.ai pages" does not hold for the journeys either. **(V)**
   - "It holds machine data" (handoff): on the tranche it also holds one human page (`layouts.html`) and a human-readable page source.
2. **Journey count.** F:85 and C:56 "32": right **(V)**. R:72, R:74 "29": wrong as a count; 29 is what the file's header comment names. N:136 left this unsettled.
3. **"Sessions made 61 of the 63 changes" (C:57; A2:55).** The count 63 is right. The other two are also session identities (the architecture session, and a merge by the sessions' GitHub account). No change to the folder was made by Bob's GitHub account. **(V)**
4. **"The audits give no date, and do not show who drafted the sentence" (A2:55; N:72, N:148).** The date is now found: his commit of 5 Nov 2026. The drafter is still not shown.
5. **"Whether a cloud session can open them is not known" (A2:59).** Measured once, in this session: both pages opened read-only with the Artifact tool, which treated them as public pages made outside this account and returned a summary plus the saved page source. Not measured: any other session or account, or editing.
6. **"135 of its 679 screen acts marked not built yet" (A2:55; F:8, F:80).** The count is right. The registry's word is "owed (a ruling owes it)". "Not built yet" is the auditor's gloss **(J: a fair reading, not the file's own words).**
7. **"About 68 of the 147 failing steps ... were one crash of the walker's browser (measured)" (A2:248; C:138).** The count is right: 68 failures read "Target page, context or browser has been closed", 67 of them in the "as member" group **(V)**. "Crash" is not established. Process3's decision record says of the same run: "Round 1's live arm on p3dev-l12 was stopped on Bob's word" (PD:119). The record does not say whether the stop caused the closed browser **(J: a second possible cause the audit does not mention; C:583 lists the cause as not established).** A2 section 6 item 3 rests partly on this.
8. **"60 and 64 minutes" (D5:183; F:100; A2:164).** Right for the whole deploy-and-walk runs (59.5 and 63.6 minutes). Within them the external-walk stage took 2,455 s (41 min) and 1,352 s (23 min, the stopped one), and the internal walk 613 s and 1,940 s **(V, `deploys/dev.jsonl` on the state branch).** Both were screen sweeps, not journeys.
9. **D5:185 "Checked by Claude: the folder exists on the branch the product is built on, with a screens sub-folder and files describing journeys."** Each clause is literally true of the tranche branch **(V)**, but the drafting notes say it was not checked (`working/v5_notes.md:60`), and the sentence before it ("So the UX Screens document and the UX journeys are kept in that folder") does not follow for the journeys.

---

## 3. What Process3's record shows about walks

**The walks that ran (V, from the product's state branch: `deploys/dev.jsonl`, `deploys/p3dev-l11/...`, `deploys/p3dev-l12/...`, `walks/internal/...`; each `report.json` parsed).**

| Walk | Steps | Steps failing | Failures listed | Notes | What it walked |
| --- | --- | --- | --- | --- | --- |
| Internal, 5 Nov 15:38Z | 236 | 0 | 63, all "not reached on the local arm" (group "R21 the carried states") | 17 | journey 28 (25 steps), journey 3 (8), "R16 ... (journey 29's search path)" (9), 88 screen steps as founder, 89 pseudo-locale steps, others |
| Internal, 8 Nov 07:20Z | 238 | 0 | the same 63 | 17 | the same groups |
| External, 8 Nov 07:20Z | 175 | 155 | 1,691 (1,050 layout overlaps, 640 undefined style classes, 1 step) | 83 (63 "not reached on this instance", 14 "not walked, the assistant does not work") | "as administrator" 80 steps, "as member" 78, public pages 9, two small groups; 154 steps are "screen <name>" |
| Internal, 8 Nov 23:50Z | 357 | 70 | 96 layout overlaps | 60 (34 "the designed absence, BOB, 8 Nov") | as before plus 110 "carried states" steps and 9 public pages |
| External, 8 Nov 23:50Z | 157 | 147 | 178 (110 overlaps, 68 browser closed) | 36, all "the designed absence, BOB, 8 Nov" | "as administrator" 79, "as member" 78 |

These match C:130-136 and `working/k_evidence.md:274-276`.

**Deployments (V, `deploys/dev.jsonl`):** 12, all `"ok": false`. Ten on 4 Nov (eight stopped at the stage named "walk", after 6 s to 25 min in that stage, with no report stored; one at "build"; one at "dry_run"); none for 80 hours; two on 8 Nov, both stopped at "walk". Matches `evidence/product_side.md:12` and `:225`.

**How many walks:** five with stored reports (three internal, two external). The eight walk-stage stops of 4 Nov left no report; what they found is not in the record I read.

**Did any finish clean:** no **(V)**. Two internal walks had every step marked ok while listing 63 failures and exiting 1 (PD:60 "Its internal walk exited 1").

**Did the tranche end:** no. `git ls-remote origin refs/heads/main` = `0dea5a6e`, the 1 Nov commit **(V)**. "The tranche never closed, so no tranche report was written" (A: C:418, citing k_evidence K4).

**Who judged a walk:**
- The walker program's own result, recorded by the process's tool: `"ok": false`, `"exit": 1` in `deploys/dev.jsonl` **(V)**. The tool refused to close a tranche "without a clean internal walk, a release and a clean release walk" (A: `evidence/change_sample.md:153`).
- The coordinator session wrote the rules for what a failing walk blocks: PD-10 "a walk failure that is wholly a found mark already recorded and owed to a named layer does not block `release dev`" (PD:61); PD-16 "A round whose internal walk is clean (known gaps deferred on Bob's word count as passing)" (PD:118) **(V, the record).**
- The architecture session (BOB) wrote excusals into the walker: 36 and 34 notes "the designed absence, BOB, 8 Nov" **(V)**; and the walker's design file says the report "lists them for BOB, who records the comparison before a release is called ready" **(V, `design.mjs` header).**
- Bob stopped one walk, as the record quotes him (PD:117, 8 Nov, a session's record of his words): "Stop the live walk now, update the process so that the live walk only runs once a round closes with no flaws found from the internal walk."

**Where the walks ran:** on GitHub's machines, never from a session (A: F:100; `working/k_evidence.md`; not re-checked). `deploys/dev.jsonl` names the session that started each 8 Nov run **(V)**.

**Did the external walk as Bob now defines it ever run:** no **(V)**. His definition (owner_words/bob_words_14nov_b.md:9): "The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." Neither external report has a step group named for a numbered journey; both are sign-ins and screen visits in two roles. The journey-like steps were in the internal walks: journeys 28 and 3 by name, and part of 29, of 32. Its length, failure rate and data needs are unmeasured.

---

## 4. What the fifth draft says (`D5`, quoted with line numbers)

**Bob's own words** (`owner_words/bob_words_14nov_b.md`): line 5 "So a tranche only ends when an external walk (of a development deployment) completes without flaws."; line 9 "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results."; line 21 "Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish." `bob_words_14nov_c.md`: line 28 "M7: sessions"; line 37 "O4: internal and external walks a separate tests."; line 51 "screens and journeys are kept in docs/development/ux-substrate/ in the product repo"; lines 56-58 his three answers.

| Question | The draft | Whose words |
| --- | --- | --- |
| Who runs each walk | D5:143 "**Walking sessions** are started by ARCH for each walk and use the job slots". D5:177 "ARCH starts sessions that walk the product as built against the UX Screens document." D5:178 "Walking sessions then follow the UX journeys there." D5:183 "Your hint of 14 Nov: 'sessions'. So sessions run both. *Claude decided* the rest: a walk happens when no job is open, so walking sessions use the job slots, and the walk is shared out among them by journey, with at most as many walking sessions as there are slots. Unproven: ... That never ran." | His: "sessions". Claude's: everything after it, and "So sessions run both" (R:183) |
| Who deploys | D5:135 ARCH "has the product deployed to the development site". No session named | Claude's |
| Who decides a walk is clean | Not stated in one sentence. D5:135 ARCH "starts the walking sessions ... and turns each flaw into work for a named module ... It writes the tranche report." D5:191 "When the tranche ends, ARCH merges the tranche branch into the main branch as a whole, by pull request ... None of the three tests runs on that pull request." D5:409 "Sessions write and count the walk's steps. A step that was loosened cannot be seen." | Claude's. That the decider is ARCH alone is the auditors' reading (C:42) **(J: I agree with it; no other session is given a part)** |
| What "without flaws" means | D5:187 "The fourth draft's proposal 10: a walk is without flaws when it lists no flaw and leaves out no step that the walk before it made. You answered 'agreed' on 14 Nov." (His answer: `bob_words_14nov_c.md:43` "O10: agreed". The proposal as he saw it: `definition/process4_definition_v4.md:416-420`.) | His "agreed" to Claude's proposal |
| What a walk is measured against | D5:24, D5:25 quote his two definitions. D5:185 "So the UX Screens document and the UX journeys are kept in that folder of the product's repository. Checked by Claude: ... Which exact files each walk reads is Claude's to settle in the build." | First sentence his; the rest Claude's, and wrong in part (2.6 item 9) |
| How big a tranche is | D5:22 "**Tranche:** one batch of product work, built on the tranche branch, apart from the main branch, and reaching the main branch only as a whole." D5:176 "**Jobs.** Every module that has work gets its job." D5:231 "the 65 modules with real work led to about 177 jobs ... (estimated)". Nothing else | No size, content or scope is set by anyone |
| How many rounds | D5:23 "**Round:** one pass within a tranche: jobs, then the internal walk, then, if that finds no flaws, a deployment and the external walk." D5:189 "**Nothing bounds the number of rounds.**" | Claude's statement of fact |
| A tranche that never comes clean | D5:189 "You give the reason no tranche finished in Process3: it 'kept adding test after test'. So the risk that a tranche does not come clean is unmeasured for a process that does not grow. Only your word ends a tranche that will not come clean." D5:400 "Whether a tranche can end" is under "Only the first real tranche can show" | "Only your word ends ..." is Claude's unmarked addition (R:230) and sits against his own sentence (R:255). What then happens to the branch is unsaid (C:156) |
| When each walk is made | D5:204 "at the end of a round's jobs, or at any time on your word to the coordinator"; D5:183 "a walk happens when no job is open"; D5:181 "*Claude decided* the order: jobs, then the internal walk, and deployment only after an internal walk with no flaws." | Claude's; the first two cannot both hold (F:288) |
| The report | D5:313 "One report, written once by ARCH at the tranche's end" | Claude's |
| What is not built or proven | D5:13 "No walk of either kind finished without flaws in Process3 (measured), so that ending is unproven"; D5:364 nothing is built for "a walk shared among several sessions; deployment as a step in a round"; D5:392 trial item on shared walks | Stated honestly |

---

## 5. What is Bob's to decide, and what is technical

### Bob's (each with the options the audits name and the cost to him; I add no option of my own)

1. **What each walk is measured against** (A2:53-59; F:90-91; C:75; R:77-78).
   - (a) The claude.ai pages. Cost: nothing moves. Their history is outside git. Facts to weigh: one session opened them today; the Journeys page there is the oldest copy (27 journeys); the Screens page there is rebuilt and republished by sessions "whenever a DEC or BD changes a screen" (commit `922154ffd`, citing a coordinator's rule of 8 Nov).
   - (b) Files in the folder (the drift auditor's suggestion, C:69). Cost: "a restoring" (A2:59). Facts: the Journeys file exists on main and in git history; the Screens page's source is already there; the built page was kept out of git by a 1 MB cap (a Process3 setting, BD-5) and by his own approvals sentence "never committed".
   - (c) The machine data. Cost: "you cannot read it, and it describes more than is built" (A2:59): 135 of 679 acts are owed by rulings.
   - Whichever he picks, **which journey list counts** (27, 27 or 32) is part of it. No audit asked this; it follows from the facts in 2.3.
2. **Whether sessions may change what the walks are measured against** (A2:59; C:71, C:75). Either sessions may, "and a tranche's end rests on what sessions write"; or only he may, "and each ruling that something is 'as designed' waits for you". Facts the audits did not show him: his approvals of 5 Nov say design lanes "decide design and wording there"; a session's record has him answering "agreed" on 6 Nov to the lane deciding screens, flows and words beneath his direction, audiences and principles (2.5). Process4 has not yet defined lanes.
3. **What "without flaws" means.** He agreed to proposal 10. The drift auditor suggests different wording (C:70; A2:59): every journey in his journeys document followed to its end, none listed as a flaw, a note or "not walked". This changes something he agreed, so by his own rule it must come to him as a proposal. Cost of leaving it: the agreed wording "looks one walk back only" (judged, C:61). Cost of the change: notes and "not walked" entries then hold a tranche open (the last stored external walk had 36 notes).
4. **What a tranche contains** (A2:61-67; F:158; C:155). (a) All open work: no decision now; the first walk after about 177 jobs (estimated), carrying every flaw Process3 left. (b) A smaller content he sets for each tranche, saying which part of the documents its walks cover and whether an older flaw holds it open: a decision at each tranche, and "a clean walk of a part says less about the whole". The run audit judges this "the only lever in his hands that is not a new check" (F:158).
5. **A tranche that will not come clean** (A2:67; C:156; R:230, R:255). The draft's "Only your word ends" it is Claude's. If he does end one by his word, it is either merged with its flaws, which sits against his "So a release is always fully tested and walked successfully", or dropped. Nothing says which.
6. **Which journeys "all journeys" covers** (C:143, C:154; A2:110). Journeys 1, 28 and 29 begin at civicsmith.org or the installer **(V)**, which he put outside the tranche; six journeys have steps marked for the assistant only (6, 10, 17, 22, 29, 32) and journey 4 is connecting a Claude account **(V; the audits' "about nine" not re-derived)**, and he wrote "A tranche can end without an AI enabled run". The audits list this as a conflict between his own statements and do not choose.
7. **Who runs the walks** (A2:162-168; F:105-106; R:258). (a) Sessions, his hint. Cost: unproven; whether a session's browser can reach the development site is unmeasured; the walker may need changing first. (b) GitHub's machines, as his kept Ledger line and Process3 had it: that form ran; it sets his hint aside.
8. **The risk that one session decides "clean" and then merges** (A2:247; C:73). No remedy was found within his rules; "every stop the auditors could see is a check or a gate". His to accept as a stated risk or not. The same holds for a walk step that fails for no reason in the product (A2:248).
9. **Go-ahead for the one-off trials** (A2:234-235; C:153). They need sessions or deployments on his account, which the handoff says to ask about first.

### Technical (Claude's to decide and report)

- Which exact files each walk reads, once item 1 is answered (D5:185).
- Correcting D5:185 and "Checked by Claude" (A2:184; R:77); marking "Only your word ends ..." as Claude's or replacing it with the plain statement that the case is undefined (R:230); marking "So sessions run both" as a reading (R:187).
- Resolving the sentences that cannot both hold (F:288, F:290).
- Naming the session that deploys (F:105; A2:208).
- Whether a walk is shared among sessions or run by one, after the trial (F:105-106); any change to the walker.
- Telling him at each round's end what the walks listed and how many rounds so far (C:424; A2:215).
- Adding the missing items to the unbuilt and unproven lists (A2:222-223).
- Saying how long the first round is estimated to take before its first walk (F:158).

### What is proven and what is not

Proven (ran, measured): the folder's contents on both branches; who committed to it; five stored walks, none clean; the external walks were screen sweeps; the tranche never ended; both claude.ai pages can be opened read-only from one session. Not proven: that a walk of either kind can come clean; that a walk by journeys can be run at all, how long it takes, or what data it needs; that a session can run a walk or reach the development site; that the same walk gives the same answer twice on an unchanged build.
