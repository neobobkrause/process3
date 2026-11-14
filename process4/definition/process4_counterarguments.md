# Process4: the counter-arguments and their answers

14 Nov 2026. For Bob. Written by a recording worker for Claude. Nothing here is your decision, and no answer here is proven.

## Summary

1. Four AI workers attacked or audited the second draft of the Process4 definition; their findings are recorded here as 87 entries, each with its answer.
2. **No answer found: 12 entries** (1 to 12). These are carried as unproven risks.
3. **Put to you as a question: 2 entries** (13 and 14).
4. **Withdrawn by Claude: 10 entries** (15 to 24). Claude's own additions and errors, taken back. Three things written as "Claude decided" were additions (entries 16, 19 and 23).
5. **Claude decided: 28 entries** (25 to 52). Technical decisions, told to you; several are unproven and say so.
6. **Restored from your documents: 14 entries** (53 to 66). Things of yours the second draft had lost.
7. **Corrected wording, attribution or numbers: 21 entries** (67 to 87).
8. Most important, first: within your requirements nothing physical stops a session adding to the process, which is how Process3 died. Claude's question to you about a wall round the process's repository was the centre of a proposal already withdrawn, its cost to you was understated, and an assurance was attached. It is withdrawn and asked again in a narrower form (entries 2, 5, 13, 17).
9. Second: a tranche may never end, or may end only because sessions changed the walk they write themselves; and what reaches the main branch may fail when deployed. On 8 Nov the walk of the undeployed product marked every step passing, and the deployed product passed 20 steps of 175 (entries 1, 4, 39).
10. Third: as written, the second draft would not have run in its first hour. No Process4 tool exists, a ROOT started straight after you commit your approvals does nothing, and the process's working state has no home (entries 25, 26, 27).

## How to read this

**The words used.**

- **The second draft:** the Process4 definition, second draft, of 14 Nov. **The third draft** is the one now being written.
- **The reviewers:** four AI workers set against the second draft on 14 Nov. Two were told to attack it: one on whether it would go the way of Process3, one on whether it could run at all. Two were told to audit it: one against your Foundations and your recorded decisions, one against your Keep and Drop Ledger.
- **The memo:** Claude's written answers to the four reports, made in the main session on 14 Nov, which the third draft is to follow. You have not seen it. Every answer below is taken from it.
- **The record of 13 and 14 Nov:** the written record of your decisions of those two days in the assessment document, which you have seen. A session wrote it. None of it is text you typed.
- **Process3's decision record:** the file in which Process3's sessions wrote down decisions, in places quoting you with a date.
- **The list of unproven things** is section J of the definition. **The questions that are yours** are section K.
- **Internal walk:** the walk of the product as built, not deployed. **External walk:** the walk of a deployed copy.
- **Proposed change:** what GitHub calls a pull request, a change waiting to be merged.
- Module, job, slot, tranche, round, ROOT, ARCH and the coordinator mean what they mean in the definition.

**What each entry holds.** The counter-argument; what it rests on; how bad it is if true; the answer, and whose it is.

**What it rests on.** Four kinds, kept apart. "Measured" means a figure taken from Process3's record. "Read in the documents" means words quoted from your documents, the record of 13 and 14 Nov, or Process3's decision record. "A platform document" means something a platform's own text states, not tried on your repositories. "Reasoning only" means the reviewer's reasoning with nothing measured behind it.

**How the answers are labelled.**

- **Claude decided:** a technical decision of Claude's, told to you. You can overrule it.
- **Corrected in the third draft:** a change of wording, attribution or number.
- **Restored from your documents:** something of yours the second draft had dropped, put back.
- **Withdrawn by Claude:** an addition or error of Claude's, taken back.
- **Put to you as a question.**
- **NO ANSWER FOUND:** carried as an unproven risk.

Where the memo says nothing about a finding, its opening rule applies: the reviewer's own correction is used if it is a change of wording, a removal, a restoration of your requirement or an honest statement that something is unproven, and never if it is a new test, gate, review, check or record. Those entries are marked "answer taken from the reviewer's own proposed correction". Where a reviewer gave no usable correction either, the entry says NO ANSWER FOUND.

A line beginning "Not answered" names a part of the counter-argument that the answer does not meet.

Where two reviewers made the same argument, they share one entry. Where one finding carried two separate arguments with different answers, it has two entries.

---

## Group 1. No answer found

### 1. A tranche may never end, or may end only because sessions changed the walk

**The counter-argument.** No round in Process3 ever finished with no failures, so under the second draft nothing would ever have reached the main branch, while every report showed progress. The only way out open to the sessions is to change the walk, and the sessions write the walk. In Process3 they did change it.

**What it rests on.** Measured: no clean walk of either kind in nine days; the main branch last moved on 1 Nov. The stored reports of the internal walk for 5 and 8 Nov mark every step "ok" (236 of 236, then 238 of 238) while listing 63 failures; the report of late 8 Nov lists 96 failures in 357 steps. Of 35 changes made to the walk's own code between 1 and 9 Nov, 9 by their titles excuse, retire or postpone a step (the reviewer read the titles, not the changes). 113 of 1,187 test runs failed on 3 to 5 Nov, and 74% of those then passed with no change. Reasoning only: that a walk of several hundred steps almost never returns no failures at all; that a report cannot show a step whose check was loosened.

**How bad if true.** Stops a tranche, without limit. Or silently spoils the result and misleads you: a round that was made clean, not found clean.

**The answer.**
- Claude decided: "a round with no failures" is defined once. The walk's list of failures is empty, and no step that was walked in the previous round is left unwalked. Under that meaning the rounds of 5 and 8 Nov were not clean, and the sentence about 8 Nov is rewritten to say that every step was marked ok while 63 failures were listed.
- Corrected in the third draft: it says plainly that no Process3 round was ever clean and that nothing limits the number of rounds. Only your word ends a tranche that will not come clean, with the failures named. This is listed as a risk.
- NO ANSWER FOUND, carried as an unproven risk: sessions write, change and count the walk's steps, and a loosened step cannot be seen. Any stop on that would be a new check.
- Not answered: the reviewer asked for one measurement before the process is in force (walk one unchanged build three times and count the steps that differ), saying that without it nobody knows whether a clean round can be reached at all. The memo does not take it up. Nor does it say what sets the size of a tranche.

### 2. "Correct or remove only" forbids the result and leaves the cause, and the line it draws cannot be drawn

**The counter-argument.** Sessions added checks in Process3 because their instructions said every fault must be fixed and a fix is something built. The second draft keeps that duty and adds one sentence about the form of the fix. The line between correcting and adding cannot be drawn without someone judging each change, which would be a review.

**What it rests on.** Measured: of 121 changes that added a check, 46 (38%) answered a failure of the process's own earlier machinery, and 36 arrived inside something already called a feature or a fix. Checks were added in 41% of merges both before and after 5 Nov. The one limit that held all week was a hard size limit on each role's starting text, while code with no limit grew sixteen times. No case was found of a session removing, unprompted, a merged check because it misfired. Reasoning only, on measured cases: that the line cannot be drawn; that a small new process will mostly meet faults where something is missing, for which the rule offers no fix at all.

**How bad if true.** Without a physical stop, repeats Process3. With one, stops a tranche on any fault that has no corrective fix.

**The answer.**
- Restored from your documents: two sentences your Foundations carry, "caution is a cost, paid only against a measured failure or your word" and "the default answer to a finding with nothing measured behind it is no change". Claude decided what follows from them: a process fault that stops no work may be answered with "no change"; nobody has a duty to build something for every fault; only a fault that stops work must be fixed; a fix session's work is done when the stopped job runs again, not when its change merges. The fix session's rulebook carries these sentences. They are rules in words.
- Corrected in the third draft: the claim that the rule on process fixes "now does its work" goes. That rule covers tests, gates, reviews and stops only. Records, rules, alarms and duties are held back only by the two sentences above.
- Claude decided: a module's tests and the walk's steps are product work. Each exists only to prove a product requirement, which it names, and adding one to prove a requirement is not adding a test to the process. A test or step that serves the process (records, formats, bookkeeping) is not allowed. This is a rule in words only; Process3 had 211 such files.
- NO ANSWER FOUND, carried as an unproven risk: the line between correcting and adding cannot always be drawn, and a real hole in a small process may have no corrective fix. The third draft gives the reviewer's three hard cases from Process3: two merges that each pass alone and together leave the tranche branch failing; an internal walk blind to a whole class of fault; a finished job that went unnoticed for 194 minutes.

### 3. GitHub's required test run must report on changes that touch no module

**The counter-argument.** The second draft says test one runs when a job's change touches its module's files. GitHub's rule needs a result on every proposed change, including your own commit of your approvals and ARCH's edits to the module list. A required check that never reports blocks the change for ever.

**What it rests on.** Measured: your own approvals commit in Process3 went through a proposed change that waited for the check before you merged it. A platform document: GitHub's statement, as an earlier reviewer recorded it, that a required check which never reports blocks.

**How bad if true.** Stops the first hour: it stops your first commit if it is missed.

**The answer.** NO ANSWER FOUND in the memo for your approvals commit or for ARCH's edits to the module list. For the tranche's merge into the main branch only, Claude decided that none of the three tests runs there (entry 29). The reviewer's own remedy is wording: say what the required run reports on such a change. What the third draft will say is not settled.

### 4. A product that fails when deployed reaches the main branch by design

**The counter-argument.** On the one day Process3 could compare them, the internal walk had every step marked passing and the deployed product passed 20 steps of 175. Under the second draft that build goes to the main branch, and "merged to the main branch" is the definition's own word for working product.

**What it rests on.** Measured: on the morning of 8 Nov, on one build, the internal walk marked 238 of 238 steps ok and the external walk passed 20 of 175, with 1,691 failures. Late on 8 Nov: internal 287 of 357, external 10 of 157. 218 of 220 jobs were complete while the deployed product failed 147 of 157 steps. Five releases in a row each broke an existing user's stored data, unseen because every test builds a fresh store. Reasoning only: that nothing in the draft says what runs when the tranche merges into the main branch; that "the first work of the next tranche" assumes there is a next tranche.

**How bad if true.** Silently spoils the result, and misleads you.

**The answer.**
- Corrected in the third draft: section A no longer calls what is on the main branch "working" without the caveat that the main branch can receive a tranche that fails when deployed.
- Claude decided: the conflict between your quoted words of 8 Nov and the record of 13 Nov is declared, and the later record is followed (entry 39). None of the three tests runs when the tranche merges into the main branch, and the draft says so (entry 29).
- NO ANSWER FOUND, carried as an unproven risk: nothing keeps "three tests, ever" and also makes the main branch hold a product measured to work when deployed. Also carried as unproven: the whole path to a release, including a real install into an empty account. No release of any kind was cut in Process3.
- Not answered: the reviewer asked for both walks to be run once on one build, to measure the gap of 8 Nov again. The memo does not take it up.

### 5. Growth moves to wherever nothing stops it

**The counter-argument.** Whatever is done to protect the process's own repository, the growth does not stop. It moves to places that protection does not cover, most of which leave no record: the product's own tests, the walk, the text one session types to another, scheduled tasks, the product's settings and its module list.

