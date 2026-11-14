# Three live documents read against the Process4 definition draft

Read 14 Nov 2026, about 01:00 to 01:15 UTC. Nothing was changed, published or written to any artifact or store.

Definition draft: `/home/user/handoff/process4_definition_main.md`, file time 2026-11-14 00:46:43 UTC.

## 0. What was read, and how

| # | Document | How read | State when read |
| --- | --- | --- | --- |
| 1 | Process4: Assessment and Recommendations, https://claude.ai/artifact/WLa8nNmD7AWtkgNswvnRTF | It is a Claude Docs document (doc id `ed94928a-ef50-407d-ae3b-4a9138ab5c6a`, one tab `fd125df5-0f9b`, body `517f50b3-f69f`). Read whole through the Docs connector. Plain-text rendering with block ids saved at `/home/user/work/assessment_doc.txt` (554 lines) | rev 52, complete. No comments (0 threads). Doc name is "Untitled"; date chip 2026-11-13 |
| 2 | Keep and Drop Ledger, https://claude.ai/artifact/W8TboyMGCLXCvrRkRWGQG8 | Page source (614 lines) read; store read with ArtifactData and saved under `/home/user/work/ledger_store/decisions/` (159 JSON files). The 5 Nov seed embedded in the page saved at `/home/user/work/ledger_store/page_seed_5nov.json` | page version 1794615258 = published 2026-11-14 00:14:18 UTC; private |
| 3 | Field report for Anthropic: Claude Code on an unattended build, https://claude.ai/artifact/SPmVhKHEhCvLD2LusiSEDb | Claude Docs document (doc id `cda24013-9dec-4f66-9fd7-0b4e152675e6`, tab `3b9c352f-a2ca`, body `fafdfd11-3c17`). Read whole, plus one read of an earlier revision (rev 760) of the requirements list | rev 1066, complete. No comments. Date chip 2026-11-13 |

Who typed what, and how sure:

- **Document 1 was typed by one writer only.** Every one of its 925 text runs carries the same writing-session id (`m64n0hyrfjc`), in 52 revisions. It is written in the first person as Claude ("I agree with the review's account"). So nothing in it was typed by Bob. Its "Decided by you" passages are a session's record of what Bob said.
- **Document 3 has two writers.** Session `m2a8nee470a` wrote the first draft (the doc says "This is a first draft, written by Claude"). Session `mrjjeq3zs0p` made the later edits, some of them one character per keystroke, which is a person typing in the editor. I take `mrjjeq3zs0p` to be Bob. The read does not name the person behind a session, and the doc is shared with anyone who has the link, so this is an inference.
- **Document 2's store has no author field.** Its write rule is "owner only". The page writes as the owner, and so would a session using the store tool on Bob's account. So the store cannot prove that Bob himself typed an entry.
- None of the three exposes a time for a doc edit. Docs give revision counters only. The store gives times (below).

## A. Bob's own words

### A1. The decisions of 13 and 14 Nov: a session's text, not Bob's typing

All of the following is in document 1, written by the session. It is quoted exactly. Where the session says "in your words", the text is still in the second person, so it is a transposition at best.

Section "The requirements everything must serve" (assessment_doc.txt lines 16 to 38):

> Four requirements, in your words of 13 Nov, shape everything about the process.
> - You enter no commands and edit no source files. Your only actions, very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules.
> - The process runs unattended. It waits for you only when it is completely blocked, with no further work possible until you act.
> - A product is a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and earlier modules' jobs run before later ones. When a job changes a module's interface, every user of that module is notified, so those modules' jobs are updated as needed and tested.
> - The build plan is designed around jobs running in parallel, bounded by a number you can change.

> Decided by you, 13 Nov: Process4 has three tests and no others.
> - Each job's own module tests, which include a check that the module's declared uses match its imports.
> - Notification of every user module when a job changes an interface, so those modules' jobs are updated as needed and tested.
> - A multi-session internal walk at the end of each round.
>
> No other test is necessary, ever. The internal walk replaces the full regression. A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that. Running a regression or a deploy-and-walk between layers was a check added during Process3 that gave nothing the existing checks did not.
>
> Kept Ledger lines this decision ends: the revert check (JOB-12), the gate on the merged result before merging (GAT-8), the full regression (GAT-7), layer checks (INT-4, ARC-4), artifact regeneration (GAT-4, JOB-8), tests asserting on text keys as a separate check (ARC-3), and mutation sampling (JOB-13). The check that declared uses match imports (ARC-1, P4) stays, inside each job's module tests.

