# Build text 3. How a walk is made

Length: 198 lines. Last section: "9. The owner's to settle".

Written by Claude on 18 Nov 2026. **Status: proposed. Nothing here has run.** It stands beside the seventh draft of the design (`process4/definition/process4_definition_v7/`, "the design" below) and answers item 9 of its part 10, section 2. It changes no rule of the design and adds no test, check, gate, review or stop. Words in quotation marks are the owner's unless a line says otherwise. Reconciled the same day with build texts 1 and 2 and with the design; the tool's commands named here are in build text 1, section 4.

Marks: **Decided here:** a choice made in this text, with what it gives and costs. **Unproven:** never shown to work. **Owner's:** his to settle.

## 1. What is recorded, and what is not

**Measured, in the records of the process before this one.**

- Its walks were a program, not sessions. One product module, a Playwright walker, had a local arm and a live arm (`evidence/levers_github_cloudflare_product.md`, section 7). The late runs recorded were on GitHub's machines.
- The local arm ran the built product on the one machine, with a stand-in for the AI model, no deployment and no secret; its time limit was 45 minutes (`working/trial_plan_facts.md`, J11).
- The live arm first took a fresh deployed copy through the product's own first-use door, invited a member, and kept the sign-in in a file outside the repository.
- Steps: internal 238 and then 357 within one round; external 175 and then 157. Failures: internal 63 and then 96; external 1,691 and then 178, with 147 of 157 steps still failing (`evidence/product_side.md`). All 12 development deployments ended failed, 10 at the walk. No walk ever passed.
- The two late runs of deployment with walk took 60 and 64 minutes. The deployment's share of that is not recorded.
- The internal arm once left out page checks the live arm made, and 1,690 page faults were first seen live (`evidence/DECISIONS.md`).
- The walker's reports and screenshots were committed: 13,017 files and 431 MB under one folder.
- The owner, 8 Nov: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account". The earlier setting was 85% of the tightest published limit. How many walkers the account bears was never measured.
- The owner, 9 Nov: "The first run or two of the external system will run without without an AI account connected." A journey that uses AI was then reported as not walked, never as passed or failed.

**Recorded about the product's documents** (`definition/process4_definition_v6.md`, line 273; `definition/process4_five_points.md`).

- The owner, 14 Nov: "screens and journeys are kept in docs/development/ux-substrate/ in the product repo".
- On the product's main branch the folder held 133 files, a Screens page and a Journeys page among them. On the building branch the Journeys page was removed on 6 Nov; the Screens page there is a copy of 28 Oct, with the data it is built from.
- Three lists of journeys disagree: 27, 27 and 32. Of the 32, three begin at the website or the installer and six have steps only the AI assistant can do. Which list counts is open with the owner.
- Not recorded: how many screens there are, and how large either document is.

**Seen today, on this session's machine only.** Headless Chrome driven by Playwright 1.63 opened a page served on the same machine in under a second, and an outside page through the machine's proxy. One try. A cloud environment has a list of allowed hosts.

**Not measured.**

- Any walk made by a session. The design says none ever was. One line of the evidence says the earlier process's walkers were sessions driving a browser; no report of such a walk was found.
- A product built and served on a session's machine. The product in the records needs a newer Node than the machine examined had.
- A session's browser reaching a development site.
- How long a deployment takes from a session; what a walking session costs.

## 2. Areas

The design fixes what an area is: for the internal walk a screen or a named group of screens, for the external walk a journey.

**Decided here:** the walks' documents are kept as one page for each group of screens and one page for each journey, each under the single-text maximum, with an index page. A group's name is its page's name. Gives: a walking session reads the pages of its areas in full and nothing else, and a group needs no second definition. Costs: the UX lane must shape the documents this way; the product in the records does not have them so, and that is conversion work.

**Decided here:** how ARCH names a round's areas.