**What it rests on.** Measured: 211 test files (11,410 lines) written for the process and not the product sat among the product's tests, 26% of the week's net growth in tests. One settings file in the product grew from 24 lines to 421. The files that tell GitHub what to run grew from 446 lines to 1,021. Twenty-six handover notes each grew a new list of "rules in force" within a day of being cleared. Reasoning only: that Process4's sessions would do the same.

**How bad if true.** Silently spoils the result, over days. In the reviewer's words, it repeats Process3 in the places not covered.

**The answer.** NO ANSWER FOUND, carried as an unproven risk. Any stop in those places is a check. The third draft says in plain words that the fixed version put to you in entry 13 stops nothing outside the process's own repository, and lists what is left. A test or walk step that serves the process is forbidden in words only (entry 2).

### 6. A job writes the tests that judge its own work, and nothing else looks at nineteen requirements in twenty

**The counter-argument.** A job writes the code, writes the tests, strikes its own "not yet met" mark and merges with no reader. The only other look at the product is a walk of a few hundred steps over a product with nearly nine thousand requirements.

**What it rests on.** Measured: 8,838 requirement numbers against 236 to 357 walk steps. Ten of the week's twenty recorded false "done" findings were tests that pass whether or not the change is present. On the one day with a count, 20 of about 155 "complete" claims were refuted by the tests run on GitHub, about 13%. Reasoning only: that a module's tests run only when its own files change, so a failing set of tests can travel to the main branch unseen.

**How bad if true.** Silently spoils the result.

**The answer.**
- NO ANSWER FOUND, carried as an unproven risk. The list of unproven things says plainly that a job writes the tests that judge its own work, that about nineteen requirements in twenty have no other look than the walk, and that half of the week's recorded false "done" findings were tests that pass either way. Every remedy the reviewer could see is a check that has ended.
- Restored from your documents, as a rule for the job with nothing checking it: every requirement is tested at the module's interface and proven met (entry 56).
- Not answered: the failing tests that travel unseen. The memo does not mention them, and the reviewer found no answer.

### 7. Most jobs would be started by notices that need no change, and such a job cannot finish

**The counter-argument.** In Process3 nine notices in ten needed no change, and a cheap helper cleared each for about 20 cents. In the second draft each notice gives a module "work" and takes one of the eight slots with a whole job, so most jobs would be for modules where nothing needs changing. Such a job has nothing to merge, so by "done means merged" the round never closes.

**What it rests on.** Measured: 2,101 of 2,342 judged notifications were "not affected" (89.7%). The helper's reading cost a median of $0.20; a job cost a median of $2.45. A module has 14.2 declared users on average (the middle value is 8, the most 213). Reasoning on measured inputs, from two simulations that are not measurements: for the 65 or 66 modules with real work, about 177 jobs, about 100 of them finding nothing to change; in a first round 59% to 71% of job starts come from notices alone, and in the later rounds about nine in ten. Reasoning only: that a job with nothing to change cannot finish.

**How bad if true.** Stops a tranche by the letter, because rounds cannot close. Read loosely, it costs you most of the slots and most of the money on jobs that change nothing.

**The answer.**
- Claude decided: a module's work in a round is finished when its job merges, or when its notified job reports that nothing needs changing. That report is the job's closing message to ARCH. No file, and no merge of a record.
- Corrected in the third draft: the rule for who is told is stated the same way everywhere. Every module that declares a use is told on any merged change to the provider's source or requirements file. A notified job reads the named parts and decides. If it changes its module, the module's whole tests run on GitHub as test one. If nothing needs changing, it runs nothing.
- Corrected in the third draft: the price is stated, as an estimate from a simulation on the real module list and not as a measurement.
- NO ANSWER FOUND, carried as an unproven risk: no remedy within the rules was found for the needless jobs. Process3's remedy was a helper judging each notice first, which is a judgment by a worker. It is also carried as a technical point Claude will settle after the replay (see the last section).

### 8. ARCH is one long-lived session

**The counter-argument.** ARCH starts every job, types every job's instructions and passes every notice. In Process3 the long-lived coordinating session was replaced about 25 times in six days, and each handover note grew its own rules again within a day. One long session summarising itself is the same chain in one body.

**What it rests on.** Measured: about 25 replacements in six days; 26 handover notes that grew rules again. Reasoning only: that ARCH would drift in the same way.

**How bad if true.** Costs you time: drift over days.

**The answer.** NO ANSWER FOUND in the memo for the drift. The reviewer's remedy, replacing ARCH at the end of every round, is a design choice the memo does not take. What the memo does say about replacing ARCH is in entry 27.

### 9. A second suspension of the sessions' GitHub account could hide the record

**The counter-argument.** With the job record ended and each job's working state kept in its proposed change on GitHub, a second suspension of the sessions' account could hide that record with the account.

**What it rests on.** Measured: the account was suspended once, on 6 Nov. Reasoning only: the hiding. The reviewer says it was not measured.

**How bad if true.** The reviewer says only "real, unproven". At the least it costs you time.

**The answer.** NO ANSWER FOUND. The memo is silent. Carried as an unproven risk, which is the reviewer's own statement of it.

### 10. "Once" is not defined

**The counter-argument.** The second draft lets a process fix reach a running tranche "only for a blocking fault, once". If "once" means once in a tranche, the second blocking fault has no route. If it means once for each fault, it is what Process3 did 116 times.

**What it rests on.** Measured: the process's version moved 116 times in nine days. Reasoning only for the rest.

**How bad if true.** Costs you time, or stops a tranche at its second blocking fault.

**The answer.** NO ANSWER FOUND. The memo does not define the word. If you take the fixed version in entry 13, each move during a tranche is an act of yours, one for each fault that stops work. If you do not, the word is still undefined.

### 11. Nobody is named to count a job's failed corrections

**The counter-argument.** "After two failed corrections ARCH replaces the session." Who counts the corrections, and where the count is kept, is not said.

**What it rests on.** Reasoning only.

**How bad if true.** Minor.

**The answer.** NO ANSWER FOUND. The memo is silent on who counts. What the fresh session then does is restored in entry 60.

### 12. "Nothing on a live site" against a deployment the process makes

**The counter-argument.** The second draft says the process owns "nothing on a live site". Elsewhere it has the process deploy the product to a development site and walk it there.

**What it rests on.** Reasoning only: two sentences of the draft read side by side.

**How bad if true.** Minor.

**The answer.** NO ANSWER FOUND. The memo is silent, and the reviewer proposed no wording.

---

## Group 2. Put to you as a question

### 13. With a wall the process waits for you; without one, only words stop a repeat

**The counter-argument.** With a wall round the process's repository, where only you can merge a change to the process, every process fault that stops work waits for you, at night, and your click, which cannot judge the code, turns a session's addition into "Bob approved it". Without a wall, nothing but words stops a repeat of Process3, and the second draft says so itself.

**What it rests on.** Measured: one question that sessions carried as yours waited about nine hours on 5 Nov. Of 159 drafted Ledger lines, 151 were accepted; 20 audit lines were answered in three minutes with none dropped. The heaviest single check of the week entered by your own commit of 7 Nov, drafted in answer to a session's finding. Sessions made and merged 270 of the 296 changes to the process; 121 of the 296 added a check; a change to the process was running on the product a median of 3 to 21 minutes after it merged; the process's version moved 116 times. A platform document, as another worker quoted it: a proposed change's test run takes its instructions from the proposed change itself. Reasoning only: that a blocking fault in the first hours of a new tool is the expected case; that a blocked session will route round the process.

**How bad if true.** With the wall: stops a tranche repeatedly, costs you time at night, and misleads you about what you approved. Without it: repeats Process3.

**The answer.** Put to you as a question, the first of the questions that are yours, in a new form. The wall question as the second draft wrote it is withdrawn (entry 17). The memo frames the new question like this:
- Within your requirements as they stand (Claude decides and fixes the process; you take no act on it; it runs unattended), nothing physical stops a session adding to the process. Every physical stop that was found needs an act of yours each time the process changes.
- One narrower form asks for no judgment and no merge from you. Sessions go on deciding and making every process fix, but the version of the process that a product uses is fixed for a whole tranche by a setting only you can change. Your documents already require "one fixed version per tranche, changed only by a recorded act". The cost to you: one settings change at the start of each tranche, and one more whenever a process fault stops work during a tranche, while the product waits for you. It does not stop additions gathering between tranches, which you would take on whole when you move the setting. It stops nothing outside the process's own repository. It is untested; how the setting is built is Claude's to work out and to try before it is relied on. How often a small Process4 meets a blocking process fault is unknown.
- The alternative: no act of yours. The rule stays words, placed this time in your own committed approvals in the process's repository, where Process3 never put it, with the causes removed as far as entry 2 describes. There is no measured evidence that the platform's permission checker enforces a bare "never". A trial can break this; it cannot prove it.
- Claude's recommendation: take the fixed version for the first tranche, because it is the cheapest way to learn how often the process really needs to change: every change is counted by your own act. This is a recommendation on an unproven mechanism, not an assurance.
- Not answered: the reviewer objected that a recommendation was made while the rate of blocking faults is unknown, and asked for a rehearsal on a copy before you answer. The memo still recommends, and does not take the rehearsal. The reviewer's third option, protecting only the parts of the process that can stop a merge, is not put to you.

### 14. The repair of the module order was decided as technical, and hides questions that are yours

**The counter-argument.** The second draft says one question is yours, and decides the repair of the module order as a technical matter with the words "Nothing a user sees changes". The study it rests on says the order is built into the product and names questions it calls the owner's. One of them, whether a member's own Claude sign-in through one module still exists, was left open without a word. The repair is also three different things, not all done "in their own jobs", and your Ledger line has the order defined with you.

**What it rests on.** Read in the documents: the design study's sentence "Three things need the owner"; the record of 13 Nov, which says the repair "depends on two things that are yours". Measured: after the repair one module would still pass a sign-in to four addresses that answer "not found". Turning one registration round changes two modules' code, one line in a third, and four test files across three modules. 29 of 220 modules hold requirements and no code. "Nothing a user sees changes" was not measured.

**How bad if true.** Misleads you.

**The answer.**
- Put to you as questions, not decided: the two matters the study says need the owner, the member sign-in relay and modules that hold requirements and no code. They are listed under "Product questions that will come to you when Civicsmith's remaining work is walked", quoting the study in plain words. They are questions about the product, not about the process.
- Withdrawn by Claude: "Nothing a user sees changes". It was not measured.
- Corrected in the third draft: correcting the module list is ARCH's edit, not a job's, and the change to the registration spans three modules.
- Not answered: elsewhere the memo has ARCH fold the modules that hold only requirements back into the modules whose code meets them (entry 32). That acts on one of the two matters it leaves to you here.

---

## Group 3. Withdrawn by Claude

### 15. The standby for ROOT, and the claim that replacing ROOT is not an act of yours

**The counter-argument.** The second draft keeps a standby session for ROOT "so that replacing ROOT is not an act of yours". In Process3 each takeover left ROOT one level lower and left no standby, and the decision record has you restart ROOT yourself afterwards. The standby would be started by ROOT, so ROOT would start its own replacement, against the draft's own sentence and against your Ledger note that it is started by whoever starts ROOT. After a takeover jobs would sit four levels deep, not three.

