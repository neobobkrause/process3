# Offline replay for trials J4 and J5: results

Run 14 Nov 2026. Read-only against `/home/user/repos/civicsmith-copy` (and, for reading Process3's tool source only, `/home/user/repos/process3`). Nothing was committed, fetched, checked out or pushed; no session was started. Every script is in this directory and runs with `python3 -I <script>`.

## Commits used

| Ref | Commit |
| --- | --- |
| `origin/process-state` (the records) | `c4c252913b0727096a978c581016f362937c61c4` |
| `origin/tranche` ("the tip", "today's module list") | `e7ec72e093014e59abcd736b9f8724bd57698b81` |
| `origin/main` | `0dea5a6efdd24dd5b74a08c231a9603848ad7d5d` |
| Process3 tool read for its rules (`origin/tranche` of `process3`, files `tool/lib/notice.mjs`, `exports.mjs`, `layerflow.mjs`, `checks.mjs`) | copies in `scratch/p3_*.mjs` |

Each of the 178 changes is read as `git diff <first parent> <merge>`; the merge and first parent of every change are listed in the appendix (`appendix_commits.md`) and in `data/j4a_rows.json`. 175 merges are reachable from `origin/tranche`; three (pull requests 1097, 1098, 1099) only with `--all`. All 178 resolve to exactly one merge commit.

## Results that contradict a number or a sentence in the definition

1. **"If no part can be named ... That happened in 65 of Process3's 178 notices."** 65 is what Process3 *recorded* (no ids and no export difference in the notice file; reproduced exactly, holding 63 affected verdicts). Re-derived at each change's own commit with the parts the definition lists, the number is **17** (names, public ids, ids whose tests changed), **15** with published non-code files, **11** with a hash of exported data as well. With names and public ids only it is 57.
2. **"A merged job changed its module's interface" as the trigger of test two.** Read as "one of the four parts changed", it fires on 167 of the 178 recorded changes and reaches **236 of 241** affected verdicts, not 241. Process3's "any source file changed" reaches **239 of 241**. Neither wording misses none.
3. **"Process3's rule ... notified every module that declares a use of it."** It did not: 167 declared-user pairs were never sent a notice, 66 of them were told by no route at all, and three of those 66 call the very method whose change drew 14 "affected" verdicts from the users that were told.
4. **"38 such pairs exist in tests today."** My scan finds **36** undeclared test-import pairs *to a later module* (the study's 38), but **122** undeclared test-import pairs in all. The sentence in the definition reads as if 38 were all of them. In non-test source: 0 by import, 24 by SQL, 35 by file-path reference, 4 by service binding.
5. **"Today's module list has three such uses."** True of declared uses only (3). By import there are 39 module pairs whose tests import a later module (3 declared, 36 not).

---

## J4. "Telling every declared user on any change in the provider misses none"

### J4 a. Declared users at each change's own commit (`j4a.py`; measured)

| | Count |
| --- | --- |
| Changes (notices) resolved, both parents present | 178 of 178 (144 "Merge job PR", 34 "Merge layer PR") |
| Notifications recorded in the notices | 2,707 |
| Declared-user pairs at the first parent (same number at the merge) | 2,874 |
| Notified modules that were not declared users at the change's commit | 0 |
| Verdicts: affected / not affected | 241 / 2,101 |
| Affected users inside the declared-user set at the first parent | **241 of 241** |
| Declared-user pairs Process3 did not notify | **167** (confirms the earlier sample) |

**Why 167 were not notified.** All 167 sit in the 34 layer-flow notices (6 to 9 Nov). Under layer flow (`tool/lib/layerflow.mjs`) a notice went only to users whose work was in a *later* layer; users in the provider's layer were to be "rescheduled" instead, a different record (`layerflow/<n>/reschedule/`), with no verdict.

- 101 of the 167 have a reschedule row for that provider and pull request: told by the other route, never judged.
- **66 were told by no route.** Each is a user in the provider's own map layer when the provider was reopened in a later "completion" layer (12, 13, 14): neither "same layer" nor "later". Examples: `ai-runs:1004` (7 users), `inquiry:1006` and `inquiry:1028` (9 each), `provenance:1002` (7), `leg-earning:1003` (6), `membership:1030` (4).
- Follow-up (`j4a_untold_names.py`, static signal only): of the 66, 60 import the provider; none imports a removed or re-signed name; 3 hold a class whose member was re-signed. Those 3 are `ai-accounts`, `credentials` and `project-roster` on `membership:1030`: their source calls `Membership.isAdministrator` (2, 2 and 3 call sites at the merge), the method whose changed signature is the stated reason for all 14 "affected" verdicts on that notice. By the record's own standard these are three real effects outside the 241.

**Verdicts still owed.** The "783 owed" in the plan is the count of owed *rows*; 771 of them were later followed by a verdict.

| | Count |
| --- | --- |
| Notifications with no verdict | 365 (2,707 less 2,342) |
| ... closed without a verdict by the user's own pull request or layer land | 228 |
| ... with neither a verdict nor an answer (truly open) | **137** (134 with no triage row at all, matching the study, plus 3 owed rows) |
| Owed rows still without a verdict | 12 (9 answered by a pull request or land, 3 open) |
| Declared users never asked (above) | 167 |
| Affected verdicts with no answered record | 28 of 241 |

So 532 declared-user pairs on these 178 changes carry no judgment (365 + 167), against 2,342 that do.

### J4 b. What this shows and does not show

- **Shown (measured):** every one of the 241 users Process3's workers judged affected was a declared user of the provider at the change's own commit. A rule that tells every declared user would have told all 241.
- **True by construction:** Process3 judged only modules it had notified, and it notified only declared users (0 exceptions). So no affected verdict *could* lie outside the declared set. "241 of 241" cannot fail on this record and is not evidence that undeclared users are unaffected.
- **Not shown:** that the 241 are all the real effects. 365 notified pairs and 167 declared-but-unnotified pairs were never judged; undeclared dependents were never asked; merges that raised no notice were never examined; "affected" is an AI worker's judgment.
- **Shown against Process3, not against Process4:** the three `membership:1030` users above. They are declared users, so Process4's rule reaches them.

### J4 c. Attempts to break the claim

**(1) Dependence that is not declared** (`undeclared.py`, `undeclared_names.py`, `bindings.py`; measured, with the heuristics named)

At the tip (`e7ec72e`):

| Route | From non-test source | From tests |
| --- | --- | --- |
| Import statements between modules | 3,029 statements, 1,936 pairs, **0 undeclared** | 7,522 statements, 2,423 pairs; **198 statements to an undeclared module, 122 undeclared pairs**; 36 of those pairs (71 statements) are to a later module |
| File-path string naming another module's file (heuristic: a string literal that resolves to a file another module owns) | 35 undeclared pairs (28 to a later module) | 72 undeclared pairs |
| SQL naming a table another module's source creates (pattern match) | 24 undeclared pairs (5 to a later module) | not scanned |
| Service or cross-script binding in a `wrangler.jsonc` | 7 bindings to another module, **4 not declared** (agent-worker to plane; plane to pdf-worker, ocr-worker, sheet-worker) | |
| Union of import, path and SQL | **240 undeclared pairs** | |

Not read by any script: instances handed in at run time, word keys, wire routes, copied constants. Also 49 code files with no owner module hold 134 imports of module files; nothing can be told to them.

Against the study's figures: source imports undeclared 0 (same); undeclared test-import statements 198 (study 202); undeclared test pairs to a later module 36 (study 38); undeclared SQL pairs 24 (same); path pairs differ (96 here, 158 there) because the heuristics differ. The study's scripts no longer exist, so the difference of two pairs cannot be traced.

Did the provider of an undeclared pair change in the record?

- From the tip list: 135 of the 240 pairs have a provider that is the provider of at least one recorded change (320 pair-and-change combinations).
- Re-read at each change's own commit (the stronger form): **190 (change, undeclared dependent) pairs across 68 of the 178 changes** where a module depended on the provider without declaring it and was not told. By route: 103 by a test import (42 changes), 55 by path, 34 by SQL. In **78** of them (45 changes) the very file referenced changed in the merge.
- One pair was a non-test source import: `agent-worker:97`, where `agent-drafts`' source imported `agent-worker` undeclared (the size split of 4 Nov; declared since).
- Of the 48 test-import pairs whose imported file changed: 1 imports a name whose signature changed (`following:744`: `monitoring`'s test imports `following`'s fixture `world`, which gained an optional parameter; additive); 5 import the whole file while some name changed; 42 import only names whose signatures did not change.

Reading: these are real users no notice could have reached. None has a verdict, so none can be called affected. No removed name was imported by an undeclared user. The claim is **not broken by a demonstrated effect and not proven**: 190 pairs at risk were never looked at, and a changed answer under an unchanged signature is invisible to this check.

**(2) Merges that changed an interface and raised no notice** (`no_notice.py`, `no_notice_summary.py`; measured)

Universe: every pull-request merge Process3 made, 941 merge commits (269 "Merge job PR", 239 "Merge layer PR", 433 non-job merges on the tranche's first-parent line since the set-up commit `8a80914dae`). 505 of the 508 job and layer merges change a module file; 504 change a file of the module named in the commit body (`job: <module>`); 177 of the 178 notices match one (`ai-catalogue:194` does not).

| Definition of "interface changed" | Job and layer merges, own module | With a notice | Without | Share without |
| --- | --- | --- | --- | --- |
| Any of the four parts | 360 of 504 | 166 | **194** | 54% |
| A name removed or re-signed, or a public id changed | 167 | 99 | **68** | 41% |
| Names or public ids (Process3's own vocabulary) | 191 | 120 | 71 | 37% |

Why the 194 (four parts) raised none:

| Reason | Count |
| --- | --- |
| Job merge with no source file changed, with declared users, after the route was live; Process3's rule from 4 Nov raised nothing (73 changed only tests bearing an id, 11 changed a public id) | 84 |
| Layer flow: users rescheduled, no notice | 53 |
| The module had no declared user | 34 |
| Layer flow: neither notice nor reschedule (12 where its own check said "unchanged", 3 where it said "breaking": `op-declarations` 1104, `screens-inquiry` 1019, `interface-assets` 1000) | 15 |
| Merged before the first notice was written (4 Nov 00:58Z) | 6 |
| Source changed, users declared, rule of that hour required a changed requirement id (`filings` 85, `affordances` 92, 4 Nov 03:20 to 04:28Z) | 2 |

Outside job merges, with no route at all: **45** (module, merge) cases where a non-job merge (`bob/…`, `pass/dist`) changed one of the four parts of a module, 32 of them a public id or a removed or re-signed name. Example: `bob/deploy-release-blocks` (PR 80) re-signed two exported names of `setup-words`, which had 183 declared users. And 12 cases where a job changed a part of a module other than its own. Counting those, 251 of 417 interface-changing (module, merge) cases raised no notice (60%).

Twelve job merges (eleven after the route went live) changed a public requirement id with no source change, had declared users, and raised nothing (for example `jurisdictions` 462, 61 users; `acquisition` 467, 33 users; `interface-shell` 551, 18 users). `calculations:70` is the same kind of change and drew an "affected" verdict.

A side finding on the trigger: under "any of the four parts", 360 of 504 job merges (71%) are interface changes, because nearly every job adds or edits a test whose title bears a requirement id. That includes the tests a user writes in answer to a notice. Process3 raised 178.

**(3) The trigger** (`j4c3.py`; measured)

The 14 changes with no file under the provider's source paths:

| Change | What changed | Affected verdicts | "Source file changed" | Four parts | Which part |
| --- | --- | --- | --- | --- | --- |
| `entities:63` | test, requirement file | 0 of 48 judged | no | yes | R68 newly met; test R68 |
| `local-facts:62` | test, requirement file | 0 of 20 | no | yes | R23, R25 newly met |
| `calculations:70` | requirement file only | **1** (`op-declarations`) of 15 | no | yes | R53 newly met |
| `membership:77` (withdrawn) | test, requirement file | 0 of 7 judged (108 told) | no | yes | R154 newly met |
| `credentials:74` (withdrawn) | test, requirement file | **1** (`ai-runs`) of 4 judged (39 told) | no | yes | R27, R63, R73 newly met |
| `bundler:82` | a script outside its paths, test, requirement file | 0 of 10 | no | yes | R45 reworded |
| `bundler:88` | a script outside its paths, test, requirement file | 0 of 10 | no | yes | R46 added |
| `case-import:635` (withdrawn) | test, requirement file | none judged (12 told) | no | yes, by a test id only | test R36; R36 is in the Private part |
| `public-read:642` | fixture, test, requirement file | none judged (9 told) | no | yes | R53 reworded |
| `case-authoring:681` (withdrawn) | requirement file only | none judged (11 told) | no | yes | R14 reworded |
| `filings:727` | one fixture under its tests | 0 of 1 judged (9 told) | no | **no** | nothing nameable |
| `monitoring:743` | test, requirement file | 0 of 1 judged (9 told) | no | yes | R81 newly met |
| `hypotheses:1050` | two tests, requirement file (found mark only) | 0 of 4 | no | yes, by a test id only | test R31, which is not a public id |
| `ai-runs:1073` | one test | 0 of 18 | no | yes, by a test id only | tests R91, R103 |

Each wording against all 178 changes and the 241 affected verdicts:

| Trigger wording | Fires on | Affected reached | Missed |
| --- | --- | --- | --- |
| A: a source file of the module changed (Process3 from 4 Nov) | 164 | 239 | `calculations:70`, `credentials:74` |
| B: one of the four parts changed (names with value hash, public ids, test ids, non-code files) | 167 | 236 | `agent-drafts:570`, `agent-steps:185`, `agent-steps:497`, `ai-accounts:316`, `member-roster:286` (one each) |
| C: the four parts without the value hash | 163 | 231 | B's five, plus `extraction:432`, `local-facts:429`, `mail-door:428`, `member-roster:446` (2) |
| D: names or public ids only | 121 | 175 | 66 verdicts in 38 changes |
| E: one of the four parts **or** any source file changed | 177 | **241** | none (does not fire on `filings:727`) |
| F: a public requirement id changed **or** any source file changed | 174 | **241** | none (does not fire on `case-import:635`, `filings:727`, `hypotheses:1050`, `ai-runs:1073`; 0 affected among their 23 judged, 20 never judged) |
| G: any file of the module changed: source, tests or requirement file | 178 | **241** | none |

**The wording that misses none of the 241 on this record,** narrowest first:

> F. "A merged job changed a file under its module's source paths, or changed a public requirement of its module (an id added, removed, reworded, or its mark struck or set)."

"Source" is as Process3 read it: under the module's `paths`, not under its `tests`, not Markdown. G ("any file of the module") is the only wording that fires on all 178. The definition's present wording (B) and Process3's (A) each miss recorded effects. The five that B misses are changes of behaviour with nothing nameable: a body-only change, or a value changed in a file no other module imports.

### J4 d. Order-breaking (`j4d.py`; measured)

- **Confirmed for declared uses:** exactly three declared uses of a later module at the tip: `hypotheses` (96) uses `steps` (97); `agent-runner` (115) uses `ai-gate` (118); `agent-drafts` (116) uses `agent-worker` (117). The last pair is also mutual (each declares the other). `origin/main` has 178 modules and none.
- **Corrected for real dependence:** 39 module pairs have tests importing a later module (3 declared, 36 undeclared; listed by `j4d.py`). By path reference 28 undeclared source pairs and 65 undeclared test pairs point later; by SQL, 5.

---

## J5. "Naming the changed parts lets a notified job read less without missing an effect"

### J5 a. Parts derived mechanically (`extract.py`, `parts_run.py`, `j5c.py`, `j5a_extra.py`; measured)

The extractor: (1) exported names of the provider's entry files (source files another module imports, else its index files), with function parameter lists, class public members, re-exports followed, and a hash of the initialiser text of exported data; (2) ids under `## Public` of `build/requirements/<module>.md`, added, removed, reworded, newly met, retired; (3) ids in the titles of tests added, removed or changed under the module's tests; (4) non-code, non-Markdown files under the module's source paths.

**Check of the extractor** (`validate_names.py`): against the 71 export records Process3 wrote into notices, 67 agree exactly on names added, removed and changed. The other 4 were looked at: in 3 the port reads a class member that Process3's reader of that date lost (one is a bug its own source comments record); in 1 names moved to a re-export from another module (handled since). The 107 notices without an export record have no such check.

| Changes of 178 with | Count | Affected verdicts in them |
| --- | --- | --- |
| at least one named part (all four, with value hash) | **167** | 236 |
| no named part | **11** | 5 |
| a name added, removed or re-signed | 76 (23 with a removal or new signature; 53 additions only) | 118 |
| a value hash changed | 67 | 130 |
| a public id changed | 93 (69 newly met, 20 reworded, 11 added, 6 retired, 2 removed) | 130 |
| an id whose tests changed | 151 | 205 |
| a published non-code file changed | 3 | 5 |

Unattributed changes under each reading of the part list:

| Part list | Name no part | Affected in them |
| --- | --- | --- |
| Process3's record as written (no ids, no export difference) | 65 | 63 |
| Names and public ids, re-derived | 57 | 66 |
| Names, public ids, ids whose tests changed (the definition's notice) | 17 | 15 |
| ... and non-code files (the four parts) | 15 | 10 |
| ... and the value hash | 11 | 5 |

The 11: `agent-drafts:570`, `agent-steps:185`, `agent-steps:497`, `ai-accounts:188`, `ai-accounts:316`, `ai-catalogue:204`, `ai-catalogue:336`, `filings:727`, `member-roster:157`, `member-roster:286`, `run-rules:330`.

How narrow the named parts are (the only measure of "read less" this replay gives): in the 151 changes that name a public id, the median is 4 ids, 9.6% of the module's live public ids; 12 changes name more than half of them; the largest names 71.

### J5 b. Do the named parts lead to each of the 241? (`j5b.py`, `j5b_support.py`, `j5b_judged.py`)

Mechanical form (measured): the verdict's evidence sentence contains a name or id that the extraction also names.

| Class | Verdicts |
| --- | --- |
| Evidence names a changed exported name | 79 |
| Evidence names exported data whose value hash changed | 36 |
| Evidence cites a changed public id | 50 |
| Evidence cites an id whose tests changed | 3 |
| Evidence names a changed non-code file | 1 |
| **Evidence names a part: total** | **169** |
| **The change is one where nothing could be named** | **5** |
| **Cannot be decided mechanically** | **67** |

The 53 id matches were read one by one; each attributes the id to the provider. The same split under other part lists: without the value hash 139 / 10 / 92; without test ids 166 / 34 / 41; names and public ids only 135 / 66 / 40.

Judged form (my judgment, all 67 read, no sampling). For each I read the evidence sentence and searched the text a job would read if it read only the named parts (the named signatures, the requirement lines of the named ids, the changed tests bearing those ids, the diff of a named non-code file; saved as `scratch/parttext_<change>.txt`) for the thing the evidence says changed.

| Judgment | Verdicts |
| --- | --- |
| Led: the named parts' own text states the changed thing | 53 |
| Led, but only through the diff of a named non-code file (`agent-worker:364` three users, `agent-worker:569` one) | 4 |
| Led, but the named parts are most of the module (`ai-runs:96`, 62 ids, four users; `op-declarations:95`, 45 or more ids, three users) | 7 |
| Weak: a named part points at the area, its text does not state it (`signin-door:153` to `store-request`) | 1 |
| **Not led** | **2** |

The two not led:

- `ai-runs:323` to `queue-producers`: the effect is a changed test fixture (`world.mjs`) that the user's test imports. A fixture bears no requirement id, so no part names it.
- `registers:426` to `corpus-export`: the effect is a new declared table in `schema.mjs`. The parts name `DECLARED_OPS` and four test ids; none mentions the table.

**The result as separate numbers:** of 241, 169 are led to by the mechanical test, 64 more by my judgment (11 of them with the reservations above), 1 is weak, **2 are not led to**, and 5 sit in unattributed changes where naming saves nothing. The claim "without missing an effect" is broken for 2 of 241 if a notified job reads only the named parts, and holds for the 5 only because the notice says "nothing could be named".

Limits. My judged form is weaker than the plan's: I knew the effect and looked for it in the parts; a blind reader given only the parts and the user module might not find it. The mechanical form shows the part is *named in the evidence*, which is strong for names and weaker for a test id. The verdicts are AI judgments.

### J5 c. What the four parts do not see (`j5c.py`; measured, counts across all 178)

| Kind | Changes | Affected verdicts in them |
| --- | --- | --- |
| A changed value under an unchanged name, seen only if the notice carries a value hash (value changed, no name added, removed or re-signed) | 30 | 57 |
| ... of which nothing else is nameable either (unattributed without the hash) | 4 | 5 |
| An export of a file no other module imports changed, nothing at the entry files (an indirect value, as `MODULE_IDS` behind `MODULE_ORDER`, or an inner file) | 15 | 24 |
| Source code changed with no exported name, signature or value hash changed (a changed answer under an unchanged signature, if anything changed for users) | 58 | 64 |
| ... and no public id changed either | 37 | 39 |
| ... and no test id either | 12 | 10 |
| Requirement file changed with no public R id changed | 54 | 78 |
| ... changed **only** in found marks (F ids) | **39** | 61 |
| ... found marks plus other non-public text | 10 | 11 |
| ... private ids or other text only | 5 | 6 |
| Requirement file changed a found mark at all | 62 | 84 |
| Public text outside any id line changed (Purpose, Terms) | 19 | 28 |
| Test files changed, none bearing a requirement id | 23 | 33 |
| A non-test file under the module's tests changed (a fixture or helper other modules may import) | 53 | 104 |
| No source file changed | 14 | 2 |

The earlier sample's two kinds are confirmed and counted: a changed value under an unchanged name (30 changes; 4 with nothing else nameable; 15 more where the value changed in a file the hash does not reach), and requirement files changed only in found marks (39). A third kind did the damage in J5 b: a changed fixture under the provider's tests (53 changes), which no part names. Not countable from the repository: a served page, a committed bundle, a wire shape.

### J5 d. "Test less"

**This replay cannot measure it.** It reads text. Whether a notified job could run fewer tests without missing a failure needs the users' tests run at 178 commits, with and without a selection rule, and there is no mechanical rule today that selects a user's tests from a named part. The replay measures only "read less", and only as how few ids a notice names (median 4, 9.6% of the module's public ids).

---

## Scripts and data

| Script | Does | Output |
| --- | --- | --- |
| `lib.py` | git helpers, notice loading, merge resolution, module map | |
| `extract.py` | the four-part extractor | |
| `validate_names.py` | extractor against Process3's 71 export records | printed |
| `j4a.py`, `j4a_untold_names.py` | J4 a | `data/j4a_*.json` |
| `undeclared.py`, `undeclared_names.py`, `bindings.py` | J4 c(1) | `data/undeclared_*.json`, `data/bindings_tip.json` |
| `no_notice.py`, `no_notice_summary.py` | J4 c(2) | `data/no_notice_rows.json` |
| `j4c3.py` | J4 c(3) | printed |
| `j4d.py` | J4 d | printed |
| `parts_run.py`, `j5a_extra.py`, `j5c.py` | J5 a, c | `data/parts.json`, `data/j5c_counts.json`, `data/j5a_extra.json` |
| `j5b.py`, `j5b_support.py`, `j5b_judged.py` | J5 b | `data/j5b_rows.json`, `data/j5b_judged.json`, `scratch/parttext_*.txt` |

Order: `j4a.py`, `parts_run.py` (about 100 s), `validate_names.py`, `undeclared.py` (about 75 s), `undeclared_names.py`, `bindings.py`, `no_notice.py` (about 100 s), `no_notice_summary.py`, `j4c3.py`, `j4d.py`, `j4a_untold_names.py`, `j5b.py`, `j5b_support.py`, `j5b_judged.py`, `j5c.py`, `j5a_extra.py`. `scratch/` holds exports of `notices/` and `layerflow/` from the state branch and can be deleted; the scripts recreate the first two.

## Known weaknesses of the measurement

- The code reader is a scanner with regular expressions, a port of Process3's, not a JavaScript parser. Code built inside template strings is not seen.
- The value hash is of the initialiser's text. A value computed from another file's data does not change its hash (`member-roster:286`).
- Only the provider's own requirement file is read. Requirement files split off for size (18 modules) are treated as their own modules, as the module map does.
- "Requirements whose tests changed" takes every `R<n>` in a changed test's title. 151 of 178 changes name one, so this part attributes almost everything and narrows least.
- If "requirements whose tests changed" is restricted to the module's *public* ids, 146 changes name one (not 151), and 13 changes name no part (not 11; `case-import:635` and `hypotheses:1050` join them); the affected verdicts in unattributed changes stay at 5.
- The path and SQL routes of undeclared dependence are pattern matches and hold some noise.
- One notice (`ai-catalogue:194`) does not match the module named in its merge commit and is absent from the J4 c(2) table's "with a notice" column.