1. The tool (`walk areas`) lists the round's changed modules: those whose pull request merged in the round, and those a notice was sent to, whether or not they then changed.
2. For each, the tool lists the screen pages and journeys named in the headers of that module's steps (section 3) and in the endings of its requirement text (build text 2, section 4).
3. A changed module that names none takes the areas of its users, followed upward until modules that name some are reached.
4. That is the candidate list. ARCH adds an area where it doubts how a change will show (the design, part 3, section 3), and may take one away. Each added or removed area carries one line of reason.
5. In the round that would end the tranche, ARCH adds the journeys the design's reading of part 3, section 5 calls for.
6. ARCH's session writes the list into the round record (`state write`) before any walking session starts: internal areas and external areas, each with its source and the number of the walking session given it.

Gives: the list is made the same way every round, and the judgment in it is visible. Costs: a deep module can pull in most of the product, and only ARCH's judgment trims that. **Unproven:** that requirement text and step headers name enough for the list to be right.

## 3. Steps

**Decided here:** a step is a small program that drives a browser through one thing a user does and states what must then be so. It is kept with the module whose requirement it proves, under that module's `tests` paths, in `walk/internal/` or `walk/external/`. The module's test command never runs those two folders (build text 2, section 3). Its first lines are fixed:

```
requirement: <module> <requirement number>
follows: screen <page> / <screen> / <part>     (internal)
follows: journey <page> / step <number>        (external)
expects: <the document's own words for what must be so>
```

- **Who and when.** The module's job writes the step in the same pull request that meets or changes the requirement. A job given a flaw corrects or adds the step that shows it. ARCH, writing requirement text, names the screen or journey step a requirement serves, by the text's ending (build text 2, section 4), so the job knows what to follow.
- A step runs only in a walk. A job may run its own step on its own machine while it works; nothing requires it and nothing reads the result.
- The program that runs steps and serves the product on one machine is itself product code in a module ARCH names. A journey's order comes from the step numbers in its page.
- A step that proves no requirement, or serves the process, is not allowed (the design, part 2, section 6).

Gives: a step changes with the code it proves, under the rule that a job writes only its own module; no walker module gathers every flaw. Costs: a journey's steps are spread over many modules; a journey step no module's requirement covers has no home until ARCH writes the requirement.

**Decided here:** a walk is measured against the document, not against the steps. The walking session reads each page of its areas in full. Whatever the page says that no step covers, the session walks by hand in its browser. Gives: a missing or loosened step is met by the walk itself, with no check added. Costs: session time; and for a part walked by hand the record is the session's own words.

## 4. The internal walk

1. ARCH starts each walking session from the newest commit of the tranche branch. Its starting instructions, which the tool fills in (`walk text`), name the walk, the walk issue and the process config, where its two commands are; its areas stay in the round record, which it reads (`state read`).
2. The session builds the product on its own machine. Built files are not committed.
3. It serves the product there with the product's own local command, with the product's stand-in wherever a screen needs an AI answer, and with no secret.
4. For each area it reads the Screens page in full, runs that page's steps, and walks by hand what no step covers.
5. It compares what is on each screen, each state the page names, and where each action leads, with the page's words. A difference is a flaw of the first kind. Anything else it notes is an observation.
6. It writes its record (section 6) and sends ARCH one message.

A walking session starts no workers. At the fill level it writes its last lines in the walk issue, tells ARCH and stops, and ARCH gives the areas not yet walked to a fresh session (the design, part 4, section 11). It has no commit and no branch.

**Decided here:** the process config holds two commands (build text 2, section 7, `walk`): the one that builds and serves the product on one machine, and the one that runs named steps against an address. A walking session reads them there: its starting text names the process config, and is filled in with names and addresses only (the design, part 4, section 11). Costs: two more entries in the process config; the design's list for it now names them (part 0, section 6).

**Decided here:** one area is one command, started in the background. Where an area's steps run longer than twenty minutes, ARCH makes it two areas. Gives: room inside the about thirty minutes a session can run one thing. **Unproven:** all of this section.

## 5. The external walk

**Reaching the deployment. Decided here:**