> Decided by you, 13 Nov: no layers, strict order, eight job slots.
> - The layer construct is dropped. Scheduling comes from the total order and the declared uses alone.
> - Strict order. The order itself is strict: a module uses only modules before it. A job does not wait for the modules it uses to finish. A module's job is ready when the module has work and no open job, and ready jobs take free slots earliest in the order first.
> - Job slots default to eight, and you can change the number.
> - Slots are filled actively. The moment a job completes and merges, its slot goes to the next ready job. Nothing waits for a timer.

> Decided by you, 13 Nov, on interface changes, permissions and settings.
> - A change to a provider's interface says which parts of the interface changed. A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them.
> - Recognising that an interface changed must be proved rigorous and correct. A fault either runs users' jobs needlessly or leaves a module not updated when it needed to be.
> - Process3's permission management is preserved. It works in Auto mode and was reached by long trial and proof.
> - GitHub rulesets and other settings may be updated for Process4.
> - A use that points to a later module is an error in the design of those modules, to be fixed by refactoring them.

Section "Six questions the decisions leave open", then (lines 88 to 102):

> Your answers, 13 Nov.
> - Question 2, in part: a job writes only its own module's files. Kept.
> - Question 3: CLAUDE.md and settings.json continue to serve the purpose they did in Process3.
> - Question 4: the first session is ROOT. You start a session with the process repository mounted. Your first prompt says you are starting or restarting development of a named product, names that product's repository, and says the Process4 development process is to be used. It may suggest the model and effort, and may mention a switch from another account or other pertinent details. That session becomes ROOT for that development. The coordinator session is the front door. Before changing accounts, you tell the coordinator so it can stop development in that account.
> - Question 5: the maximum slot count changes when you tell the coordinator session the new value.
> - Question 6: you approve a public release. Updating the public release means updating the installer and the page of the website that refers to the current release and installer.
> - The cross-module mechanical pass is preserved. Some mechanical changes are so trivial that module tests need not be rerun. Tests run only when there is a fully informed reason to run them.

> Decided by you, 14 Nov.
> - Question 1: a process fix must not add a new test, gate, review or stop. It may only correct or remove what is broken.
> - Question 2: fresh-reviewer review is unnecessary and ends. What that does to permission management is being researched.
> - ROOT and the coordinator are different sessions. How they differed in Process3 is being researched.
> - ROOT starts with the product repository, and starts both the ARCH session and the coordinator session. This is the arrangement Process3 ran: jobs sit two levels below ROOT, inside the limit of three.
> - Merging stays with the process's merge tool, the route Process3 proved, on your instruction to preserve permission management. GitHub's own auto-merge is not used: the deny list blocks the command that enables it, and your approvals do not name that act.

> Settled 14 Nov. The Ledger line about when a layer closes (INT-4) ends, because there are no layers any more: your word. The hourly wake-up is kept exactly as Process3 ran it: once an hour an alarm wakes ROOT, which checks whether any work is stuck. That is a technical choice, made by Claude and reported here, not a question for you.

> Six modified Ledger lines carried wording that the coordinator wrote in as your word: PLT-2, PLT-5, ENF-6, INT-4, SES-15 and TXT-1. On 14 Nov you rewrote all six notes yourself in the Ledger, removing the attribution and keeping the substance, so five now stand as your own words. INT-4's note is now identical to PLT-5's, which looks like a paste slip and is waiting on you.

The six questions those answers refer to (lines 82 to 87), session's text:

1. "Process authority. ... Does 'every problem is an architecture bug; a workaround is not a fix' stand in full, or is a fix limited to correcting or removing, never adding a test, gate, review or stop?"
2. "Things that check or review but are not among the three tests. 'No other tests, ever' clearly ends the revert check, the test of the merged result and the artifact check. Does it also end fresh-reviewer review (INT-2, INT-7) and the rule that a job writes only its own module's files (ARC-2)?"
3. "Your approvals in CLAUDE.md. ... Confirm."
4. "Acts on Claude's side. Starting or replacing the first session, setting up the cloud environment and moving accounts are not GitHub or Cloudflare settings. Named exceptions, or must none of them be yours?"
5. "The job-slot number. Where do you change it: a repository variable in GitHub's settings, or by your word to the architecture session? And is eight per product or across the account?"
6. "Public-release approval. ... Does it stay?"