**What it rests on.** Measured: two takeovers, on 4 and 7 Nov, each leaving no standby and ROOT one level down. Read in the documents: Process3's decision record, "A takeover moves ROOT one level down, so it is a bridge: Bob restarts ROOT from his app ... at his next opportunity"; your Foundations, "If the watcher's session declines, replacing ROOT stays yours". Reasoning only: that a dead ROOT would be found up to a day late.

**How bad if true.** Stops a tranche, for up to a day on a dead ROOT, or at the first restart after a takeover. Misleads you.

**The answer.** Withdrawn by Claude: the claim that replacing ROOT is not an act of yours. The record contradicts it. Claude decided: there is no standby. This is a removal, and the third draft says it departs from your Ledger note that a watcher is started beside ROOT. If ROOT dies the safety net is gone, but ARCH and the jobs carry on, because they are woken by events. The coordinator tells you when the shared state shows ROOT has not woken, and you restart ROOT, which is already on your list of acts. Corrected in the third draft: the hourly alarm woke ROOT five times out of five, not eight out of eight; the other three were the standby's.

### 16. A walk "on a copy installed with the real installer" was a new test, never built

**The counter-argument.** In the same breath as ending the install test, Claude designed a walk on a copy installed with the real installer. No document of yours asks for it, it has never been built, and it was not listed as unproven. Nothing on the path to a public release ever ran in Process3, and two of your rulings on that path were dropped.

**What it rests on.** Measured: no release of any kind was cut in Process3. The worker who studied this walk called it "unbuilt and unproven". Read in the documents: Process3's decision record quotes you on 8 Nov, "build the installer only when the internal walk completes without the need for another round, and build the site update only once the external walks complete without the need for another round", and on 9 Nov, that the first external walks run with no AI account connected and that the installer and site updates wait for a clean release walk with AI on.

**How bad if true.** Misleads you, and could stop the first release.

**The answer.** Withdrawn by Claude: "on a copy installed with the real installer". It was an addition of Claude's, a new test, written under the words "Claude decided". In its place the list of unproven things says: no release of any kind was ever cut in Process3; development deployments do not use the installer; the whole path to a release, including a real install into an empty account, is unproven. Restored from your documents: your ruling of 8 Nov on the order of the installer and the website, and your ruling of 9 Nov that walking the AI journeys needs you to connect an AI account. That is an act of yours, and it is added to the list of your acts as "before an external walk of AI journeys".

### 17. The question about a wall was the withdrawn proposal again, with its cost understated and an assurance attached

**The counter-argument.** The wall Claude recommended is the same step the proposal of 13 Nov took and then withdrew because it broke your requirements, and the text did not tell you so. It said the wall costs you "one click" a fix, when the evidence says two acts for every fix and a sitting of settings to begin with. It promised that silent growth becomes "impossible" two paragraphs after listing where growth can still happen. And it added a new record to every fix: "one plain sentence" and "the size of the process before and after".

**What it rests on.** Read in the documents: the assessment document you have seen, "The proposal does not meet your requirements, and its recommendations are withdrawn" and "I moved the process itself across to you. That one move produced most of the contradictions"; your requirement of 13 Nov as quoted in an earlier audit, "The only actions he will very occasionally take are changes to GitHub or Cloudflare settings related to permissions or rules"; your typed words of 14 Nov, "Do not assure me that something will work". Measured: a worker's study of the wall puts its cost at "one merge and one move of the reference for every process fix", and says "If only Bob merges, the stop is his reading of a diff, and the record says that does not hold". The wall was never run.

**How bad if true.** Misleads you on the only decision you were asked to make.

**The answer.** Withdrawn by Claude: the wall question as written, the record of "one plain sentence and size before and after", and the words "make silent growth impossible". Claude was wrong on three counts. The question was the centre of the proposal already withdrawn on 13 Nov because it contradicts your requirements. Its cost to you was understated. An assurance was attached to it. The fullest form, you merging every process change, is not proposed again. What is put to you in its place is in entry 13.

### 18. "On 13 Nov you confirmed" three checks end: no confirmation is recorded, and the quotation was put together

**The counter-argument.** The second draft says that on 13 Nov you confirmed the end of three checks that ran beside a module's tests: that a job's new tests fail when its change is undone; a second run of the tests on the merged result; and a check on built files. It puts in quotation marks, as yours, a phrase joined from two of a session's sentences. No act of confirming is recorded, the phrase is in neither the record nor your typed words, and your stored Ledger answer still keeps all three.

**What it rests on.** Read in the documents: the record of 13 Nov lists these under "Kept Ledger lines this decision ends", in the session's words; your typed words of 14 Nov are "Process4 has three tests, ever"; your Ledger still shows all three as kept. Measured: in Process3 a "keep" answer of yours of 6 Nov was cited to bring one of these checks back.

**How bad if true.** Misleads you, and hands later sessions a decision that no words of yours support.

**The answer.** Withdrawn by Claude: the sentence that you confirmed it, and the made-up quotation. Claude decided: the three checks end, as a consequence Claude draws from "three tests". The third draft says that this is Claude's, that your Ledger still shows the three as kept, and that no confirmation is recorded.

### 19. Running the external walk by a fixed rule after every tranche made it a fourth test

**The counter-argument.** The record of 13 Nov calls the deployed walk optional. Claude made it standing: a fixed rule runs it after every tranche and what it finds becomes work. A walk with a trigger, a run and findings that become work is a fourth test in all but name, against "three tests, ever". Using your option became an act of yours, telling the coordinator to skip it.

**What it rests on.** Read in the documents: the record of 13 Nov says only "An optional multi-session deploy-and-external-walk runs after that"; Process3's decision record quotes you on 8 Nov calling the external walk "an expensive means of identifying many of the same the flaws the internal walk found". Reasoning only: that it would work as a fourth test.

**How bad if true.** Misleads you on whether "three tests" is honoured.

**The answer.** Withdrawn by Claude: the decision that a rule runs the external walk after every tranche. It was an addition of Claude's. The third draft follows the record: the walk is optional and runs after the tranche has ended. Claude decided what "optional" means here: it runs when you tell the coordinator, and before every public release, because your Foundations make a public release a development release the walkers have passed. What it finds is work for the next tranche.

### 20. Claude ended your judge of the process as if it were a technical matter

**The counter-argument.** Your Foundations make two numbers "the standing judge of every other line" and say nothing is in force until a tranche has run with them measured. Claude retired both as a technical matter, though what judges the process is a purpose and not a way of doing something. The draft then cited "your own rule" with the half Claude had ended cut off, and put a number the sessions themselves write, walk steps passing, where the two had been.

**What it rests on.** Read in the documents: your Foundations, "Nothing here is in force until it has run on a real tranche with the two health metrics measured"; a note in the table of your requirement lines, "the owner should see any change to his judge". Measured: neither number was ever produced in Process3. On the one day with a count, about 13% of "complete" claims were refuted, worse than the one in eleven your line cites, so the stated ground that the number "would have read healthy" was a worker's inference.

**How bad if true.** Misleads you, and costs you your measure of "quickly, cheaply, and still there later".

**The answer.** Withdrawn by Claude: the words "retired by Claude", and the walk-step line (entry 23). Corrected in the third draft: the first number, false "done" claims caught by independent re-checking, can no longer be produced, because the re-checking it counts ended with the decisions on reviews and tests that the record gives as yours. The second, the cost of each merged change that survives, stays as a reported number where cost can be read. Your rule is quoted whole, and the draft says that for the first number it can no longer be met as written.
- Not answered: both reviewers said this should come back to you as your own decision. The memo does not put it to you as a question.

### 21. "Can safely narrow" where the draft's own list says unproven

**The counter-argument.** The second draft says that naming the changed parts "can safely narrow" what a notified job reads and tests, while its own list of unproven things lists exactly that, and it says itself that the tests cannot yet be picked. It gives two different rules for when a notice goes out, names nobody as deciding the wider one, and calls 241 modules "truly affected" when that was the judgment of AI workers. A notified job told to run "only the tests that relate" has nowhere to run them: tests do not run in the session, and on GitHub the run is the whole module's.

**What it rests on.** Read in the documents: the assessment document says "Naming the parts that changed narrows what a notified job has to read. It does not safely narrow who is told", and calls its figures "indicative". The reviewer also quoted "65 of 178 notices could name no part"; that is what Process3 recorded, and re-derived by the replay the figure is 17 (see the last section).

**How bad if true.** Misleads you: proven and unproven were blurred. The reviewer gave no grade; this one is the recorder's.

**The answer.** Withdrawn by Claude: "can safely narrow what a notified job reads and tests", and "runs only the tests that relate". Corrected in the third draft: the rule for who is told is stated the same way everywhere (entry 7), and "truly affected" becomes "judged affected by Process3's AI workers". The memo does not name who decided the wider rule. Answer taken from the reviewer's own proposed correction: it is written as Claude's decision.

### 22. "Your word is enough" was an assurance

**The counter-argument.** "Nothing special is built for any of these; your word is enough." Nothing has been built or tried for holding a merge, putting a module first, skipping the external walk or changing the slot number on your word. For a module put first, the fixed rule has to read your word from somewhere, so "nothing is built" cannot be right. Only the stop on your word was listed as unproven.

**What it rests on.** Measured: a worker's search found that a held merge was never used in Process3 and has no mechanism of its own; the list of modules put first held two modules and was never cleared; after your stop of 9 Nov the process ran on for over two hours.

**How bad if true.** Misleads you. The reviewer gave no grade; this one is the recorder's.

**The answer.** Withdrawn by Claude: "your word is enough" and "nothing is built", as an assurance. The third draft says that holding a merge, putting a module first and changing the slot number on your word are untried, and the rehearsal in the list of unproven things is widened to cover them. The memo does not mention skipping the external walk here; under entry 19 that walk now runs only when you ask.

### 23. A count of walk steps was added to the tranche report

**The counter-argument.** Claude added to the tranche report, round by round, a count of walk steps passing, with steps added or removed shown beside it. No document of yours asks for it. It is a new record, put where the two numbers of entry 20 had been, while three things your lines put in the report were left out.

**What it rests on.** Read in the documents: a worker's search found no line of yours that names walk steps passing as a measure.

**How bad if true.** Minor in itself. It is a record nobody asked for, of the kind that grew in Process3. The reviewers gave no grade; this one is the recorder's.

**The answer.** Withdrawn by Claude: the walk-step line. It was an addition of Claude's, written under the words "Claude decided". What the report holds is in entries 41 and 62.

### 24. A "trial" that compares the process's files at the end of every round is a recurring check

**The counter-argument.** One trial in the list of unproven things compares the process's files with round 1 at the end of every round of the first tranche. It recurs through a real tranche and names no session to do it. That is a recurring check under the name of a trial, against your typed words of 14 Nov, "Do not add tests, gates, reviews or checks".

**What it rests on.** Reasoning only: the draft read against your instruction.

**How bad if true.** Minor.

**The answer.** Withdrawn by Claude: the round-by-round form. It becomes one comparison, read from git, when the tranche ends.

---

## Group 4. Claude decided

### 25. There is no Process4 tool

**The counter-argument.** The second draft speaks of "the process's merge tool" as if it exists and only loses three review rules. Process3's tool cannot merge a Process4 job at all, nobody is named to build the tool Process4 needs, and the product's repository as it stands tells a newly started ROOT to act on nothing.