- ARCH's session deploys one copy for each external walking session, under fixed names in the development account, used again every round: removed, deployed afresh and seeded, with the commands of the process config's `deploy` group (build text 2, section 7). The names and addresses are written in the round record.
- The walking session takes its own copy through the product's own first-use door and so makes its own sign-in. No sign-in passes between sessions or is written anywhere.
- The owner enters the copies' hosts once among the cloud environment's allowed hosts (build text 4, section 4). The browser is on the session's machine and uses its proxy.

Gives: journeys that change data cannot disturb another session's journeys; fixed names mean the allowed hosts are set once. Costs: several deployments each round, of unknown length, and more of the account's room. If that is too much, the other form is one copy, with ARCH giving each session journeys that do not touch the same data. **Unproven:** every part; and whether a product's first-use door allows it is a fact of the product.

**Following a journey.** The session reads the journey's page in full, runs its steps in order from start to end, and walks by hand what no step covers. A journey that cannot be taken to its end is a flaw of the second kind, recorded at the step where it stopped. A journey that ends with a result that is not what the page says is a flaw of the third kind.

**Journeys that use AI.**

- Such a journey is named as an area only once the owner has connected an AI account to the deployment (the design, part 1, section 3). Until then ARCH leaves it out, and the account after the round names it as not walked.
- **Decided here:** the result of a step that uses AI is judged as the design judges a module test: it does not fail for a different but still valid answer. The step's `expects` line gives the journey page's own words for what any proper result has, and the walking session judges by reading the result. Costs: this is a session's judgment and can differ between sessions.

**How many sessions, and the account's limits. Decided here:**

- The number of external walking sessions is the least of: the free slots, the number of external areas, and a figure in the process config for the most external walkers (`walk.most_external_walkers`). That figure begins at one. ARCH raises it by its own judgment, with the owner's caution before it: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".
- Each walking session drives one browser and follows one journey at a time.
- A refusal by the hosting provider for a limit is not a flaw. The session stops, records the area as not walked with the provider's words, and tells ARCH, which lowers the figure.

Gives: the owner's caution is kept by starting low. Costs: early external walks are slow. **Unproven:** all of it. What bears the cost of the AI account's use in a walk is not known.

## 6. The record, a flaw and an observation

**Decided here: where.** For each walk ARCH's session, by the tool (`walk open`), opens one issue in the product's repository, the walk issue, titled with the tranche, the round and the kind of walk, and writes its number in the round record. Each walking session writes one comment there by the tool (`walk write`), its own, rewritten in place as it goes. It sends ARCH its message only after its last write.

Gives: what ARCH needs is saved before the message; each comment has one writer; nothing is a file or a commit; the tranche report can count flaws from GitHub. Costs: one closed issue for each walk stays on GitHub, as a job's pull request does. The design's rule on messages names the walk's own issue (part 4, section 8). **Unproven:** the size a comment holds.

**The comment's form.**

```
<hidden mark: walk, session number>
walk: <tranche> / <round> / internal or external
built from: <commit>            copy: <name, external only>
area: <page or journey> | walked to the end | flaws: <n>
area: <page or journey> | not walked | <reason>
```

followed by its flaws and then its observations.

**A flaw's exact form.**

```
flaw: <tranche>-<round>-<I or E>-<session>-<n>
kind: does not match the Screens document | journey cannot be completed | journey completes with a wrong result
area: <page or journey>
where: <screen and part, or journey step number>
the document says: "<its exact words>"
the product did: <what was seen, plainly; any error text exactly>
how: <the step's file, or "by hand" and the actions in order>
seen twice: yes or no
module, as the walker guesses: <from the step's requirement line, or "not known">
```

**An observation's form.**

```
observation: <same numbering, with O>
area: <page or journey>
noted: <one to three lines>
```

Among observations: a part of a page that no step covers and that matched when walked by hand; words in a document that can be read two ways; something slow or ugly that the document does not speak of.

**How ARCH turns a flaw into work.** ARCH reads the whole walk issue (`walk read`). For each flaw it does one of three things.