Quotations of Bob inside session text (documents 1 and 3):

- Document 1: `Your 5 Nov instruction ("we only add additional checks when we can confirm from factual study and data")`.
- Document 3, in the first-draft session's text: `His written instructions included "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". On 5 Nov he added: "We only add additional checks when we can confirm from factual study and data."`
- The phrase the definition quotes as Bob's word of 14 Nov, "there are no layers any more", appears in these documents only in the session's sentence above, with no quotation marks.
- The phrase the definition quotes from 9 Nov, "get rid of it completely", is in none of the three documents or the store.

### A2. The Ledger store: the nearest thing to Bob's own input

Each of the 159 documents is `{choice, note, at}`. Totals: 119 keep, 32 modify, 8 drop. 33 carry a note. All times UTC.

**The six notes changed on 14 Nov** (server `updatedAt` 00:15:25 to 00:17:37 UTC, version 2). In each, the wording that remains is the coordinator's wording of 3 Nov with the attribution cut away. What Bob did was delete, and in one case paste.

| Line | Stored `at` | Note now, exactly | What was cut from the 3 Nov text |
| --- | --- | --- | --- |
| TXT-1 | 2026-11-14T00:15:24.972Z | "hand-written means BOB writes and keeps the product's CLAUDE.md line by line, each line passing the per-line test, never by /init or a tool reading the repository, with no approval needed and each change listed in the tranche report; the approvals block stays Bob's own." | Front: `Bob's word, walk-through question 7, 1 Nov ("Yes, as recommended"): `. End: ` Recorded by the coordinator, 3 Nov, walk-through question 36.` |
| PLT-2 | 2026-11-14T00:15:41.967Z | "depend only on acts the committed approvals cover and that were measured to pass; archiving sessions and switching off or deleting tasks are housekeeping, counted and reported, never needed for correctness." | Front: `Bob's word in chat, 3 Nov (written here by the coordinator): ` |
| PLT-5 | 2026-11-14T00:15:57.611Z | "no session starts its own successor; depth stays at most 3 (coordinator, ROOT, BOB, job), as ran on 3 Nov when the explore and review jobs merged at depth 3. The watcher is started beside ROOT by whoever starts ROOT." | Front: `Bob's word in chat, 3 Nov, option A (written here by the coordinator): ` |
| INT-4 | 2026-11-14T00:16:24.338Z | Identical to PLT-5's note, character for character | The whole earlier note, which read: `Bob's word, walk-through question 3, 1 Nov ("Yes, as recommended"), with his ARC-4 note: a layer closes when every PR is merged and the layer's checks pass; whole-product checks run before a release or when Bob asks; the next layer starts at once. Recorded by the coordinator, 3 Nov, walk-through question 36.` |
| SES-15 | 2026-11-14T00:17:04.377Z | "BOB routes every request between spokes and translates only where a requester cannot use the answer as given; toward Bob it always explains each decision of his with context, options and a recommendation. Routing share measured after the first layer. " | Front: `Bob's word, settled 1 Nov (Foundations, open tension 4): `. End: `Recorded by the coordinator, 3 Nov, walk-through question 36.` |
| ENF-6 | 2026-11-14T00:17:37.407Z | "no /goal, since its check is a model reading the conversation; a stopped job is caught by status and the sweep." | Front: `native /goal with a mechanical condition (PR state on GitHub), no model judging the transcript. Superseded by Bob's word, walk-through question 2, 1 Nov ("Yes, as recommended"): `. End: ` Recorded by the coordinator, 3 Nov, walk-through question 36.` |

All six still show choice "modify". INT-4 is not marked "drop".

**Notes where Bob's wording differs from the page's printed suggestion** (so some of the words are his):