**What it rests on.** Measured, read from Process3's tool and the product's repository on 14 Nov: besides the three review rules, the tool refuses a merge for a missing record entry, a missing cost figure, files outside the module, a missing receipt, a second test run that has not passed, and built files that differ. At the end of Process3 jobs were merged through the layer machinery. The deny list removes every direct push and every GitHub command, not only merges. The product's standing instructions tell a session that has no prompt printed by the tool: "with none, act on nothing". Reasoning only: that nothing in the draft covers the first build.

**How bad if true.** Stops the first hour.

**The answer.** Claude decided: a new section, "What does not exist yet". No Process4 tool exists, and Process3's merge tool with three review rules removed is not it. Process4 needs a new small tool that does only this: push; open a proposed change and mark it ready; merge; start the next job by the fixed rule; send notices. It also needs new role texts, and the product's repository converted. Claude builds these, in the build step, before anything is in force. The tool's starting size is stated once it is built. Corrected in the third draft: the deny list also removes every direct push and every GitHub command, so the tool is each session's only door to GitHub; and two retired hooks still run in the product, which only you can delete. None of this is built or proven.
- Not answered: the reviewer's point that converting the product must either pass the Process3 check it is removing, or needs you to change a GitHub rule first.

### 26. Your first two acts, done in the listed order, stop ROOT

**The counter-argument.** You are to commit your approvals and then start ROOT. Twice out of twice in Process3, a ROOT you started straight after an approvals edit came up on an old copy. The second draft keeps the rule that a session whose approvals differ from the newest "does nothing". So the first ROOT does nothing, and no other session exists yet to put it right.

**What it rests on.** Measured: 5 Nov and 8 Nov, both straight after an approvals edit, both repaired by a message from another session; the main branch still holds your approvals of 1 Nov. A platform document: a session started with no branch named starts from the repository's default branch, which is the main branch. Reasoning only: that the draft gives no way for an edit to be taken up.

**How bad if true.** Stops the first hour, then stops the tranche at every approvals edit.

**The answer.** Claude decided: the comparison at start-up stays as in Process3 (entry 28). A plain start must land on the newest approvals and not on the main branch's old ones. How is a build decision, to be shown in the trial of ROOT's start, which must include a start made straight after an approvals commit. Unproven.
- Not answered: no way of making a plain start land there is named. The reviewer offered two: you name the branch when you start ROOT, or one GitHub setting. The reviewer's removal, dropping the "does nothing" half of the rule, is not taken.

### 27. The process's working state has no home

**The counter-argument.** The second draft ends Process3's separate store of state and says state lives in "each job's pull request". Most of what the process must know belongs to no job: which sessions are ROOT, ARCH and the coordinator; the slot number; a stop; your words quoted exactly; a notice or walk finding for a module with no open job. Without a home for these, open jobs do not obey a replaced ARCH, your words passed on by a replaced coordinator are not followed, and a stop does not reach a running job.

**What it rests on.** Measured: Process3 kept all of these in its state store. The architecture session was replaced 21 times in six and a half days, the coordinator about 26 times. A session's refusal is recorded in its own words: "A request from another session isn't enough for me to act on." A platform document: the platform's description of a message between sessions, which arrives marked as data from a peer and not as an instruction. Reasoning only: the effects in Process4.

**How bad if true.** Stops the first round at the first replacement of ARCH or the coordinator, and makes a stop on your word not work.

**The answer.** Claude decided: a job's own state stays in its proposed change. Shared state lives in one place on GitHub that needs no merge to write, written through the tool: which sessions hold the three standing roles, the slot number, a stop, your instructions quoted exactly, notices and walk findings for modules with no open job, and the time ROOT last woke. Its exact form is a build decision. Claude decided: sessions name roles, not session addresses. A job answers to "ARCH as named in the shared state", so a replaced ARCH is obeyed. Both are unproven and go on the list of unproven things, with a rehearsal of replacing ARCH while jobs are open.

### 28. The stop that ended Process3 is kept

**The counter-argument.** Each of your five edits to your approvals stopped every long-lived session, and after the last one the product never restarted. The second draft keeps that stop and puts its cure on the list of unproven things. Process4 will need such edits, because it changes how merges are made.

**What it rests on.** Measured: every edit of yours stopped every role (4 Nov, 5 Nov twice, 8 Nov, 9 Nov). The last product merge was at 16:35 UTC on 9 Nov; your edit merged at 16:45; nothing carrying product work moved again. You made 16 edits to the product's standing instructions in nine days. Reasoning only: that Process4 will need edits.

**How bad if true.** Stops a tranche, each time you do the one thing only you can do.

**The answer.** Claude decided: the comparison stays as in Process3, as part of the permission management that the record has you preserving. Its known cost is stated plainly instead of promising otherwise: after you edit your approvals, every long-lived session stops, and you restart ROOT. So an approvals edit is one act together with the restart, and it goes on the list of your acts in that form. What is to be tried becomes: after an edit and a restart, the whole chain runs on the new approvals. Unproven.
- Not answered: the stop itself is kept, so the counter-argument stands, now as a stated cost. The reviewer's remedy, that no session lives across one of your edits so that the comparison can be removed, is not taken.

### 29. Nothing says how a tranche ends in practice, and its merge into the main branch has never been done

**The counter-argument.** A tranche ends only on a walk with no failures, which Process3 never reached in nine days, and then by a merge into the main branch that never once happened on this product. The second draft does not say who makes that merge, or what test run GitHub requires on it: either every module's tests, which is the full regression that has ended, or nothing.

**What it rests on.** Measured: the main branch never moved after 1 Nov, and the tranche is 7,339 commits ahead of it. A merge of a tranche into a main branch was done only on a practice repository on 2 Nov. Process3 met the problem on 4 Nov: two sets of tests take 40 to 42 minutes each. In Process3 a walk counted as clean with known gaps put off on your word. Reasoning only: the either-or.

**How bad if true.** Stops a tranche from ever reaching the main branch, or misleads you about what "merged to main with the tests passing" meant.

**The answer.** Claude decided: ARCH opens and merges that proposed change. The third draft says honestly that none of the three tests runs there, so the rule on the main branch requires only whatever GitHub setting you have set. "With the tests passing" is corrected to say that tests run on jobs' changes into the tranche branch. This merge never happened in Process3; it goes on the list of unproven things with a rehearsal. Nothing limits the number of rounds, and only your word ends a tranche that will not come clean (entry 1).

### 30. "The merge wakes ARCH at once" names nothing that could wake it

**The counter-argument.** ARCH is the one that merges, so a merge cannot be what wakes it. What must wake ARCH is the test run finishing, and the platform sends a proposed change's events to one session only, so either ARCH or the job is left uninformed. A replaced ARCH keeps the events until it ends.

**What it rests on.** A platform document, the platform's own descriptions of its tools as read on 14 Nov: "A PR's events go to one session at a time" (a PR is a proposed change), and "a session that finishes cleanly may not report back". Measured: a finished job went unnoticed for 194 minutes; 21% of module test runs failed on 7 and 8 Nov; an architecture session lasted about 24 merges before it was replaced. Reasoning only: the stall after each replacement.

**How bad if true.** Stalls every round.

**The answer.** Claude decided: the job stays the listener to its own proposed change's test result, fixes its own failures, and sends ARCH one message when the tests pass. ARCH merges and refills the slot. "The merge wakes ARCH at once" is removed. The trial is enlarged to eight slots, one failing job and one replacement of ARCH. Unproven.

### 31. A job stopped by another module's fault has no way through

**The counter-argument.** GitHub will not merge a change whose test run is failing. If the failure comes from another module, the job may not fix it and cannot merge, and the second draft does not say whether it keeps its slot. Eight such jobs would hold all eight slots. And naming "a failure already on the tranche branch" needs a test run that none of the three tests has.

**What it rests on.** Measured: 48 of 165 records of a blocked job named tests that were already failing on the tranche before the job began; Process3 needed a separate mechanism to tell. Reasoning only: that the slots fill.

**How bad if true.** Can stop a tranche.

**The answer.** Claude decided: the sentence "A failure already on the tranche branch before the job began is named, and is not the job's to fix" is removed. In its place: if a job's module tests fail because of a flaw in another module, the job reports the flaw to ARCH, records that it is blocked, pushes and stops, and its slot is freed. When the other module merges, the notice makes this module's job ready again. Not tried.

### 32. Seven modules with work own no code, four do not exist yet, and 52 code files belong to no module

**The counter-argument.** The second draft says a module has its own files and a job writes only its own module's files. On the real list, seven modules with work own only a requirements file and tests, four are new and have no files at all, and 52 code files belong to no module. Those jobs cannot write the code that would meet their requirements, and a walk finding in an unowned file has no module to be named.

**What it rests on.** Measured, counted on 14 Nov: 29 of 220 modules own no code; eleven of them carry unmet marks, 124 of the 466; 52 code files have no owner (the replay counts 49).

**How bad if true.** Stalls the first round for 11 of the 65 modules with work.

**The answer.** Claude decided: ARCH edits the module list, folding the modules that hold only requirements back into the others now that the size limit on requirement files has ended, and giving the unowned files an owner. The definition of "module" is corrected to match. See the tension noted in entry 14.

### 33. A fault in the process has nobody to report it, judge it or start the fix

**The counter-argument.** "Claude fixes it" names no session. The coordinator decides nothing, ARCH decides only the product, ROOT builds nothing. Your Ledger lines on how a flaw is reported, and that a flaw "is never fixed in place", are gone. Approvals belong to one repository each, and only the product's are on the list of your acts.

**What it rests on.** Measured: after your approvals were split by repository, pushes from sessions in another repository were refused 2 of 2 on 8 Nov. In Process3 the coordinator owned every decision about the process. Both of your Ledger's routes for reporting a flaw were never built. Reasoning only: the effect.

**How bad if true.** Stops a tranche at the first blocking fault in the process, and waits for you without telling you why.

**The answer.** Claude decided: any session reports a process fault to ARCH. ARCH starts the fix session, which holds the process's repository. Your standing approvals must also be committed in the process's repository, so your act of committing approvals becomes: both repositories, at the start. The coordinator holds the product's repository. Answer taken from the reviewer's own proposed correction, restoring your Ledger's words: a session that finds a fault in the process does not fix it where it stands. The reviewer's worry about preparing a fix behind the wall falls with the wall question as written (entry 17).

### 34. The hourly alarm would undo a stop

**The counter-argument.** An hourly alarm whose job is to restart stopped sessions will undo a stop on your word, or a switch of accounts, unless it is switched off, and the second draft says nothing may depend on switching an alarm off.

**What it rests on.** Measured: after your stop of 9 Nov the hourly task kept firing and had sent 94 notifications by 13 Nov. The switch of accounts failed on 5 Nov and was cancelled on 7 Nov. A replaced session's alarm keeps firing into the old session.

**How bad if true.** Costs you time at every stop or switch, and can leave two ROOTs on one product.

**The answer.** Claude decided: on your word the coordinator tells ARCH, and ARCH interrupts each job. The stop is a line in the shared state that names the account, read by ROOT at every wake, so the hourly alarm does not undo it. Unproven; it is in the rehearsals.
- Not answered: the rule by which ROOT judges that a session "has stopped", which the reviewer asked for.

### 35. The walks as described never ran that way, and nobody is named to turn a finding into work

