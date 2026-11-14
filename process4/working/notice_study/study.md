# When does a change to one module require the modules that use it to be updated?

A study of Process3's record. 14 Nov 2026. Read-only against `/home/user/repos/civicsmith-copy`; nothing was committed, fetched, checked out or pushed, and no session was started. Everything written is under `/home/user/work/notice_study/`. Scripts run with `python3 -I <script>`.

**The question, in the owner's words (14 Nov):** "If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary. There must be a practical means of identifying when a change doesn't require user modules to be updated." And: "Explain why using the current criteria 5 of the 241 changes that AI workers judged real would have been missed. What was different in those 5 modules?"

**Four words kept apart throughout.** *Measured*: counted by a script on the record or the code. *Estimated*: worked out from a sample. *Judged*: my reading of a sentence or a diff (one reader, not blind). *Unproven*: never run.

**Words.** A *provider* is the module that changed. A *user* is a module that declares a use of it. A *notification* is one user told of one change. Process3 recorded 178 changes, sent 2,707 notifications, and its AI workers judged 2,342 of them: 241 "affected", 2,101 "not affected".

## Summary

1. **"Affected" did not mean "had to be updated".** Of the 241 affected verdicts, 40 were a user that was wrong or failing until it changed (*broken*), 34 were a user that changed its code to take up something new (*adopted*), and 166 needed no change to the user's code: in 140 the user's own job said so or changed nothing for it, and for 26 no follow-up ever ran. One could not be told. (Judged, from each verdict's reason, the user job's own written words and the diffs.)
2. **So 40 of 2,707 notifications (1.5%) found a user that needed updating, and 34 more (1.3%) found one that chose to adopt something.** The 40 sit in 23 of the 178 changes; 17 of the 40 come from two changes that retired old names.
3. **Three of the five missed verdicts were real breaks; two were not.** In all five the provider changed what it does without changing anything that carries a name or a number. Each is explained in section 1.
4. **No rule that looks only at the provider's change is both safe and efficient on this record.** "Tell everyone only when a public requirement or its test changed" still sends 82% of the notifications and misses 3 of the 40 broken users. Rules that look only at changed names send under 5% and miss 28 or more of the 40.
5. **A rule that asks, for each user, "did something this user holds by name change?" sends 17% of the notifications and reaches 35 of the 40 broken users and 29 of the 34 adopters** (rule g1, section 4; measured against judged classes). Of the five broken users it misses, three had work of their own at the time, and in three what broke was a test of the user's own.
6. **Most users had work of their own at the time.** 1,735 of the 2,707 notifications (64%) went to a module that already had an unmet requirement or an open job, and 33 of the 40 broken users were among them. The notifications that would start a job for no other reason number 972 (measured).
7. **Not determined:** what running each user's existing tests against each provider change would have shown (it cannot be done by reading); whether the 532 never-judged pairs hold more broken users; whether any of this holds outside the week of Process3, in which one large renaming dominated.

---

## 1. The five

The replay tried the rule "the interface changed if one of four named parts changed": an exported name (with a fingerprint of exported data), a public requirement under its permanent number, a test whose title names a requirement number, or a published file that is not code. Five affected verdicts sit in changes where none of the four changed.

For each: the provider's change at its own commit, the verdict, why no part caught it, what would have had to be true, and what the user's job did afterwards (measured from the merges; the reading of them is judged).

### 1.1 agent-drafts, pull request 570, judged to affect agent-worker