| Line | `at` | Choice | Note, exactly | What is Bob's |
| --- | --- | --- | --- | --- |
| REC-9 | 2026-10-31T01:40:57.170Z | keep | "Try this, but measure the experience with an open mind as to whether it's work or not." | All of it |
| JOB-14 | 2026-10-31T02:00:54.202Z | modify | "As suggested (keep) but the restarted session should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail." | All of it |
| ARC-4 | 2026-10-31T02:05:32.708Z | modify | "The architecture, ownership, format and coverage checks run only against the job's module in its gate, layer checks when a layer closes, and over the whole product before a release or when I ask for one." | All of it (not the page's text) |
| SES-8 | 2026-10-31T02:15:50.439Z | modify | "Models, effort, and permissions mode come from one table, picked by the start command; always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand." | Added "permissions mode" twice |
| SES-14 | 2026-10-31T02:18:57.727Z | modify | "Suggest: a lane is a knowledge directory and design responsibility plus an on-demand worker BOB starts with that directory as its reading set; a long-lived lane only where measured worthwhile. The lifecycle of a lane includes refreshes that BOB manages to keep the session depth consistant." | Added "and design responsibility" and the last sentence |
| SES-16 | 2026-10-31T02:20:10.269Z | modify | "Suggest: I'm skeptical, but let's measure on the first tranche, comparing tokens per wake against the handoff cost already paid." | Added "I'm skeptical, but let's" |
| TXT-4 | 2026-10-31T02:22:20.213Z | modify | "Suggest: I'm skeptical, but let's try to apply TXT-2 to the principles too; most roles need two or three of them." | Added "I'm skeptical, but let's try to" |
| MNT-8 | 2026-10-31T02:29:38.112Z | modify | "Certification is a long-term goal that indicates that it's ready for general use. Suggest: one shadow of a representative slice, then the live first tranche is the certification with SES-11 and SES-12 measured; a full 128-module shadow per release is itself a token sink." | Added the first sentence |
| P1 | 2026-11-03T16:58:45.275Z | modify | "Keep as Process3's purpose, with my 3 Nov words added: quickly and cheaply, behaviour that survives, my time only where it is mine." | "your" changed to "my"; last sentence of the suggestion cut |
| P2 | 2026-11-03T16:59:30.646Z | modify | "The build state is what tells BOB what to do. Process3 keeps requirements and layers at the product's own paths, so one subtree becomes the paths the product's config names." | Cut down from the suggestion |
| P3 | 2026-11-03T17:00:40.088Z | modify | "Development under Process3 is development of that product, not of Process3. A serious enough flaw pauses the product, Process3 is fixed separately, and the product resumes on the fixed version. Changes during Process3's own first build are expected." | Cut "Your word, 3 Nov:" and one cross-reference |
| P19 | 2026-11-03T17:08:04.307Z | modify | "Keep. PLN-2 holds the plan rule and SES-17 a nudge, but BOB never idles and never stops for Bob were lost. Drop overcome by code where it would mean a hook: the mechanism is the tool naming the next act and the sweep's wake, never anything that holds a turn (ENF-1, ENF-3), and it must be shown efficient and effective (my word, 3 Nov)." | "your word" changed to "my word" |
| P21 | 2026-11-03T17:08:54.249Z | modify | "Keep for questions that are Bob's by P17 only. Lanes stay as SES-14 (modify) and SES-15 settled them." | "yours" changed to "Bob's" |
| GAP-1 | 2026-11-03T17:28:09.576Z | modify | "A tranche CAN RUN from open to close with no one watching: every stop is a named blocker in the record, BOB starts other work meanwhile, and only a blocker that only Bob can clear reaches him." | "runs" changed to "CAN RUN" |

**Notes that are the page's suggestion text, unchanged or with only "Suggest: " removed** (session-drafted wording that Bob accepted): ENF-1, REC-1, REC-8, REQ-6, JOB-7, JOB-13, SES-1, MNT-1, P7, P10, P13, P17, P20. Exact texts are in the store files. P17's note still reads "Your word, 3 Nov: ...", which shows it was not reworded.

**Drops** (no note): ENF-4, ENF-5, REC-12, INT-6, MSG-7, MNT-2, MNT-12 (all 31 Oct), P16 (3 Nov).

Caution on all entries dated before 14 Nov: this page was republished on 14 Nov at 00:14:18 UTC from a 5 Nov export, and the store was filled 4 seconds later (00:14:22 UTC, version 1) from the copy of Bob's answers embedded in the page by a session. The `at` values were carried over. So those 153 entries are a session-carried copy of Bob's answers, not the original writes.

### A3. Field report: what the editing person typed

Text typed by session `mrjjeq3zs0p` (taken as Bob) is in **bold**. The rest is the drafting session's.

- Opening paragraph: "Over nine days **earlier this month**, Claude Code sessions **were used** to build a **software workflow** under a **custom development** process **called process3. During that time, under a rigorously structured charter for maintaining process3, CC** merged 294 changes to that process, grew it from 3,120 to 24,897 lines, and **along the way** cut **the workflow** product landings from 135 a day to 7**, and zero on the 9th day**. The owner had told **CC repeatedly** not to add checks **that reduced development velocity** without evidence **of an absolute necessity**. Both repositories**, the workflow and process,** are public and are the evidence."
- Second paragraph: "**The owner recognizes the complexity of Anthropic's myriad sets of requirements that compete for recognition and balance in the released products that are Claude and Claude Code.** He also sees several fundamental tensions that are improperly balanced in the current **Claude and Claude Code** product**s** that make it **unnecessarily** difficult for users to achieve their real-world objectives. This document attempts to describe those challenges concisely and to **constructively** suggest changes that rebalance product objectives and significantly improve product capabilities."
- Section "What the process is required to do" (heading and list first written by the drafting session in one revision, rev 723; the person then edited):
  - "Four requirements shape everything about process**3**, from its architecture to its operation."
  - "The user enters no commands and edits no source files. The only actions he takes, and those very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules. **The intent is to reduce the skills needed when using CC for production-level workflow development.**"
  - "The process runs unattended. It waits for the user only when it**'**s completely blocked, with no further work possible until he acts."
  - "A product is **constructed from** a total order of modules. A module's services can be used only by modules that follow it. Each module is updated and tested by a single job, and the jobs of earlier modules run before those of later ones. When a job changes a module's interface, every user of that module is notified, so the jobs for those **user** modules are updated and tested **as needed**."
  - "The build plan is designed around jobs running in parallel, with the number **(default: 20)** running at once bounded by a figure the user can change."
- Next paragraph: "Meeting these requirements needs a process that is not interrupted by permission refusals, by Claude stopping short of the work it could do, by the **detrimental costs** of scanning handoff **document**s, by every user utterance being turned into a new rule until the rules overflow, or by over-caution that piles tests, reviews, gates and checks layer upon layer until development velocity drops to zero. Each of those interruptions occurred **in all versions and are referred to as "the vortex" that every workflow development invariably falls into.**"
- "**With the owner acting as product manager and process3 the** engineer, **the process** used Claude Code cloud sessions in Auto mode to continue building Civicsmith, ..."
- "Claude drafted the process design from the owner's **rigorous and highly structured** requirements **and principals**. **During process3 visioning, architecting, and development,** Claude assured **the owner** repeatedly that it would not repeat the faults of t**wo** earlier **development process** versions."
The field report holds no decision about Process4. It is addressed to Anthropic and speaks of Process3.

## B. The 13 items of section I and the 7 questions of section K

"Not answered" means no yes or no from Bob in the three documents or the store after the evidence the definition cites. Ledger answers of 31 Oct and 3 Nov are the earlier answers the definition is asking him to revisit, so they are listed as "bears on it".

### Section I

| # | Item | Answered? | Bears on it |
| --- | --- | --- | --- |
| 1 | The job's written receipt | Not answered | Store, JOB-7, 2026-10-31T01:55:18.818Z, modify, note "Suggest: Evidence is a machine-readable receipt (command, exit code, git SHA, and an explicit not-verified list), never prose." (the page's own suggestion text, unchanged). Document 1, session text: "Receipts (JOB-7). 17 red results and no catch in 1,187 gate runs; removed, restored and removed again." and "You said you are open to these." The 9 Nov words "get rid of it completely" are not in these documents |
| 2 | The set-up check before every job start | Not answered | Store, PLT-9, 2026-10-31T01:27:36.236Z, keep, no note. That line puts the check "at every tranche open" and says "never a step midway". Document 1, session text, names "the setup check before every job start" among "the strongest candidates to end on evidence" |
| 3 | The size cap on a module's requirements file | Not answered | Store, REQ-6, 2026-10-31T01:50:10.532Z, modify, note "Suggest: a cap that triggers a split or consolidation by BOB before any job starts, measured on the real product; never a refusal at a job's start." (suggestion text, unchanged). Store, P6, keep (a module fits in one reading). Document 1 says the repair of the module-order loop "depends on two things that are yours: agent-worker's requirement file would exceed the 70,000-byte cap (it is at 69,818), and agent-worker still relays a sign-in to routes agent-runner has retired." |
| 4 | Recording each job attempt's reading list and cost | Not answered | Store, JOB-10, 2026-10-31T01:56:53.633Z, keep, no note. Store, SES-9, keep ("named unmeasured, never estimated") |
| 5 | The check on oversized files and temporary folders | Not answered | Store, REC-10, 2026-10-31T01:41:41.273Z, keep, no note. Store, REC-1 note ends "add the size check in REC-10." (suggestion text) |
| 6 | The job record as a strictly formatted data file | Not answered | Store, REC-9, 2026-10-31T01:40:57.170Z, keep, note in Bob's wording: "Try this, but measure the experience with an open mind as to whether it's work or not." Document 1, session text: "The JSON ledger with one mutable field (REC-9). Cut on 9 Nov." |
| 7 | Every rule must cite a measured failure or your decision | Not answered | Store, TXT-6, 2026-10-31T02:23:09.364Z, keep. GAP-3, 2026-11-03T17:30:37.399Z, keep. P16, 2026-11-03T17:06:37.450Z, drop. Document 1, session's record of 14 Nov: "a process fix must not add a new test, gate, review or stop. It may only correct or remove what is broken." |
| 8 | A line-by-line test of instruction files in place of a size limit | Not answered | Store, TXT-2, 2026-10-31T02:21:15.837Z, keep. TXT-4 note: "Suggest: I'm skeptical, but let's try to apply TXT-2 to the principles too; most roles need two or three of them." The rewritten TXT-1 note still says "each line passing the per-line test" |
| 9 | "Nothing is ever refused for size", for the process's own texts | Not answered | Store, SES-6, 2026-10-31T02:13:54.395Z, keep, no note |
| 10 | The reading audit | Not answered | Store, REC-8, 2026-10-31T01:39:09.293Z, modify, note "keep the audit, but judge reading by what a session can cite from the end of a document, and shrink documents so the question rarely arises." (suggestion text less "Suggest: "). P20, modify. Document 1, session text: "The reading audit (REC-8). Never built." |
| 11 | The start-up check on your approvals | Not answered | Store, GAP-6, 2026-11-03T17:32:32.406Z, keep, no note ("the start check confirms each session loaded the tip's"). Document 1, session's record of 13 Nov: "Process3's permission management is preserved." and "CLAUDE.md and settings.json continue to serve the purpose they did in Process3." Withdrawn recommendation C11 said to remove it |
| 12 | Deploy tokens held as settings of the Claude cloud environment | Not answered | Store, PLT-9, keep. Withdrawn recommendation G10 would have moved them to GitHub environments. Nothing from Bob |
| 13 | Running module tests in two parts | Not answered | Nothing in any of the three documents or the store |