**The counter-argument.** Process3 ran the internal walk as one script started by the tool in one session. "Several sessions, by journey" is new and was not listed as unproven. Nobody is named to turn a finding into a module's work. The walks took about an hour, while a session can keep something running in the background for about thirty minutes, and the draft does not say where the walk runs. The trial offered can break the claim that the walk finds what a full regression would; it cannot support it.

**What it rests on.** Measured: one run, started by the tool. On 8 Nov the work to share a walk between sessions was still to be done. The two late external walks took 60 and 64 minutes. A platform document: the thirty-minute limit, as your Foundations record it. Reasoning only: what the trial can show.

**How bad if true.** Stalls the end of the first round, and misleads you about what the trial can show.

**The answer.** Claude decided: ARCH starts the walking sessions and turns each finding into work for a named module. Corrected in the third draft: "several sessions, by journey" never ran in Process3 and is marked unproven. Where the walk runs is a build decision, also unproven; in Process3 the walks ran on GitHub's machines because of that limit. The trial's entry says it can break the claim only.

### 36. The check on declared uses inside test one either fails on day one or cannot see the hole

**The counter-argument.** Test one includes a check that the uses a module declares match what its code imports. If "code" includes the tests, about 200 imports fail on the first day. If it does not, the undeclared uses stay invisible. The second draft does not say which.

**What it rests on.** Measured. The reviewer gives 202 undeclared imports in tests and 38 pairs of modules where a test imports a later module. The replay counted again: 198 imports, 122 undeclared pairs in all by test import, 36 of them to a later module, and none in code that is not a test.

**How bad if true.** Stops jobs in up to 63 modules, or leaves the hole.

**The answer.** Claude decided: which of the two the check covers is a build decision, and the third draft says the check either fails on those imports on day one or cannot see the undeclared pairs. The undeclared pairs are repaired by ARCH correcting the module list, that is, declaring them.
- Not answered: which of the two it will be.

### 37. Checks that could stop work are among the lines that "stand as written"

**The counter-argument.** The second draft says there are three tests and no others, and in the same breath that 208 of your lines "stand as written". Several of those lines are, or were held by, a check that stops work, and the main text does not say which stay. A session can cite a "kept" line to rebuild its check, as happened before.

**What it rests on.** Measured: in Process3 a check removed at your instigation was restored within ten hours by a session citing Ledger lines. Thirty-four of your 151 kept or modified Ledger lines appear nowhere in the main text except under the words "208 stand". Reasoning only: that a Process4 session would do the same.

**How bad if true.** Silently spoils the result as checks grow back, or stops a tranche.

**The answer.** Claude decided, as following from "three tests, ever": a check stays only if the definition names it. These end: the check of your credentials when a tranche opens; the check of the process's version when a session starts; the check that a product's copy of the process's files has not drifted; the guard on your approvals inside the old record check; the format and coverage checks; the re-run of checks when a tranche closes; and the check that no built file is committed. That last rule stays as words, and Claude decided that a module's own job builds and commits its built files in its own change. A job running its own module's tests in its session before it pushes is the job's own practice, not a gate, and stays as that. The rule that a test checks a text's key and not its words stays as a rule for writing tests, with no check.
- Not answered: Process3's own inventory of permissions says that without the old record check nothing in git stops a session's proposed change from altering your approvals or the deny list. Ending that guard leaves the permission checker's refusal as the only thing in the way. The memo does not say how this sits with the recorded decision that permission management is preserved.

### 38. Ending the check on a job's own files leaves an edit to another module's files with nothing behind it

**The counter-argument.** If a job edits another module's file, test one runs only the job's own module's tests, so the edit merges untested and the other module is never told. Process3's clean record was made with a check standing in four places. Process4 ends the check and gives jobs a new reason to stray, because a job now runs while the modules it uses are unfinished. The record of your answer of 13 Nov says of this rule "Kept", and the second draft filed the ending of the check under "Claude decided".

**What it rests on.** Measured: 0 of 2,540 job commits changed another module's code or tests, with the check in place. Thirty-four blocked jobs said the fix they needed lay outside their own files and handed it on. The record cannot tell whether the check or the instructions held them. A platform document: no GitHub setting can restrict which files a push changes on a public repository. Reasoning only: the new reason to stray.

**How bad if true.** Silently spoils the result.

**The answer.** Claude decided: test one runs the tests of every module whose files a proposed change alters, so an edit that strays into another module's files is at least run against that module's tests. The rule that a job writes only its own files stays in the job's instructions, with no check. The third draft notes that the record of 13 Nov says of the rule "Kept", and that the 0 of 2,540 was measured with the check in place.
- Not answered: the reviewer said two things here were yours. Whether "Kept" meant the check. And whether test one may run another module's tests, since the second draft said "never another module's". The memo decides both as Claude's. Two jobs writing one file is still held back only by words.

### 39. Your words of 8 Nov on when a tranche ends were overturned without telling you

**The counter-argument.** Process3's decision record quotes you on 8 Nov: rounds continue until the walk of the release deployment also finds no flaws, the installer and the website are updated, "and that ends the tranche". The second draft ends the tranche at the clean internal walk, merges it to the main branch, and sends what the external walk finds to the next tranche. It follows a session's record of 13 Nov and never tells you that this replaces what you said five days earlier.

**What it rests on.** Read in the documents: your words of 8 Nov as quoted; the record of 13 Nov, "A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that"; your Foundations, "so nothing found waits for the next tranche". Measured: in Process3 nothing reached the main branch before a clean external walk; and the 20 of 175 of entry 4.

**How bad if true.** Silently spoils the result: the main branch receives a product no deployed walk has passed, on the strength of a record you did not type.

**The answer.** Claude decided: the conflict is declared in two places, and the definition follows the later record. This is Claude's choice between two records, not a decision of yours, and the list of your decisions as recorded asks you to correct any that is recorded wrongly (entry 70). Three consequences are stated in plain words. The main branch can receive a tranche that fails when deployed. What the external walk finds waits for the next tranche, where your Foundations said nothing found waits. Section A must not call what is on the main branch "working" without that caveat.

### 40. About thirty-five rules are held by words alone, and the one limit that held in Process3 was a test

**The counter-argument.** Process3 measured this: the rule with a hard stop behind it held all week and every rule held by words drifted. The second draft has 36 rules held by words, three of them with anything physical behind them. The hard stop that worked was a test in the process's own repository, which is not one of the three tests, and the draft does not say whether it survives.

**What it rests on.** Measured: role texts stayed between 4,032 and 4,197 bytes while the guide with no limit grew from 8 KB to 134 KB. Reviews of changes to the process were never required by Process3's tool; they were a practice, and 285 of 776 commits came from them. Reasoning only: that Process4's rules in words will drift.

**How bad if true.** Costs you time as rules drift over days, then repeats Process3.

**The answer.** Claude decided, as Claude's reading of "three tests", to be told to you: the process's own tool has tests of its own. They run only when the process itself is changed, are not among the three, and can never stop product work. The size limit on each role's starting text is one of them and stays. For the other rules held by words the memo is silent. Answer taken from the reviewer's own proposed correction: each rule that is held only by words is marked as such in the definition.
- Not answered: the reviewer also proposed deleting the rules in words that did not hold in Process3. The memo names none to delete.

### 41. A reported number becomes a target

**The counter-argument.** The second draft's own example of a bad fix began with a report: two jobs recorded a cost of zero, a report read wrong, and a session made the figure compulsory and stopped every job. Process4 keeps that report and adds numbers to it. With the job record ended, somebody must still gather time, cost, overhead and your minutes, and a session will build something to do it.

**What it rests on.** Measured: that episode took 45 minutes. Cost was recorded for 229 of 693 claims, and 106 of those said "unmeasured". Two questions of yours about a number each came back as a mechanism. 89% of commits were bookkeeping, and 105 of 508 merges changed only records. Reasoning only: that a session will build the gathering.

**How bad if true.** Costs you time.

**The answer.** Claude decided: the tranche report is produced once, at the tranche's end, only from what git and GitHub already hold. It gives time, work done, cost where it can be read and "unmeasured" otherwise, the share that was overhead, your minutes, idle time while work was ready, anything put off with its reason, and work left. No number is a target, and nothing reads the report to decide anything. The walk-step line is withdrawn (entry 23). A question from you is answered in words, never by building anything (entry 57).
- Not answered: the reviewer proposed leaving cost and overhead out until a way to read them has been measured. The memo keeps them.

### 42. The slot number: four numbers on four dates, and "for each product" settled without you

**The counter-argument.** Your words give four different numbers on four dates, and your words of 6 Nov tie the number to GitHub traffic for the whole account. The second draft states "eight by default" and "for each product" as settled and mentions only the 24 of your Foundations.

**What it rests on.** Read in the documents: 24 in the Foundations; your quoted words of 6 Nov, "as many as 8 jobs at a time" and "account wide"; Process3's decision record has the slots set to 20 on 7 Nov, and "(default: 20)" is typed in the draft field report; 8 in the record of 13 Nov. The record's own question, "is eight per product or across the account?", has no recorded answer.

**How bad if true.** Costs you time. Two products at sixteen jobs repeat the load on GitHub that your number was set against.

**The answer.** Claude decided: the third draft names the numbers and dates, and follows eight. On what the number covers: Process3 counted across the account; with one product running the two readings are the same; for two products Claude's judgment is that you tell each coordinator its own number. This is marked as a judgment on a point you were asked on 13 Nov and have not answered.

### 43. Seven standing duties in your documents are neither kept nor ended

**The counter-argument.** Seven duties in your documents are not placed. Counting permission refusals each tranche, with a trial of a few approved acts when each tranche opens and at each model release. Removing parts of the process one at a time at each model release. A check that fails any change to your approvals not made by you. The hourly sweep catching lack of progress, not only silence. Checking that every new session has started. Every requirement tested and proven met. And keeping within GitHub's published limits. The builder of Process4 will keep or drop each by its own judgment.

**What it rests on.** Read in the documents: your Foundations for the first six. For the seventh, Process3's decision record quotes you on 6 Nov, "80% or 90% of github's published limits", and on 9 Nov, "don't do it beyond just making sure that we don't exceed published limits". Measured: GitHub suspended the sessions' account on 6 Nov.

**How bad if true.** Misleads you.

**The answer.** Claude decided the general rule: a check stays only if the definition names it (entry 37). Two of the seven are named: the guard on your approvals ends (entry 37), and "every requirement is tested and proven met" is restored as a rule (entry 56).
- Not answered: the other five. The memo names none of them, so under its rule those that are checks end by not being named, which is the silence the reviewer objected to. Whether keeping within GitHub's limits counts as a "check" under that rule, the memo does not say. The reviewer's own correction was to list all seven as kept or ended, with who decided, and to say where preserving permission management and "three tests" pull against each other.

### 44. The session that fixes the process is a new kind of session

**The counter-argument.** The list of roles does not have a session that fixes the process. Your Ledger has the process built "as a product under itself", by jobs. The second draft replaces that with one-off fix sessions without saying so, and without saying who starts one or how deep it sits.

**What it rests on.** Read in the documents: your Ledger line, and the draft's list of roles.

**How bad if true.** Misleads you. The reviewer gave no grade; this one is the recorder's.

**The answer.** Claude decided: it stays, and it is added to the list of roles. ARCH starts it, and it holds the process's repository. For the rest, answer taken from the reviewer's own proposed correction: the third draft says that this replaces your line that the process is built like a product, by jobs in tranches, and that Claude decided it.
- Not answered: how deep it sits.