- **What changed.** The drafting code stopped telling the AI conversation which "runner" to use (the runner is the container for a member's own Claude sign-in). Four calls lost one argument each; one test file was added. Commits `ca983c4b7a` to `f6049ea4a4`.
- **Why the user was judged affected.** agent-worker hands every draft request to that code. A runner was about to be connected again in agent-worker, so a draft on a member's sign-in would now reach the model with no runner.
- **Why none of the four parts caught it.** No name was added, removed or called differently. The requirement file was not touched. The new test is titled "notice agent-worker:364 ...: converse is called without a runner", which names another module's notice and no requirement number.
- **What would have had to be true.** "No draft names a runner" would have had to be a numbered public requirement of agent-drafts, with a test titled by that number. It existed only as a found flaw in the *other* module's file and a coordinator ruling.
- **Was the verdict right?** Yes, and the user was broken. agent-worker's job, already open, added a gate to its source (pull request 569, merged 74 minutes later: "a sign-in there would reach the model with no runner even while `RUNNER` is bound"). Its later pull request 619 added a test only and says "Confirmed, no code change", because the change was already in.
- **What was different here.** These two modules are one Worker cut in two to keep a requirement file under a size cap, and each uses the other. The change went back and forth between them four times (364, 570, 569, 619).

### 1.2 agent-steps, pull request 185, judged to affect agent-worker

- **What changed.** Each record of AI usage that agent-steps hands on lost the fields `model` and `effort` and gained `entry_id` and `label`. One function body in one file. Commits `589b844ea4` to `efaf53b300`.
- **Why the user was judged affected.** agent-worker read `model` from those records and sent it on. After the change it would send nothing for the model and drop the two new fields.
- **Why none of the four parts caught it.** The function's name and the way it is called did not change. The requirement file was not touched: public requirements 26 and 47 *already* described the new shape and were marked "not yet met", and the job changed the behaviour without striking or editing the marks. The tests that changed do name requirements 26 and 47, but agent-steps writes its tests with a helper of its own (`t("R47: ...")`) inside long files, not as standard test titles, so a reader of test titles sees nothing. Three modules write tests this way.
- **What would have had to be true.** Either the mark on the requirement changed when the behaviour did, or the tests were titled the standard way.
- **Was the verdict right?** Yes, and the user was broken. agent-worker's open job changed one line of source (pull request 97, six and a half hours later), and pull request 257 added a confirming test.

### 1.3 agent-steps, pull request 497, judged to affect agent-worker

- **What changed.** When a run's state holds something that belongs to the AI provider (a session id), agent-steps now publishes no state for that step and adds an entry to the run's list of refusals. Two places in one file. Commits `ef40849d5f` to `0f11547770`. The change was itself agent-steps' answer to a notice from agent-harness.
- **Why the user was judged affected.** agent-worker returns that list of refusals to its caller, so its answer can now carry the new entry.
- **Why none of the four parts caught it.** A change inside a function body. The requirement file was not touched; public requirement 55 says the state holds nothing provider-held, and nothing anywhere says a refusal is added to the list. The tests use the home-made helper again.
- **What would have had to be true.** The new outward behaviour (a refusal a caller can now receive) stated in a public requirement.
- **Was the verdict right?** The effect is real; the user needed no change. Its follow-up (pull request 619) added a test only: "no source change is owed (BOB, 6 Nov 04:42): this test pins the pass-through."

### 1.4 ai-accounts, pull request 316, judged to affect store-assembly

- **What changed.** A fix of a flaw: when a member's sign-in is recorded, the act is now recorded under "member:ann", not "ann". Two lines. In the requirement file a *found flaw* (numbered F4) went from "not yet met" to "met". Commits `202498e237` to `637f73a5cf`.
- **Why the user was judged affected.** Three of store-assembly's own tests recorded the disclosure under the bare name and would fail.
- **Why none of the four parts caught it.** A change inside a function body. A found-flaw number is not a public requirement number. The new test's title names no requirement number.
- **What would have had to be true.** A fix that changes what callers see would have had to be written on the public requirement it corrects, not only as a found flaw. (39 of the 178 changes touched the requirement file only in found-flaw marks; measured by the replay.)
- **Was the verdict right?** Yes; the user's tests were broken, its source was not. store-assembly's job was already open and had started from the provider's merged change; it respelled three test lines (pull request 325, merged about half an hour after the verdict). The flaw had been reported by store-assembly's own job in the first place.

### 1.5 member-roster, pull request 286, judged to affect membership

- **What changed.** A generated file that lists every module in order gained one module, because the product's module list gained one. Commits `14dbe3fc71` to `8e8654c79a`.
- **Why the user was judged affected.** membership runs its registered readers and listeners in that order.
- **Why none of the four parts caught it.** The changed list lives in a file no other module imports. The name other modules do import is computed from it, so its own text did not change and the fingerprint (taken of text, not of the computed value) did not either. Public requirement 61 already says "a module added, moved or dropped in the file changes the list with no edit here"; its text did not change. The changed test is titled by a found-flaw number.
- **What would have had to be true.** A fingerprint of the value as computed. More to the point, the cause was not member-roster's job at all: it was an edit to the module list, a file that belongs to no module.
- **Was the verdict right?** The effect is real; the user needed no change. Its follow-up (pull request 324) added one test file: the new module "ranks where the provider puts it with no change here."

### What was different in those five

| | Changed what callers see, with no name or number changed | Stated in a public requirement whose text did not change | Tests not titled by a requirement number | User already had a job open | What the user changed |
| --- | --- | --- | --- | --- | --- |
| agent-drafts 570 | yes | no (lived in the other module's file) | yes | yes | source (a gate) |
| agent-steps 185 | yes | yes (requirement already written, mark left) | yes (own helper) | yes | source (one line) |
| agent-steps 497 | yes | in part | yes (own helper) | yes | a test only |
| ai-accounts 316 | yes | no (a found flaw) | yes | yes | three test lines |
| member-roster 286 | yes (data) | yes | yes (found-flaw number) | no | a test only |

All five share the first column. Four are from two pairs of modules (agent-drafts, agent-steps and agent-worker) that were split apart for file size or moved code between them that week.

---

## 2. The 241

### 2.1 What the users' own jobs did afterwards (measured)

For each affected verdict the script takes the user's own merges after the provider's merge, up to and including the merge named in the notice's "answered" record (`followup.py`). The "answered" merge alone is not enough: in two of the five the change was made in an earlier merge of a job already open.

| | Verdicts |
| --- | --- |
| A follow-up merge exists | 215 (213 by the answered record, 2 by the user's next merge) |
| No follow-up merge (verdicts of 9 Nov; the process stopped) | 26 |
| Follow-up changed a source file of the user | 138 |
| Follow-up changed only tests | 74 |
| Follow-up changed only records (ledger, receipts, notes) | 3 |
| A test file named for the notice was added | 120 |

"Changed a source file" does not show that the notice was the reason: most of those jobs were doing work of their own. Narrower (`outcome.py`, measured):

| What can be tied to the notice | Verdicts |
| --- | --- |
| The user's job wrote that no code change was needed ("confirmed, no code change" or like words, in a line naming the notice) | 98 |
| A source hunk lies within 25 lines of the place the verdict cited | 63 |
| A test hunk lies there | 3 |
| Source changed somewhere else in the same job | 25 |
| Tests only, no statement | 23 |
| Records only | 3 |
| No follow-up | 26 |

### 2.2 Broken, adopted, or nothing to change (judged)

I read all 241 reasons, the user job's written words for each (`jobsaid.py`), and the source hunks at the cited place for about 80. Classes in `judged241.txt`; the full table is `data/classified241.tsv`.

| Outcome | Verdicts | Share of 241 | Share of 2,707 notifications |
| --- | --- | --- | --- |
| **Broken**: the user's code or its existing tests were wrong or failing until changed | **40** (26 in source, 14 in existing tests only) | 17% | 1.5% |
| **Adopted**: the user changed its code to take up something new, or to tidy; nothing was wrong without it | **34** | 14% | 1.3% |
| **Nothing to change**: the user's job changed no code for it; at most it added a test confirming so | **140** (77 added such a test) | 58% | |
| **No follow-up**, and the reason reads as nothing to change | **26** | 11% | |
| Cannot tell | 1 | | |

- The 40 broken sit in **23 of the 178 changes**. 11 are from `ai-runs` 96 and 6 from `op-declarations` 95, the two changes that retired the old AI-account names.
- Of the 166 with nothing to change, most are *pass-through*: the provider's answer changed and the user hands it on unchanged. The user's behaviour changed; its code did not need to.

### 2.3 Why the user was touched (judged kind; "public requirement changed" is measured)

| Kind of change at the provider | Verdicts | Broken | Adopted | Nothing to change (incl. no follow-up) |
| --- | --- | --- | --- | --- |
| A name, operation or field removed or renamed | 27 | 22 | 3 | 2 |
| The way something is called changed | 38 | 2 | 8 | 28 (14 with no follow-up) |
| A new capability | 19 | 2 | 10 | 7 |
| The answer or behaviour changed under an unchanged name | 103 | 9 | 12 | 82 |
| ... with a public requirement changed in the same change | 61 | 4 | 9 | 48 |
| ... with no public requirement changed | 42 | 5 | 3 | 34 |
| An exported table or list changed its contents | 43 | 4 | 1 | 38 |
| ... with a public requirement changed | 16 | 2 | 1 | 13 |
| ... with none changed | 27 | 2 | 0 | 25 |
| A published test fixture or helper changed | 3 | 0 | 0 | 3 |
| A file that is not code, a wire connection, a served page, a deploy script, a committed bundle | 8 | 1 | 0 | 6 (1 cannot tell) |

Two readings:

- **Removal is the kind that breaks.** 22 of the 27 removals broke the user. Every other kind broke its user at most one time in eight.
- **Verdicts that look wrong as "affected".** The 14 verdicts on `membership` 1030 (a method gained an argument in front; every caller passing a plain member id is unchanged, and the reasons say so) and most of the 82 pass-through cases are "the user calls the thing that changed", not "the user must change". None is false as a statement; they answer a different question from the owner's.

### 2.4 Opportunity and the user's own "not yet met"

Of the 34 adopters, 27 had an unmet requirement of their own at the time and 17 had one on a line that names the provider (measured: a "not yet met" mark in the user's requirement file at the provider's commit). For those the user's job was due to run anyway. Of the 40 broken, 32 had an unmet requirement of their own, and 13 of the 40 had a job open at the moment the provider merged (`jobopen.py`).

---

## 3. The 2,101 not affected

**Sample (estimated).** 120 drawn at random, seed 20261114 (`sample_not_affected.py`); each reason read and classed (`judged_sample.txt`; judged).

| Why not affected | Of 120 | Share | 95% range |
| --- | --- | --- | --- |
| The user has no code, or no file of it imports or names the provider (a declared use only) | 47 | 39% | 30 to 48% |
| The user uses the provider, but not the part that changed | 63 | 53% | 44 to 62% |
| The change only added names (the verdict says so and looks no further) | 4 | 3% | |
| The user uses the changed part and the change does not alter what the user does | 5 | 4% | |
| The provider changed no source | 1 | 1% | |

**Whole record (measured, `srcimp.py`).** Of the 2,707 notified pairs: in 1,512 (56%) the user's source imports the provider; in 685 (25%) only its tests do; in 510 (19%) nothing of the user imports the provider at all. 233 of the 241 affected verdicts are in the first two groups; 8 are in the third (a wire connection, operation names written as words, an instance handed in).

**What each rule would have sent to the 120 sampled** (measured): rule f, 95 of them; rule g1, 18.

---

## 4. Candidate rules

Each rule is computed for every one of the 2,707 notified pairs at the change's own commits (`signals.py`, `rules.py`). The provider is read before and after; the user as it stood before. "Broken" and "adopted" are the judged classes of section 2. Process3 as it ran is the first row.

| Rule | Changes on which anyone is told (of 178) | Notifications (of 2,707) | Of those, judged (of 2,342) | Affected reached (of 241) | Broken reached (of 40) | Adopted reached (of 34) |
| --- | --- | --- | --- | --- | --- | --- |
| Process3 as it ran | 178 | 2,707 | 2,342 | 241 | 40 | 34 |
| **(a)** every declared user, whenever a source file of the provider changed | 164 | 2,385 | 2,204 | 239 | 40 | 32 |
| **(b)** only users that import a name the change removed or re-signed | 11 | 26 | 23 | 8 | 1 | 2 |
| (b, widened) ... or import the class, or call a method of that name | 21 | 124 | 115 | 51 | 12 | 9 |
| **(c)** (b) plus users whose own requirements or tests cite a public requirement of the provider that changed | 53 | 186 | 167 | 67 | 22 | 22 |
| **(d)** (c) plus users importing a changed fixture or helper, or naming a changed non-code file | 68 | 241 | 212 | 73 | 24 | 22 |
| (d, widened) with the widened (b) and citations in source comments too | 76 | 331 | 293 | 102 | 26 | 25 |
| **(e)** users whose own tests fail against the provider's merged change | cannot be computed by reading | | | | | |
| **(f)** everyone, but only when a public requirement or a test naming one changed | 151 | 2,213 | 1,886 | 207 | 37 | 33 |
| (f, tests not counted) everyone, only when a public requirement changed | 93 | 1,388 | 1,104 | 130 | 28 | 30 |
| (f, strict) everyone, only when a public requirement was reworded, removed or retired | 25 | 420 | 390 | 51 | 21 | 8 |
| **(g1)** the user holds, by name, something that changed (defined below) | 110 | 460 | 416 | 150 | 35 | 29 |
| (g1 or the user has its own unmet requirement naming the provider) | 159 | 737 | 664 | 167 | 37 | 31 |
| (k1) g1 without "cites a requirement that became met or was added" | 92 | 387 | 358 | 126 | 30 | 17 |
| (g4) every user that imports the provider at all, on any source change | 158 | 1,900 | 1,748 | 231 | 39 | 29 |

(a) on all declared users, not only those Process3 told, is 2,521 pairs of 2,874.

### What each rule misses, and what it would need to be safe

**(a) Every declared user on any source change.** Misses the two verdicts on changes with no source change (`calculations` 70, `credentials` 74; both adoptions). Reaches every broken user. Saves 12%. *To be safe* it needs nothing new from the provider's job; it needs every dependence declared, and 122 pairs of modules depend through tests without declaring it (the replay's count).

**(b) Imported names removed or re-signed.** Misses 39 of 40 broken. The reason is the shape of the code: 104 modules export a class and a function that makes it, and users call methods on the object they are handed. A removed word inside an answer (`principal_claude`), a retired operation named as a word (`groupkeystate`) and a changed table are not imports at all. *To be safe* every use would have to be a named import of a function, with no objects handed in, no words, no wire. That is a rewrite of the product, not a rule.

**(c) Plus citations of changed public requirements.** Reaches 22 of 40. Citing is the sharpest single signal after removal: of 149 judged pairs where the user cites a changed requirement, 62 were affected (42%, against 10% overall), 22 broken, 20 adopted. *To be safe* every user would have to cite, by the provider's name and number, each public requirement it relies on, and the provider would have to change the requirement's text whenever the behaviour changes. Today citing is a habit, not complete; how complete was not measured.

**(d) Plus fixtures and non-code files.** Adds 2 broken users. "Names a changed non-code file" found no pair at all: the two changes to `agent-worker`'s connection file reached their users over a wire, which nothing in the user's files names.

**(e) The user's own tests fail.** Not computable here: it needs each user's tests run at 178 commits. What the record does show (judged from the written reasons, not by running anything): for 14 of the 40 broken users the verdict or the job names a test of the user that failed or would fail; and the provider `ai-accounts` wrote in its own requirement file, after it removed names on 4 Nov, "ai-runs 137/145 tests red, ai-use about 80, question-explorer 40/46". Of the five broken users that rule g1 misses, three broke in a test of their own. **Does it count as one of the three tests? Both readings, not decided here:**
  - *It is module tests.* The words of 13 Nov say users' jobs "are updated as needed and tested", and that "tests run only when there is a fully informed reason to run them". The user's module tests are the user's own; a provider's merged change to something the user uses is an informed reason to run them. No new kind of test is created.
  - *It is an extra run.* The three tests are "each job's own module tests", the notice, and the walk, and the notice "is a notification, not a test". Running a module's tests when that module has no job, because another module merged, is a run the definition does not list. Done for every user at every merge it is the full regression that "the internal walk replaces".
  - A narrower form avoids the question: a module with work of its own gets a job anyway, and that job's module tests run against the provider as merged. That was 64% of the notified pairs here.

**(f) No notice unless a public requirement or its test changed.** Misses 3 broken users, and they are three of the five of section 1: `agent-drafts` 570, `agent-steps` 185, `ai-accounts` 316. Saves only 18%, because 151 of 178 changes alter a public requirement or a test that names one. Without counting tests it saves 49% and misses 12 of 40. *To be safe* the provider's job would have to (1) hold every behaviour another module relies on as a numbered public requirement with a test titled by that number, in the standard form; (2) change that requirement's text, or strike its mark, in the same change as the behaviour; (3) write a fix that changes what callers see onto the public requirement, not only as a found flaw. And it would still tell every user, used part or not.

**(g1) The user holds, by name, something that changed.** A user is told when at least one of these is true of its own files as they stood before the change:
  1. it imports a name that was removed or whose call changed, or imports the class, or calls a method of that name (124 pairs; 12 broken);
  2. it imports, by name, exported data whose contents changed (112 pairs; 8 broken);
  3. it imports a file under the provider's tests that the change touched (89 pairs; 7 broken);
  4. its requirements, tests or source comments cite a public requirement of the provider that changed (182 pairs; 22 broken);
  5. it uses, as a quoted word, a key or a property, a word of 8 or more letters that the provider's code used before the change and uses nowhere after it (109 pairs; 23 broken). This catches renamed fields and retired operations that no import shows.

  Sends 460 (17%). Misses 5 broken users: `ai-accounts` 124 to `signin-door` (the names it lost were removed from a third module's hand-on list), `ai-accounts` 316 to `store-assembly` (section 1.4), `ai-catalogue` 484 to `store-assembly` (its tests signed the old seed), `answers` 103 to `agent-worker` (a copied list held equal by a test), `jurisdictions` 40 to `instance-setup` (a data file gained entries). *To be safe* it needs what (c) needs, and it would still miss a break that travels through changed data or a third module. Parts 2 and 5 are pattern matches and will mislead on other code.

**Per change:** under g1 nobody is told on 68 of the 178 changes. On the record, 155 of the 178 changes broke no user.

### Who had work anyway (measured, `idle.py`)

| | Notified pairs | Broken among them | Told by g1 | Broken reached by g1 |
| --- | --- | --- | --- | --- |
| User had an unmet requirement of its own or a job open | 1,735 | 33 | 336 | 30 |
| User had neither (the notice alone would start its job) | 972 | 7 | 124 | 5 |

Under Process4 a module with work gets a job without any notice. So the jobs that a notice alone would start are the 972; under g1 they are 124. The two broken users missed there are `signin-door` and `store-assembly` above. The week measured was one in which most modules had work; in a quieter round the second row would be larger.

---

## 5. What a sharper definition could look like

Two candidates, in plain words. Neither adds a test or a check. Each is a rule for who is told, computed from the change and from the user's own files, plus a rule for how jobs write requirements.

### Candidate one: "something this module holds was taken away or changed"

> A change requires a user module to be updated when the user's own files name something that the change removed, renamed, changed the calling of, changed the contents of, or reworded: a name it imports or a method it calls; a table it imports; a test helper it imports; a word of the provider's it writes out; a public requirement it cites, if that requirement was reworded, removed or retired. Nothing else requires an update. A requirement that only became *met* is not a change of promise; a user that was waiting for it has its own "not yet met" line, and that line is what makes its job run.

- *Cost on this record (measured against judged classes):* 387 notifications in place of 2,707 (rule k1).
- *Missed:* 10 of the 40 broken users; 17 of the 34 adopters are reached without being aimed at.
- *Unproven:* that a user's own "not yet met" line brings its job at the right time (17 of 34 adopters had such a line naming the provider); everything about running it.

### Candidate two: "anything this module names changed"

> As candidate one, and also when a public requirement the user cites changed in any way, including becoming met.

- *Cost:* 460 notifications (rule g1). With "or the user has its own unmet requirement naming the provider", 737.
- *Missed:* 5 of the 40 broken users (3 with the addition). Three of the five had work of their own at the time; two did not (`signin-door`, `store-assembly`) and were found only because Process3 told everyone.
- *Unproven:* the same, and that jobs can be held to citing what they rely on.

### What both need from jobs (rules for writing requirements and tests, not checks)

1. **A module's requirement file says what it relies on.** For each provider, the numbers of the public requirements it depends on, written in one agreed form. This is what makes "who is told" computable. On the record, citing is the best signal there is after removal.
2. **A provider changes a public requirement's text, or its mark, in the same change as the behaviour.** Three of the five misses are this rule broken.
3. **A fix that changes what callers see is written on the public requirement,** not only as a found flaw.
4. **A test is titled by the requirement number in one standard form.** Three modules do not.
5. **A name is retired by removing it,** never by leaving it in place with a different meaning. Removal is what the mechanical rules see best, and it is the kind that broke users (22 of 27).

### A structural point from the record

- 510 notifications (19%) went to a user none of whose files imports the provider. Process4's module tests already include "a check that the module's declared uses match its imports". If a declared use with no import is removed from the list, or is required to say what it rests on (a wire connection, an object handed in, a word), those notifications either stop or become explainable. 8 of the 241 affected verdicts, 1 of them broken, are in this group, so the uses cannot simply be dropped.
- The module list itself is an interface. `member-roster` 286 and 446 were not caused by member-roster's job; the module list changed. An edit to that list by ARCH reaches seven modules that run things in its order, and no job's change shows it.

### What is measured, estimated, judged and unproven

- **Measured:** every count of notifications, signals, follow-up merges, files changed, imports, unmet marks and open jobs; each rule's notification count.
- **Estimated:** the reasons behind the 2,101 "not affected" (a sample of 120).
- **Judged (by me, one reader, knowing the outcome):** kind and outcome of each of the 241; therefore "broken reached" and "adopted reached" for every rule. The verdicts themselves are AI workers' judgments. For 26 there is no follow-up to check against.
- **Unproven:** every rule here as a working process. None was run. No rule was tried on pairs Process3 never judged (365 notified, 167 declared and never told) or on modules that depend without declaring it.

---

## 6. What could not be determined

1. **Rule (e).** Whether each user's existing tests would have failed on each provider change. Needs 178 commits checked out and up to 2,707 test runs; the agent-worker suite alone takes six minutes.
2. **Whether broken users exist outside the 241.** The 2,101 "not affected" verdicts were not re-examined for wrong "not affected"; 532 declared pairs were never judged; the replay found three such users on `membership` 1030.
3. **How complete citing is.** How many real dependences a user's files cite by number today.
4. **Whether the figures hold in an ordinary week.** The record is six days dominated by one renaming (the AI-account work); 17 of the 40 broken users come from two changes.
5. **The 26 with no follow-up.** Classed by reading only.
6. **Noise in the word rule.** The "dropped word" signal is a pattern over text; its false alarms on this record are counted (58 of 109 judged pairs not affected), its behaviour on other code is not known.

---

## Files

| File | What it is |
| --- | --- |
| `nlib.py` | helpers; imports the replay's `lib.py` and `extract.py` read-only |
| `followup.py` | each affected verdict's follow-up merges and what they changed → `data/followup.json` |
| `jobsaid.py` | what the user's job wrote about each notice → `data/jobsaid.json` |
| `outcome.py` | mechanical outcome classes → `data/outcome.json`, `scratch/near_hunks.txt` |
| `judged241.txt` | my class for each of the 241 (kind, outcome) |
| `sample_not_affected.py`, `judged_sample.txt` | the seeded sample of 120 and my class for each |
| `signals.py` (about 5 minutes) | the mechanical signals for all 2,707 pairs → `data/signals.json` |
| `srcimp.py`, `jobopen.py` | source or test imports; job open at the provider's merge |
| `rules.py` | the rule table → `data/rules.json`, `data/rules_pairs.json` |
| `signal_table.py`, `idle.py` | per-signal scores, cross tables, users with and without work → `data/tables.json`, `data/idle.json` |
| `data/classified241.tsv` | one row per affected verdict: classes, follow-up, which rules reach it, the verdict's reason |
| `show5.py`, `dump241.py` | print the record for reading |

Order: `followup.py`, `jobsaid.py`, `outcome.py`, `sample_not_affected.py`, `signals.py`, `srcimp.py`, `jobopen.py`, `rules.py`, `signal_table.py`, `idle.py`. The replay's own data in `/home/user/work/replay/data/` must be present.

Commits: records at `origin/process-state` `c4c252913b`; code at `origin/tranche` `e7ec72e093`; each change read as its merge against its first parent (listed in the replay's `appendix_commits.md`).