### Section K, "For you to decide"

| # | Question | Answered? | Bears on it |
| --- | --- | --- | --- |
| 1 | Two checks beyond the three tests (the own-files check at merge; install and upgrade tests before release) | Not answered, either part | Document 1, session's record of 13 Nov: "Question 2, in part: a job writes only its own module's files. Kept." That keeps the rule and says nothing of the check. Store, ARC-2, 2026-10-31T01:44:59.423Z, keep. Install and upgrade tests are not mentioned in the three documents |
| 2 | Set-up acts on the Claude side | Not answered | Document 1 asked it as question 4 ("setting up the cloud environment and moving accounts"). The recorded 13 Nov answer covers starting ROOT and telling the coordinator before an account change, and is silent on creating the cloud environment and connecting GitHub. Store, P17 note (suggestion text, unchanged): "Keep it whole after onboarding; no Ledger line holds it today. Your word, 3 Nov: during onboarding the platform forces a few GitHub steps of yours; keep those as few as possible, each walked through." Field report, left standing by the editor: "The only actions he takes, and those very occasionally, are changes to GitHub or Cloudflare settings: permissions and rules." |
| 3 | Approving one particular merge | Not answered | Store, GAP-10, 2026-11-03T17:35:54.974Z, keep, no note ("a green gate merges without Bob, who approves a particular merge only when he asks to") |
| 4 | The judge of the process | Not answered | Store, SES-12, 2026-10-31T02:16:49.107Z, keep, no note |
| 5 | The external walk: who decides, and do its findings open a new tranche | Not answered | Document 1, session's record of 13 Nov: "An optional multi-session deploy-and-external-walk runs after that." Store, P22, 2026-11-03T17:09:02.447Z, keep; GAP-7, keep |
| 6 | Eight slots: per product or per account | Not answered | Document 1 asked "And is eight per product or across the account?" The recorded answer is only "the maximum slot count changes when you tell the coordinator session the new value." Store, PLN-7, keep ("Two products may run tranches at once on one account"). Field report, typed by the editor: "(default: 20)" |
| 7 | Reordering by your word | Not answered | Document 1, session's record of 13 Nov: "ready jobs take free slots earliest in the order first". Store, PLN-3 and PLN-5, keep |