### 45. "Earlier modules' jobs run before later ones" was read down to a tie-break

**The counter-argument.** Your sentence of 13 Nov, "with the jobs of earlier modules run before those later in the order", is read as: among modules ready at the same moment, the earlier takes the free slot, and a later module does not wait for an earlier one. The second draft did not say that this is a reading.

**What it rests on.** Read in the documents: your requirement as an earlier audit quotes it; the record of 13 Nov gives the reading as your decision.

**How bad if true.** Misleads you. The reviewer gave no grade; this one is the recorder's.

**The answer.** Claude decided, and it is now written as Claude's and not yours: reading "earlier modules' jobs run before later ones" as the rule for who takes a free slot.

### 46. Which repository ROOT starts on is recorded two ways

**The counter-argument.** The record has your answer two ways. 13 Nov: "You start a session with the process repository mounted." 14 Nov: "ROOT starts with the product repository". The second draft uses the second and does not show you the first. ROOT as described also fails the draft's own conditions for starting a session: your plain prompt does not name ROOT's acts, and you have to choose the branch.

**What it rests on.** Read in the documents: both sentences are the session's, and the earlier one is not struck out. Measured: ROOT twice came up on an old copy (entry 26).

**How bad if true.** Misleads you.

**The answer.** Claude decided: both records are declared (13 Nov, the process's repository; 14 Nov, the product's), and the definition follows the later. This is Claude's choice between two records. That a plain start lands on your newest approvals is a build decision to be shown in a trial (entry 26). For your plain prompt, answer taken from the reviewer's own proposed correction: the draft says that your prompt does not name ROOT's acts as is required of every other session, and that whether this works is unproven.

### 47. Your option to call for a whole-product check ended without being named

**The counter-argument.** In your own words of 31 Oct the whole-product checks run "before a release or when I ask for one". The second draft tells you two of your powers stay, and does not tell you that this third one ends.

**What it rests on.** Read in the documents: your Ledger line in your own words; the record of 13 Nov, "The internal walk replaces the full regression".

**How bad if true.** Misleads you.

**The answer.** Claude decided: the option stays in this form. Your word to the coordinator runs the internal walk at any time, and the third draft says so where it lists what ends. What runs on your word is the internal walk, not the full regression your words of 31 Oct were about.

### 48. A second question was handed to you in half a sentence

**The counter-argument.** The opening of the second draft says one question is yours. A second was put elsewhere in half a sentence, with no reason and no recommendation: a clause in your approvals lets a design lane's change merge with no tests run, "which is yours to keep or drop". That is a second way to merge, outside the eight steps of a job.

**What it rests on.** Measured: the clause is in your approvals as you committed them. Read in the documents: your typed words of 14 Nov, "Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation".

**How bad if true.** Costs you time, and misleads you.

**The answer.** Claude decided: it stays. A lane's change merges with no test because none of the three applies, and the clause is among the wordings in your approvals.
- Not answered: the second draft called this yours to keep or drop, and both reviewers asked for it to be put to you properly. The memo does not put it to you.

### 49. Cost may never be reported, and the cost alarm in your Ledger is neither kept nor ended

**The counter-argument.** "Cheaply" is half of your purpose. With recording of cost ended as a duty it may never be reported: when it was a duty, 106 of 229 recorded costs said "unmeasured". The cost alarm in your Ledger ("its cost per attempt is an alarm the sweep reads, not a cap") is neither kept nor ended.

**What it rests on.** Measured: 229 recorded costs for 693 claims; 106 "unmeasured"; 111 of the 123 real figures came from two days.

**How bad if true.** Misleads you.

**The answer.** Claude decided: cost is reported where it can be read, and "unmeasured" otherwise (entry 41). The cost alarm is declared ended, together with the compulsory recording of cost.

### 50. Three measurements you asked for are neither kept nor ended

**The counter-argument.** Three times you wrote "I'm skeptical, but let's measure" or "let's try": an architecture session that keeps no memory against one that is handed over; trimming the principles each role loads; and the share of the architecture session's work that is routing. The second draft settles each matter without the measurement and without saying so.

**What it rests on.** Measured: none of the three was ever taken. A platform document: a session started by an alarm cannot start sessions (0 of 3, 2 Nov), which rules the first one out.

**How bad if true.** Minor in effect; misleads you by silence.

**The answer.** Claude decided: all three are declared ended, unmeasured, with the reason given for each.

### 51. The two-part test run was kept on the ground that "it costs little"

**The counter-argument.** The second draft keeps running the tests in two parts because "it costs little", while saying itself that the failure this guards against was never seen. That is Process3's reasoning in one line, and a precedent for every later session. The second part's job in Process3, posting the record the merge tool checked, has also ended.

**What it rests on.** Measured: an earlier worker's caution that such rules are "cheap and inert rather than proven"; the second part's purpose, read from Process3's own files.

**How bad if true.** Minor in itself; harmful as an example.

**The answer.** Claude decided: it is kept. Corrected in the third draft: the reason is not "it costs little". It is kept because removing it changes how secret keys reach test code, which is part of the permission management that the record has you preserving.

### 52. The tranche report has no author

**The counter-argument.** Nobody is named to produce the tranche report, and cost "where it can be read" was often not readable.

**What it rests on.** Measured for cost (entry 49). Reasoning only for the author.

**How bad if true.** Minor.

**The answer.** Claude decided what the report holds and when it is made (entry 41).
- Not answered: who produces it.

---

## Group 5. Restored from your documents

### 53. The change across many modules lost its two conditions and has no moment to happen

**The counter-argument.** Your line had a change across many modules made by a helper in the architecture session, while no job runs, with any module that needs judgment getting its own job. The second draft dropped both conditions and named nobody. Because the fixed rule refills every slot at once, there is never a moment with no job open, so the pass would write files that open jobs are also writing.

**What it rests on.** Read in the documents: your Foundations line; the record of 13 Nov, "The cross-module mechanical pass is preserved". Measured: Process3's own rule was "a pass runs while no job holds its modules"; the second draft itself admits the pass never had a procedure. Reasoning only: the collision with open jobs.

**How bad if true.** Stops a tranche, or spoils open jobs' work, the first time it is used.

**The answer.** Restored from your documents: the change is made by a helper inside ARCH's session, and a module where it needs judgment gets its own job. Claude decided the moment: between a round's last merge and its walk, when no job is open. Unproven; it is in the rehearsals. Skipping the tests for such a change is entry 68.

### 54. Nothing prepares the next round or tranche

**The counter-argument.** Your principle that the architecture session gets the next stage ready while this one runs is gone, and nothing says where a tranche's work comes from when it opens.

**What it rests on.** Read in the documents: your Ledger line, kept on 3 Nov. Measured: gaps of 11.4, 8.7, 7.6 and 6.3 hours between merges that carried code on 7 and 8 Nov.

**How bad if true.** Costs you time at every tranche boundary, and stops a tranche from starting if no module has work marked.

**The answer.** Restored from your documents: while a tranche runs, ARCH prepares what the next round or tranche needs, so that it opens the moment this one closes.

### 55. Your own brake on growth was gone, and the rule said to replace it is narrower

**The counter-argument.** Your sentences that caution is a cost, and that the default answer to an unmeasured worry is no change, appeared nowhere in the main text. The second draft ended the rule that every addition cite its authority and said the rule on process fixes "now does its work". That rule forbids only a new test, gate, review or stop. It does not cover new records, rules, alarms or duties, which the draft itself names as part of what killed Process3.

**What it rests on.** Read in the documents: your Foundations; Process3's decision record quotes you on 7 Nov, "make sure that this baseless overcaution NEVER happens. NEVER!". Measured: the 121 additions were of "a check, gate, refusal, hold, review requirement, audit, alarm or bookkeeping duty".

**How bad if true.** Silently spoils the result: the way Process3 grew is only half forbidden.

**The answer.** Restored from your documents: the two sentences, as rules for every session. They are rules in words and nothing enforces them. Corrected in the third draft: "now does its work" goes. What Claude decided to draw from the two sentences is in entry 2.

### 56. "No requirement goes untested" was lost again

**The counter-argument.** On 3 Nov you kept "no requirement goes untested, which was lost". It is lost again. The main text never says a module's tests must cover every requirement, so "the tests pass" can mean that no test exists for a requirement marked as met.

**What it rests on.** Read in the documents: your Ledger line and its note. Measured: Process3's form of this rule was loosened after 22 hours and removed on 9 Nov. Reasoning only: the effect.

**How bad if true.** Silently spoils the result.

**The answer.** Restored from your documents, as a rule for the job with nothing checking it: every requirement is tested at the module's interface and proven met. Whether a rule with nothing checking it holds is carried in entry 6.

### 57. Every word you say to the coordinator was to be "followed"

**The counter-argument.** Your Ledger says only words you explicitly mark become decisions. The second draft says the coordinator passes on whatever you tell it, "and they are followed". In Process3 "BE CAREFUL" became one job at a time and a minute between writes, and four questions of yours in 26 hours each came back as a mechanism.

**What it rests on.** Read in the documents: your Ledger line; the record of 13 Nov, which names "every utterance of yours being turned into a new rule until the rules overflow". Measured: of the items carried as yours across handovers, 14 of 21 were found on 5 Nov to be mechanisms.

**How bad if true.** Silently spoils the result, as rules grow back out of conversation, and costs you time.

**The answer.** Restored from your documents: only words you mark as a decision or an instruction are passed on and followed. The rest is conversation, and a question from you is answered in words, never by building anything.

### 58. How a blocker or a question that is yours reaches you was missing, and "CAN RUN" had become "runs"

**The counter-argument.** Your lines say a blocker that only you can clear reaches you while other work goes on, and that what is yours comes to you explained, with options and a recommendation. The second draft tells you only when everything has stopped, names no session that brings you a question of yours, and turns your "CAN RUN", in your capitals, into "runs".

**What it rests on.** Read in the documents: your Ledger lines; the stored change of 3 Nov, "runs" changed to "CAN RUN". Reasoning only: that blockers which are yours pile up unseen until nothing else can move.

**How bad if true.** Costs you time, and misleads you about what you will be told.

**The answer.** Restored from your documents: the process "can do so with nobody watching". A blocker only you can clear is told to you at once, with options and a recommendation, while other work goes on. A design is settled before anything is built.

### 59. Design lanes were named once and defined nowhere

**The counter-argument.** Design lanes are in your approvals and in two of your Ledger lines, partly in your own words. The second draft gives them nine words in a list and no place among the sessions: who starts them, whether they take a slot, whether you talk to them.

**What it rests on.** Read in the documents: your Ledger lines and your approvals.

**How bad if true.** Costs you time.

**The answer.** Restored from your documents: design lanes are added to the list of roles, from your lines. ARCH defines them, and user experience is always present. Their merging with no test is entry 48.
- Not answered: whether a lane takes a slot.

### 60. The fresh session after two failed corrections: your reason was cut

**The counter-argument.** You wrote on 31 Oct that the restarted session "should recognize that corrections were made and try to understand why to anticipate all other needed corrections so it doesn't continue to fail". The second draft kept the brief and cut the purpose.

**What it rests on.** Read in the documents: your own words in the Ledger note. Your Foundations carried the purpose whole.