1. **Work for a named module.** It names the module: the one in the step's requirement line; for a part walked by hand, the module that owns the screen's code in the module list; where the step itself is wrong, the module that holds the step. Where no requirement covers what the document says, ARCH first writes one, marked not yet met. ARCH's session, by the tool, writes the flaw's number, the module and a link to the comment into the waiting-work record (`state write`). The job block on its pull request carries them, and the job reads the flaw where it lies (`walk read`).
2. **The document is wrong.** ARCH gives it to the UX lane, which corrects the page. It is named in the account after the round.
3. **It is none of the three things.** ARCH sets it aside with one line of reason. **Decided here:** each flaw set aside is named in the account after the round with that reason. Costs: ARCH judges entries about a product it designed; the account is what lets the owner see it.

Observations go into the same account. ARCH may write a requirement from one. When ARCH has placed every entry, its session closes the walk issue (`walk close`).

## 7. "Without flaws", and what the tool needs

**Decided here:** a walk as recorded is without flaws when both are so:

- every area in the round record has a line, written by the session given it, saying "walked to the end";
- no flaw stands: every flaw written was set aside by ARCH with its reason, or none was written.

An area with no line, or marked not walked, means the walk is not finished. ARCH gives the area to a session again. That is the design's "the areas it was given", and no added stop. A flaw given to the UX lane still counts in that walk: the document was wrong, and the corrected page is walked in the next round.

**The tool judges nothing.** ARCH writes the outcome, through the tool, into the round record: each area as clean, flawed or not walked, and one line for the walk, without flaws or not. From the walk the tool needs only fixed-form lines it can copy: the hidden mark, the area lines, and each flaw's number with the module ARCH named. It opens and closes the walk issue (`walk open`, `walk close`), writes a walking session's comment (`walk write`), prints the issue (`walk read`), and writes ARCH's placements into waiting work and ARCH's lines into the round record (`state write`). These are acts of the design's list (part 6, section 5). It never judges a flaw's words and never refuses a deployment or an end of tranche. ARCH's session deploys after ARCH has written that the internal walk is without flaws.

## 8. To try first in the trial repository, smallest first

1. One session builds a made-up product of two screens on its own machine, serves it, and opens it in its browser.
2. That session runs one internal step and walks one part by hand against a one-page Screens document with a planted mismatch, and writes one flaw in the form above.
3. The tool opens a walk issue; the session writes its comment and rewrites it; ARCH's session reads it and writes one waiting-work entry.
4. A job started from that entry finds the flaw, fixes it and corrects the step.
5. ARCH names areas from two changed modules and one notice. The changes are planted so that the areas they touch are known beforehand, and ARCH's list is compared with those.
6. ARCH's session deploys one copy from a session, in steps, each timed.
7. A walking session's browser reaches that copy, takes it through the first-use door, and follows one journey to its end.
8. Two walking sessions walk two copies at once; the hosting account's use is read before and after.
9. Three or more sessions share one internal walk by area.
10. One journey that uses AI, once the owner has connected an account.

Items 6 to 8 are the design's trial items 8 and 14 made smaller. A trial can break these choices; it cannot prove them.

## 9. The owner's to settle

1. **Which list of journeys counts, and the form of the two documents.** Open already (the design, part 10). Section 2 here needs the documents as pages in the folder, one for each group of screens and each journey.
2. **What "proper results" means for a journey that uses AI,** where its page does not say. The ruling's words are his; section 5 only says where the answer is written.
3. **Whether a tranche can end while a journey that uses AI is left unwalked** because no AI account is connected. This bears on "all journeys can be completed".
4. **A flaw set aside by ARCH.** Section 6 lets ARCH rule that a walker's entry is none of the three things. If he holds that only he, or only a change to the document, can clear a flaw, outcome 3 goes.
5. **Parts walked by hand.** Section 3 has the walking session judge, in its own words, what no step covers. If he means a walk to be only its written steps, that line goes, and a missing step is then seen by no one.