Nothing in the store or the documents is a newer answer to any of the twenty.

## C. Contradictions with the definition, and anything newer

**Nothing in the store is newer than the definition.** Newest store write: ENF-6, `at` 2026-11-14T00:17:37.407Z (server 00:17:37.549Z). The definition file is 00:46:43 UTC. The two docs expose no edit times, so I cannot say whether rev 52 of document 1 or rev 1066 of document 3 is older or newer than the definition.

Points that differ from the definition draft:

1. **Six notes, not five; and INT-4 is unfinished.** Definition, section K: "you rewrote in your own hand the five notes that a session had written in as your word." The store shows six notes changed. Document 1 says "five now stand as your own words. INT-4's note is now identical to PLT-5's, which looks like a paste slip and is waiting on you." The store confirms the two are identical, and INT-4 still reads "modify", not "drop". The definition treats INT-4 as ended and does not mention the slip.
2. **"In your own hand" overstates it.** The remaining wording of all six notes is the coordinator's, with the attribution deleted (table in A2).
3. **The rewritten notes still use Process3 terms the definition ends.** PLT-5 (14 Nov): "depth stays at most 3 (coordinator, ROOT, BOB, job) ... The watcher is started beside ROOT by whoever starts ROOT." The definition has ROOT starting the coordinator and ARCH, has no watcher, and ends the name "BOB". ENF-6 (14 Nov) relies on "status and the sweep". SES-15 (14 Nov): "toward Bob it always explains each decision of his with context, options and a recommendation", where the definition makes the coordinator the front door. TXT-1 (14 Nov) keeps "each line passing the per-line test", which is item I8, recommended to end.
4. **Which repository ROOT starts on.** The 13 Nov record says "You start a session with the process repository mounted." The 14 Nov record says "ROOT starts with the product repository". The definition follows the later one. Both are session text in the same document, and the earlier one has not been struck.
5. **Lines the 13 Nov decision is said to end.** Document 1 lists as ended: JOB-12, GAT-8, GAT-7, INT-4, ARC-4, GAT-4, JOB-8, ARC-3 ("tests asserting on text keys as a separate check") and JOB-13. The definition's section H matches for the revert check, the second run and the built-files check. But the definition's appendix (`process4_definition_appendix.md`, line 27 and rows 110, 116, 120) still lists JOB-12, GAT-4 and GAT-8 as "Open point for the owner" under K1, and lists ARC-3 and JOB-8 as "Kept".
6. **Counts.** Document 1: 198 kept, 45 purpose kept, 9 ended, 17 candidates, 19 conflicts "raising six questions". Definition: 208 stand, 45, "Fifteen lines end", 17, and seven questions. The definition is the later reckoning; the document has not been brought into line.
7. **The loop repair is called Bob's in document 1 and Claude's in the definition.** Document 1: the simplest repair "depends on two things that are yours" (the 70,000-byte cap, and a sign-in relay to retired routes). Definition, technical point 8, puts the repair with Claude and says "Nothing a user sees changes."
8. **Default number of parallel jobs.** The field report's editor typed "(default: 20)" into the requirement on parallel jobs. Document 1 records "Job slots default to eight". The definition says eight, and says the earlier documents' default was 24 live sessions. The field report is describing Process3, so this may not be a Process4 decision, but 20 matches neither figure.
9. **"Earlier modules' jobs run before later ones."** This clause stands in both the 13 Nov four requirements (document 1) and the field report as the editor left it. The definition says a job "does not wait for the modules it uses to finish" and gives the earliest ready module the free slot. Document 1 reconciles the two ("My earlier reading of strict order ... was wrong and is withdrawn"). The clause itself is unchanged in both places.
10. **Bob's acts.** The four requirements say his only actions are settings changes in GitHub or Cloudflare. The definition's list has five acts, four of which are not settings changes (committing the approvals, starting ROOT, telling the coordinator, approving a release). Document 1 records answers that allow starting ROOT, telling the coordinator, and approving a release, and asks him to "Confirm" the CLAUDE.md commit (recorded answer: "CLAUDE.md and settings.json continue to serve the purpose they did in Process3").
11. **Two quotations in the definition cannot be checked here.** "there are no layers any more" (14 Nov) and "get rid of it completely" (9 Nov): see A1.
12. **Document 1 still carries the withdrawn proposal** (process changes only by Bob's merge, GitHub auto-merge, 24 live sessions, a layer's jobs starting together, removal of the approvals check). It is marked "Withdrawn" and "Superseded" at the head of those sections, so it is not a live contradiction, but the text is all still there.