**How bad if true.** Costs you time; minor in wording.

**The answer.** Restored from your documents, quoting your words: the fresh session's first task is to understand why the corrections were needed, so as to foresee the others.

### 61. Four kinds of session the draft relies on were not listed, and nobody was named to tell you anything

**The counter-argument.** "Who does what" names five kinds of session. The text relies on four more: the standby, design lanes, the session that fixes the process, and the sessions that walk. Who starts each, and on which repository, is not said. The draft asks which repository the coordinator holds and does not answer. Nothing says which session tells you what ARCH decided, or brings you the questions that are yours.

**What it rests on.** Read in the documents: your Foundations, that the architecture session "reports it to you in plain words as done", and that questions that are yours "are asked in one place".

**How bad if true.** Misleads you, and costs you time. The reviewer gave no grade; this one is the recorder's.

**The answer.** Restored from your documents: ARCH records its decisions in the product's decision file, and the coordinator reports them to you in plain words, one line each. A design is settled before anything is built. The questions that are yours come in one place, each as what it is, why it matters and a recommendation. Claude decided: design lanes, the walking sessions and the session that fixes the process are added to the list of roles; the standby is dropped (entry 15); the coordinator holds the product's repository.

### 62. The tranche report had lost three things your lines put in it

**The counter-argument.** The report in the second draft leaves out the architecture session's idle time while work was ready, what was put off and why, and the work left.

**What it rests on.** Read in the documents: your two Ledger lines. Measured: idle time is the only stated measure of whether the slots were kept full; Process3's alarm for it misfired for 2 hours 22 minutes.

**How bad if true.** Misleads you.

**The answer.** Restored from your documents: all three are in the report (entry 41).

### 63. Nothing said where decisions are kept

**The counter-argument.** Your kept line says decisions go to short records the moment they are made, each in its own file, never as a line in a long plan. The second draft says nowhere where ARCH's decisions, or yours, are kept.

**What it rests on.** Read in the documents: your Ledger line. Measured: Process3's one decision file grew to 49 KB and 31 headings in four days, and 23 of its 26 process decisions are headed "coordinator".

**How bad if true.** Misleads you.

**The answer.** Restored from your documents, in part: ARCH records its decisions in the product's decision file, and the coordinator reports them to you. Your own decisions of 13 and 14 Nov are listed once, near the top of the definition (entry 70).
- Not answered: your line says each decision has its own file. The memo names one file, which is the form that grew in Process3.

### 64. Your suggested model and effort would not reach the jobs

**The counter-argument.** The second draft says ROOT passes your suggested model and effort to every session it starts. Jobs are started by ARCH, not by ROOT, and the platform does not hand effort down. Your own note also asks for "always a model and effort sufficient for quality, and a permissions mode appropriate for the task at hand". The first clause was lost, and the second cannot be met.

**What it rests on.** A platform document: effort is "not inherited" by a new session, and no locked-down session can exist on the account. Measured: effort for each role was never set anywhere in Process3's tool.

**How bad if true.** Misleads you; minor. A job on a weak model costs a round.

**The answer.** Restored from your documents: "always a model and effort sufficient for quality". Claude decided: every session passes your suggestion on to each session it starts. Corrected in the third draft: Auto mode is the only permission mode the platform allows here, which overrides your "permissions mode appropriate for the task".
- Not answered: nothing shows that a suggested effort reaches a job. The reviewer calls it unproven. The memo does not put it on the list of unproven things.

### 65. Your proof by a slice of the real product had become a list of small trials

**The counter-argument.** Your Ledger makes the proof "one shadow of a representative slice" of the real product and then the first real tranche. You dropped the line that certified a process on a two-module toy. The second draft's small trials stand where the slice stood, and its heading says a small trial can "prove".

**What it rests on.** Read in the documents: your Ledger lines; your Foundations, "Toy flaws and product flaws were disjoint".

**How bad if true.** Misleads you: a passed toy trial read as proof.

**The answer.** Restored from your documents: the requirement of "one shadow of a representative slice". Corrected in the third draft: each trial "could break" its claim, and proof is the first real tranche. The draft says that the combined run of the trials is that slice.
- Not answered: the memo does not say that the combined run will be made on a representative slice of the real product.

### 66. How many sessions walk, and your caution about Cloudflare's limits

**The counter-argument.** "By journey" answers how the walk is shared out, not how many sessions walk. Your caution of 8 Nov is missing: "be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account".

**What it rests on.** Read in the documents: your words as Process3's decision record quotes them.

**How bad if true.** Minor.

**The answer.** The memo is silent. Answer taken from the reviewer's own proposed correction, a restoration from your documents: your caution is added, and the draft says the number is not yet set.

---

## Group 6. Corrected wording, attribution or numbers

### 67. New sessions failed to start, silently, at about 50 live sessions

**The counter-argument.** At about 50 live sessions the account stopped starting new ones while still reporting success. A round of about 170 jobs leaves finished sessions behind. If finished sessions count, the slots look full and nothing is running, while the second draft says nothing depends on archiving a session.

**What it rests on.** Measured: one event, on 1 Nov; Process3 relied on archiving in practice. Not measured: whether a finished, idle session counts.

**How bad if true.** Silently stalls a round.

**The answer.** Corrected in the third draft: this goes on the list of unproven things. New starts failed silently at about 50 live sessions, once; a round may need about 170 jobs; whether finished sessions count is unmeasured. Nothing is decided. The reviewer says one measurement before the process is in force would settle it.

### 68. A change across many modules may skip its tests on a session's judgment

**The counter-argument.** "Some such changes are so trivial that module tests need not be rerun." GitHub lets nothing into the tranche branch without the tests passing. So either the check reports a pass without running, which is a way round the only gate, opened on a session's judgment, or the change cannot merge. The permission checker has refused an act of this kind once.

**What it rests on.** Measured: on 9 Nov the checker refused an act that let a change through without its check, under the label "CI Bypass". Process3 built a lighter gate for changes to records only and narrowed it two hours later. Reasoning only: the either-or.

**How bad if true.** Silently spoils the result, rarely; or stops that change; and could bring three refusals in a row on ARCH.

**The answer.** Corrected in the third draft, as a matter of attribution: the sentence stands in the session's record of 13 Nov, so it is kept and attributed to that record, not written as words you typed. The draft notes that skipping the required test was refused once on 9 Nov and is unproven.
- Not answered: how such a change would merge.

### 69. Nothing says which document governs

**The counter-argument.** After this definition your stored Ledger still shows "keep" or "modify" for every line the definition ends. Nothing in the main text says which document governs, and a Process3 session brought back a removed check by citing Ledger lines.

**What it rests on.** Measured: the stored answers; the check brought back (entry 37).

**How bad if true.** Silently spoils the result. The reviewer gave no grade; this one is the recorder's.

**The answer.** Corrected in the third draft, in one sentence: the Ledger is unchanged; where the two differ, this definition states which decision it follows; and your Ledger is yours to change. The reviewer proposed the words "the definition governs once you accept it". The memo's sentence does not say that.

### 70. The draft broke its own rule on whose words are yours

**The counter-argument.** The second draft says a session never records its summary of what you said as yours. Every "you decided" about 13 and 14 Nov in it is exactly that; no typed words of yours exist for any decision of those two days. It also wrote as yours three things that were Claude's: ending review as a use for helpers, ending the name "BOB", and ending "a session writing down a word you give in chat as yours". And it wrote eight ways of doing things that Claude decided as "set by your decisions".

**What it rests on.** Read in the documents: every piece of text in the record of 13 and 14 Nov carries the same writing session's mark. Measured: in Process3, of 218 attributions to you, 64 were your traceable words and 48 were a session's own decision written as yours.

**How bad if true.** Misleads you, and hands every later session a set of "your decisions" that no words of yours support.

**The answer.** Corrected in the third draft. A short section near the top, "Your decisions as recorded", lists each decision of 13 and 14 Nov once, in one plain line, in the record's exact words. It says plainly that these reached the document through a session's written record, that on 14 Nov you referred to them in your own words as "my decisions of 13-14 Nov", and that you should correct any that is recorded wrongly. Everywhere else, "you decided" is used only for an item on that list, for a stored Ledger answer, or for words quoted from you with their source. Everything else is "Claude decided", and the three things named above are written as Claude's.
- Not answered: the reviewer asked that each such decision be written as "a session's record has you deciding" until you write it yourself. The memo keeps "you decided" for items on the list.

### 71. Ten things the draft relies on were missing from its list of unproven things

**The counter-argument.** The second draft relies on ten things it did not list as unproven: the tranche merging into the main branch; ARCH being replaced during a tranche without losing the open jobs; working state kept in jobs' proposed changes; a standby replacing ROOT; finished sessions not counting against the limit of live sessions; several sessions sharing one walk; a fix prepared and merged behind the wall; your model and effort reaching every session; how many jobs a round takes; and a release walked on an installed copy.

**What it rests on.** Measured or read, item by item, in the entries named below.

**How bad if true.** Misleads you: proven and unproven were not kept apart.

**The answer.** Corrected in the third draft: an item is added for everything the memo marks unproven. Of the ten: the merge into the main branch is added, with a rehearsal (entry 29). Replacing ARCH is added, with a rehearsal (entry 27). Where state is kept is added (entry 27). The standby is dropped (entry 15). The limit of live sessions is added (entry 67). Several sessions sharing a walk is added (entry 35). The fix behind the wall falls with the wall question; the fixed version put in its place is untested (entry 13). The number of jobs in a round is stated as an estimate and listed (entry 7). The installed-copy walk is withdrawn, and the whole path to a release is listed (entry 16).
- Not answered: your model and effort reaching every session is not marked unproven by the memo (entry 64).

### 72. The trial for the notices could not fail

**The counter-argument.** The trial asks that "all 241 real effects are reached". The 241 were found only among modules Process3 told, so any rule that tells every declared user reaches them by construction. The trial cannot fail, and so proves nothing about what the notices miss. The misses lie outside the record.

**What it rests on.** Reasoning only, on how the record was made. The replay's own report now says the same (see the last section).

**How bad if true.** Misleads you.

**The answer.** Corrected in the third draft: the trial's entry says it can break the claim but not prove it, because Process3 judged only the modules it told.
- Not answered: the reviewer's point is stronger than that. On the matter of who is told, the trial could not have come out any other way on this record. The replay's report says so in those words.

### 73. Eight of 24 numbers checked were faulty

**The counter-argument.** Of 24 numbers checked against the evidence, 8 were wrong or misleading, and several numbers that are choices were not marked as choices.

**What it rests on.** Measured: each number was checked against the evidence files.

**How bad if true.** Misleads you.

**The answer.** Corrected in the third draft:
- "270 of the 296 changes, and 121 of those added a check" becomes "121 of the 296".
- "The check's three known firings were all false alarms" becomes: the only firings found in the record were three false alarms; a full count could not be made.
- The 947 findings and seven repairs belonged to the whole record check, not to the check on oversized files alone.
- "38 such pairs" is replaced by fuller figures, each with what it counts. As the replay now counts them: 36 pairs of modules where a test imports a later module without declaring it, and 122 undeclared pairs in all by test import.
- The hourly alarm woke ROOT five times out of five, not eight out of eight.
- "Truly affected" becomes "judged affected by Process3's AI workers".
- The counts of your 288 requirement lines are replaced by a recount: 186 kept as written, 46 kept with the way changed, 15 ended by decisions recorded as yours, 11 ended by Claude, 27 ended in part (4 of them by Claude), 3 open on question 1. "Almost all" is dropped and the numbers are given.
- "Mostly the growth itself" is removed.
- Every number is marked as measured, estimated or judged.