Figures in the field report agree with the definition where they overlap: 41% and 41%, 11 of 11 declined, 218 of 220 jobs, the 4,096-byte cap holding, 102 version moves in six days (116 over nine in document 1), no deployment passing the walk (0 of 12).

## D. Shape of the Ledger store

- One collection, `decisions`. Access rule: read by anyone who can view, write by the owner only. Collections `answers` and `data/users/me` are empty.
- 159 documents, one per ledger line, id = the line id. Families: PLT 10, ENF 7, REC 12, ARC 5, REQ 7, PLN 7, JOB 14, GAT 8, INT 7, SES 18, TXT 7, MSG 7, MNT 12, SHM 5, P 21 (P1 to P13 and P16 to P23), GAP 12. Every line on the page has a document and there are no extras.
- Fields: `choice` ("keep", "modify" or "drop"), `note` (free text, empty string when none), `at` (ISO time the page wrote when the answer was made). The server adds `version` and `updatedAt`.
- By `at` day: 31 Oct, 120; 3 Nov, 33; 14 Nov, 6. Oldest `at`: PLT-1, 2026-10-31T00:54:23.113Z. Newest: ENF-6, 2026-11-14T00:17:37.407Z.
- All 153 version-1 documents have server `updatedAt` 2026-11-14T00:14:22Z: the page seeded them from its embedded copy. The six version-2 documents are the 14 Nov edits.
- To find Bob's answers: list `decisions`; non-empty `note` gives the 33 notes; `at >= 2026-11-05` gives the six 14 Nov edits. To see what a note said before 14 Nov, read `const SEED` on line 485 of the page source (saved copy: `page_seed_5nov.json`).
- The line statements, sources, evidence grade and suggested choice are in the page source (`const ITEMS`), not in the store. Eight answers differ from the page's suggestion: PLT-2, PLT-5, ARC-4, JOB-14, INT-4, SES-8, TXT-1, GAP-1.
- This ledger has 159 lines. The definition counts 288 requirement lines, so the other 129 (Foundations lines and the like) are not in this store. Any Keep and Drop answers Bob gave after the 5 Nov export, on another page, are not here either.

## E. What could not be read

- **Times of edits to documents 1 and 3.** Only revision counters are exposed.
- **Who is behind each writing session in the two docs.** Session ids only.
- **Authorship of store writes.** No author field.
- **Earlier revisions.** Not read, except one list in document 3 at rev 760. Deleted text in either doc was not recovered.
- **The viewer pages of documents 1 and 3** were not read. They hold no content of the documents.
- **The ledger page source** was read in full except that the embedded answers on line 485 were parsed by script rather than read by eye.
- Nothing was refused. One read with an invalid option was rejected and not needed.