### 74. Plain words: undefined terms, things you have not seen, and claims stated more firmly than the evidence

**The counter-argument.** Seven terms were used without being defined ("status read-out", "standby session", "real level", "probe", "registration", "force-pushing", "pull request"). Four passages point to things you have not seen ("earlier reviewers", "later platform notes", "the audit", "three facts were corrected"). "Your seven earlier open points" heads a list of eight. Two statements are firmer than the evidence: that the platform gives no session a way to do your set-up acts, "so it is a fact and not a choice", and that the rule for who takes a slot "gives the same answer every time". And nobody can tell how "every one of its 238 steps" passed "with 63 failures".

**What it rests on.** Read in the documents: the second draft's own wording, checked against the evidence. On the set-up acts a worker's note says "in part", seen only in descriptions and never tried.

**How bad if true.** Misleads you.

**The answer.** Corrected in the third draft: each term is defined or replaced; each such reference is removed or explained in the sentence; no codes in the main text; the numbering of the open points is made consistent; the sentence about 8 Nov is rewritten (entry 1). On the two firmer statements the memo is silent. Answer taken from the reviewer's own proposed corrections: "no way that has been measured", and "is meant to give the same answer".

### 75. The list of your acts against your sentence of 13 Nov

**The counter-argument.** Your sentence of 13 Nov allows you only occasional changes to settings. Of the six rows in the second draft's table of your acts, one is a settings change. "Three times in nine days" is not "very occasionally".

**What it rests on.** Read in the documents: your requirement as an earlier audit quotes it.

**How bad if true.** Misleads you; minor, and mostly declared already.

**The answer.** Corrected in the third draft: one sentence under the table says that the record of 13 Nov allows you settings changes, and that the other rows are stated there for you to accept or strike. The list is also longer than it was: connecting an AI account before an external walk of AI journeys (entry 16); committing your approvals in both repositories, and each approvals edit together with a restart of ROOT (entries 28 and 33); and, if you take the fixed version, a settings change for each tranche (entry 13).

### 76. Six smaller places where a session's reading was written as something you did or said

**The counter-argument.** Six sentences give you more than the sources do.

**What it rests on.** Read in the documents, each against its source.

**How bad if true.** Misleads you; each is small.

**The answer.** Corrected in the third draft, each as the Ledger auditor proposed:
- "which you kept on 8 Nov" (an upgrade test): the decision record quotes you narrowing it to the last two or three releases.
- "as you began to on 9 Nov" (ending a set-up check): no words of yours name that check. Process3's coordinator began to, on your general instruction to cut what is not needed.
- "after you told sessions to stop": your quoted words of 5 Nov set a condition, a check only on evidence. They did not say stop.
- "Your decision to preserve permission management covers it": that it covers this check is Claude's reading of the record.
- "your standing design areas": your line has the architecture session define lanes.
- "You asked for it to be tried with an open mind": your words are quoted instead, "Try this, but measure the experience with an open mind as to whether it's work or not."

### 77. The rule that every addition cite its authority failed as a brake but worked as a trail

**The counter-argument.** Claude ended that rule. It did not hold growth back, but it is why Process3 could later count that 7 of 35 safeguards quoted you and 19 were the coordinator's alone. Without it nothing separates your word from a session's after the fact.

**What it rests on.** Measured: those counts.

**How bad if true.** Misleads you, later.

**The answer.** The memo is silent on the trail. Answer taken from the reviewer's own proposed correction: the rule ends as a licence to add, and the plain habit is kept that any quoted word of yours carries its date and source. That matches what the memo decides on attribution (entry 70). Ending the rule remains Claude's decision.

### 78. Decisions reported as made, for you to overrule

**The counter-argument.** Thirteen earlier requirements, six earlier open points and fourteen technical points are reported as decided, with "You can overrule any of them". A default you must act to reverse is how Process3's approval page worked: 119 of 126 lines kept, then 20 of 20 in three minutes. What is lost is not stated beside what is saved. Three purposes are kept with nothing holding them: "a module fits in one reading", "a lean repository", "act only on what you have read in full".

**What it rests on.** Measured: the approval figures; 86,347 lines of generated data had once sat in the product, and nothing now keeps such files out. Reasoning only: that a missing setting will now show as a job failing later for an unclear reason.

**How bad if true.** Misleads you.

**The answer.** The memo is silent. Answer taken from the reviewer's own proposed correction: each item Claude decided states what is lost beside what is saved, and the three purposes are said to be rules in words with nothing holding them.
- Not answered: the reviewer asked for fewer items decided by default. The third draft will carry more of them, not fewer. The authority the memo cites is your typed words of 14 Nov, "Decide technical matters yourself and tell me what you decided".

### 79. When a process fix reaches a running tranche: your words of 9 Nov were passed over

**The counter-argument.** The second draft says a process fault that blocks nothing waits for the next tranche. Process3's decision record quotes you on 9 Nov: "Pin moves should be lightweight fixes that improve velocity, not ruin it. So they should happen as needed, but also ganged up when possible". The draft follows the rule in your Foundations over those words and does not say so.

**What it rests on.** Read in the documents: your words as quoted.

**How bad if true.** Misleads you; minor.

**The answer.** The memo is silent on this conflict. Answer taken from the reviewer's own proposed correction: the draft says that the rule in your Foundations is followed over your words of 9 Nov, and why. The first question put to you (entry 13) bears on the same matter.

### 80. The line-by-line test of instruction files was ended, but a Ledger note saved on 14 Nov still asks for it

**The counter-argument.** Claude ended the line-by-line test of instruction files. A Ledger note saved again on 14 Nov still reads "each line passing the per-line test", so a third line is touched and not counted.

**What it rests on.** Read in the documents: the stored note. The store cannot show who saved it.

**How bad if true.** Minor.

**The answer.** The memo is silent on this note. Answer taken from the reviewer's own proposed correction: the item says so. The memo's general sentence also applies: the Ledger is unchanged, and where the two differ the definition states which it follows (entry 69).

### 81. Ending "nothing is ever refused for size" for the process's own texts could add refusals

**The counter-argument.** Your Foundations say "Nothing is ever refused for size." Claude ended that for the process's own texts, which may add refusals.

**What it rests on.** Read in the documents.

**How bad if true.** Minor, unless new limits follow.

**The answer.** Corrected in the third draft: only Process3's existing limits on role texts refuse. Nothing new refuses.

### 82. Twenty measurements where your line says one

**The counter-argument.** Your kept line says a platform behaviour is measured once by default. One trial asks for "twenty or more merges" and does not give the reason.

**What it rests on.** Read in the documents. Measured: the permission checker has passed and refused the same act minutes apart.

**How bad if true.** Minor.

**The answer.** The memo is silent. Answer taken from the reviewer's own proposed correction: the reason is given, twenty and not one because the checker has passed and refused the same act minutes apart.

### 83. The first contents of Process4 are written before any rule exists, and no size is given

**The counter-argument.** Process4's tool, texts and walk are written by sessions before the first tranche. The second draft gives no size for them, so there is nothing to compare later growth with.

**What it rests on.** Reasoning only.

**How bad if true.** Minor.

**The answer.** Corrected in the third draft: the tool's starting size is stated once it is built (entry 25). It is not known now.

### 84. Committing your approvals is not one act

**The counter-argument.** Your commit of your approvals is an edit, a proposed change, a wait for the test run and a click to merge.

**What it rests on.** Measured: your own commit in Process3 went that way.

**How bad if true.** Misleads you slightly.

**The answer.** The memo is silent on these steps. Answer taken from the reviewer's own proposed correction, which is wording: the act is described as it is. The memo does restate the act in other ways (entries 28 and 33).

### 85. Two retired hooks still run in the product

**The counter-argument.** Two retired hooks still run before every command of every session in the product. Only you can delete them, and that is not on the list of your acts.

**What it rests on.** Measured: the product's settings as they stand.

**How bad if true.** Minor.

**The answer.** Corrected in the third draft: stated in "What does not exist yet" (entry 25). The memo does not say that deleting them is added to the list of your acts.

### 86. Two small reports nobody asked for

**The counter-argument.** The process "shows you what [a release] carries", and ARCH "reports" a change across many modules. No line of yours asks for either. The reviewer calls them new, small and harmless.

**What it rests on.** Read in the documents.

**How bad if true.** Minor.

**The answer.** The memo is silent. The reviewer's own proposed correction is "leave, or drop" the words about the release. Which of the two the third draft does is not settled.

### 87. Two kept lines the main text never states

**The counter-argument.** Two lines of yours are kept only by a blanket sentence, where the silence could matter to a builder: that the product's standing instructions are "under thirty lines", written by the architecture session line by line, with each change listed in the tranche report; and that two ROOTs never both start an architecture session.

**What it rests on.** Read in the documents: your Foundations.

**How bad if true.** Minor.

**The answer.** The memo is silent. Answer taken from the reviewer's own proposed correction: one clause that names them among the lines that stand. The second mattered once a standby could take over; the standby is dropped (entry 15).

---

## What the first trial showed

One measurement finished on 14 Nov after the memo was written: a replay, on paper and with nothing run, of Process3's 178 recorded interface changes against the rules for notices. It bears on entries 7, 21, 36, 72 and 73. Each figure is marked measured, inferred or judged. "Judged effects" means the 241 cases where one of Process3's AI workers judged a notified module to be affected; that is a judgment, not ground truth.

- **(a) Telling every declared user reaches all 241 judged effects.** Measured: 241 of 241, when every module that declares a use is told on any merged change to a module's source or public requirements. Inferred: this could only have broken the rule, not proved it, because Process3 judged only the modules it told. On who is told, the result could not have come out otherwise on this record.
- **(b) The narrower trigger, "the interface changed", would have missed 5 of the 241.** Measured: it reaches 236.
- **(c) The claim that naming the changed parts lets a notified job read less without missing an effect is broken as stated.** Two of the 241 effects would not have been reached from the named parts. Judged: the two were found by a worker reading the evidence for each case; 169 of the 241 were matched mechanically (measured) and the rest were read one by one (judged). Whether a job could also test less was not measured; the replay could not measure it.
- **(d) Process3 did not in fact tell every declared user.** Measured: 167 declared pairs of user and provider were never sent a notice, and 66 of those were told by no route at all. The second draft's sentence that Process3 notified every declared user is wrong.
- **(e) Undeclared dependence exists.** Measured: 122 pairs of modules where a test imports another module without declaring the use, 36 of them a later module; none by import in code that is not a test. No effect on such a user was shown, and none was ever judged, so nothing is known either way.
- **(f) Nearly every merge would send notices.** Measured: under the four named parts, 71% of job merges (360 of 504) change the interface.

Two figures quoted by the reviewers are corrected by the replay. "65 of 178 notices could name no part" is what Process3 recorded; re-derived, the figure is 17 (measured). "38 undeclared pairs" is 36 to a later module, and 122 in all by test import (measured).

None of this proves the notice rule. It shows one claim broken, in (c), one wording that misses effects, in (b), and one result, in (a), that could not have failed.
