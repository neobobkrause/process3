# What a module's interface is, and the order-breaking uses among four modules

Written 13 Nov 2026. Read-only analysis of `origin/tranche` in `/home/user/neobobkrause/civicsmith-copy`, with the notice records at the tip of `origin/process-state`. Nothing was changed, fetched or checked out: every blob read was already in the local object store.

## Summary

**Part 1. The interface.**

- **A module exposes its services through named exports of `.mjs` files, usually one `index.mjs`.** 152 of the 220 modules have one. Users do not keep to it: 388 of 3,088 source imports between modules (13%) reach into an internal file, and 110 modules are reached that way.
- **Imports are not the only way one module depends on another.** 181 declared uses by modules that own code have no import behind them. The other routes are instances handed in at run time, service bindings, SQL on another module's tables, word keys, declared-op tables, generated files and served pages.
- **No rule that names exported names alone can be sound here.** Replayed on the old process's own records, a rule that notifies only the users importing a changed or removed name would have caught 13 of 104 users judged affected.
- **The only recognition with no false negatives on that record is the coarse one: any change to a module's source notifies every declared user.** The old process did this, and 90% of the notifications were needless.
- **"Which parts changed" can be stated mechanically and precisely in three vocabularies:** exported names with their before and after signatures, public requirement ids, and the provider's own tests keyed by the id in their titles. It cannot yet be used to excuse a user mechanically.
- **The old process left a replay set:** 178 notices, 2,707 notifications and 2,342 written verdicts with evidence. It can score any new rule, once each notice's change is re-read at its own commit.

**Part 2. The four modules.**

- **The loop is in the module map, not in the code.** File by file, the imports already run one way: `untested.mjs` → `ask.mjs` → `draft.mjs` → `index.mjs`. The size split of 4 Nov put the bottom and middle files in one module and the files between and above them in another.
- **agent-runner is in the wrong place by a decision already taken.** The planning fold of 27 Oct placed it after ai-gate ("it is ai-gate's container") and took off agent-worker's use of it. The map was never brought into line.
- **Recommended: put the map right.** Move agent-runner after ai-gate, drop agent-worker's use of it, and give agent-drafts' three files back to agent-worker. No source file, import or test changes.
- **Three things need the owner.** The requirement size cap that caused the split; whether a member's own Claude sign-in through the runner still exists; and, for hypotheses and steps, whether one refusal may change places with another.

## Method and limits

- The module map is `build/modules.json`: 220 modules in one list, each with `paths`, `tests`, `uses` and a layer. A file belongs to the module with the longest matching path.
- Every `.mjs` and `.js` file under a module's paths or tests was parsed for `import`, `export … from` and `import()` statements: 5,385 files, 10,771 import statements that cross a module boundary. The parser is a comment-aware scanner with regular expressions, not a JavaScript parser. Code built inside template strings (child-process scripts in tests) is not seen.
- "Entry file" means `index.mjs` at the root of a module's directory, or each listed file where a module is a list of loose files.
- The sample is 36 modules across the order. Most figures are also given for all 220, because the whole tree could be measured.
- The replay uses the code as it stands at the tip, not as it stood when each notice was raised. The verdicts are the judgments of the old process's triage workers, not ground truth.
- Scripts are in `/tmp/claude-0/-home-user/5fb00928-6c32-53d3-a000-4e1f643cb17f/scratchpad/ic/` (`graph.py`, `analyse.py`, `stats.py`, `reqmap.py`, `cites.py`, `nonimport.py`).

---

# Part 1. What exactly is a module's interface?

## 1a. How a module exposes its services

### Entry files

| Shape | Modules |
| --- | --- |
| One `index.mjs` | 152 |
| One loose file (for example `idspaces.mjs`) | 10 |
| Several loose files, each its own entry (test-support has 14, bundler 11, runtime-limits 5) | 21 |
| No entry file | 37 |

Of the 37 with no entry file, 29 own no code at all: 18 own only a requirement file (the size-cap splits such as `jurisdictions-b`), and 11 have empty `paths`. The other 8 have code but no `index.mjs` at the root, for example agent-harness (`harness.mjs`, `subsession.mjs`), agent-model, agent-runner and docprofile.

`ai-issuer` has empty `paths` in the map but 11 code files in `ai-issuer/`. In all, 52 code files belong to no module, and they hold 75 imports of modules.

### Imports through the entry, and deep imports

| Importing file | To the provider's entry | To another file of the provider (deep) | To the provider's test files |
| --- | --- | --- | --- |
| Source, all 220 modules | 2,700 | 388 (13%) | 0 |
| Tests, all 220 modules | 5,794 | 635 (10%) | 1,254 |
| Source, the 36 sampled providers | 1,494 | 247 (14%) | 0 |
| Tests, the 36 sampled providers | 3,438 | 386 (10%) | 491 |

- The 388 deep source imports reach 173 files of 110 provider modules, from 84 user modules.
- The largest group is record-grammar: 139 deep source imports of its inner files (`actors.mjs` 31, `sha256.mjs` 20, `frontmatter.mjs` 18, `types.mjs` 18).
- A second group is each module's `checks.mjs`, imported whole as a namespace by `answer-envelope/families.mjs`.
- Among the four modules: ai-gate imports `agent-worker/src/ops.mjs` and `agent-worker/src/ask.mjs`; control-plane's, plane's and store-assembly's tests import `agent-worker/src/ops.mjs`.
- The 1,254 imports of another module's test files are the "published fixtures" and helpers the job rules require (`build/situations/job.md`: "it uses the provider's published fixture"). They are part of the provider's interface in practice, and they live under its tests, not its source.

### Declared uses against imports

- **Every source import is declared.** None of the 3,088 source imports points to a module missing from the importer's `uses`.
- **Tests are not held to the map.** 202 test imports go to a module the importer does not declare.
- **81 test imports point to a later module.** Six belong to the three known pairs. The other 75 are spread over 38 further pairs, none declared. Examples: membership's tests import credentials, ai-accounts, instance-setup and admission; ai-use's tests import store-request, store-assembly and admission; op-grades-folds' tests import op-grades (30 statements).
- **Of 3,120 declared uses, 1,936 have a source import, 792 have only a test import, and 392 have no import at all.** 211 of the 392 belong to the 29 modules without code. The other 181 are couplings that do not pass through an import, or stale declarations.

### Couplings without an import

| Route | Example | Extent |
| --- | --- | --- |
| An instance handed in at run time | `hypotheses` takes a steps instance (`deps.steps` or `bindSteps`) and calls its `registerRivalSource` and `stepsOfRival`; the comment reads "`steps` handed in, never imported" | 158 distinct `register…`/`on…` methods on module classes; 313 call sites |
| A service binding between deployed Workers | `agent-worker/wrangler.jsonc` line 97 binds `RUNNER` to agent-runner's class `AgentRunner`; the plane binds `AGENT_WORKER`, and agent-worker binds `PLANE` back | 5 fleet bindings on the plane; agent-worker calls the plane (module 209) over the wire with no declared use |
| SQL on another module's tables | inquiry, actions, reevaluation, queue and retrieval query record-core's `bundles`; public-read queries publication's `published_cases` | about 226 module pairs (pattern match, some noise); 24 not declared |
| Constants copied and held equal by tests | `TRACE_HEADER = "x-civicsmith-trace"` is defined in 7 files of 7 modules; agent-worker's `NAMESPACES` is "a COPY, because a fleet member cannot import the plane" | not counted |
| Word keys and a generated table | every sentence is `localize(id, en, vars)`; a build step extracts the table `setup-words/rows.mjs` | 8,250 call sites |
| Declared-op tables read as data | store-assembly imports each module's `DECLARED_OPS` and registers it with op-grades; a changed weight changes the assembly | op-declarations declares 83 uses |
| The module order compiled into the product | `member-roster/order.mjs` is generated from `build/modules.json`; `MODULE_ORDER` fixes the order in which registered checks and listeners run in promotion, extraction, reading-pipeline, money, duties, capture-requests and membership | 7 consumers |
| A served page or route | journey-check tests the page interface-shell serves: "no import, it tests the served page" | not counted |
| A committed bundle | the installer's committed `newgroup.bundled.mjs` holds a copy of interface-assets | not counted |
| File paths read as text | tests that read another module's source, `wrangler.jsonc` or requirement file | 930 path references outside import statements; 349 module pairs, 158 not declared, 140 to a later module |

## 1b. The Public part, exported names and tests

**The requirement file.** All 220 modules have one, each with `## Public` (Purpose and Provides). Ids are written `**R<n>**` first on the line and are permanent. A requirement not yet met carries `*(not yet met: …)*` on its line. There are 7,077 live public ids.

**Public ids to exported names: no explicit mapping.**

- 28% of entry-file exports (1,742 of 6,245) are named in backticks anywhere in the module's Public part.
- 12 of 183 modules have every export named there.
- 18% of live public ids (1,248) name an exported name.
- The reason is the shape of the code. 104 modules export a class and a factory (`stepsOf(host)`), and the services are the class's methods: 2,896 public methods against 6,245 exported names. The requirement lines name methods and wire routes, not exports.

**Public ids to tests: a convention that mostly holds.**

- The job rules say "A test names a requirement id at the module's interface". 94% of test titles (23,025 of 24,433) name an id of their own module.
- 92% of live public ids (6,517) are named in at least one of the module's own test titles. 170 of 219 modules have every one named.
- Tests sit in one directory per module (`bio-plane/test/m/<module>/`, or `<worker>/test/`).
- File names are not the key. Of 3,639 test files, 2,420 are named by topic, 563 by tranche (`t45.test.mjs`), 391 by requirement id, 195 are `notice-<provider>-<pr>.test.mjs`, 29 by a ruling id, and 41 have no owner.
- Three modules (agent-steps, pdf-worker, pdf-pixels) and most of agent-worker do not use `test("R…")` titles. They run a check function inside one long file. agent-worker has 13 of its 52 live public ids in a test title.
- Job receipts in `process/metrics/*.jsonl` carry a second record: 1,220 rows `{req, file, name}` and 231 rows `{notice, file, name}`, in 274 receipts of 121 modules.

**Can "only the tests that relate to the changed parts" be selected mechanically?**

| Whose tests | Key | Works for | Limit |
| --- | --- | --- | --- |
| The provider's own | The public id in the test title (`node --test --test-name-pattern`) | 92% of public ids | Not agent-worker, agent-steps, pdf-worker; ids must be matched as whole words (R3 against R31) |
| A user's | The user test file imports the changed name | Named imports | Under-selects: a typical user test file reaches a provider through the user's own code. The median user test suite has 4.5% of its files importing any one provider name directly |
| A user's | The user test file is reachable from the provider | Everything | Selects nearly all tests: every test imports its module's `index.mjs`, which imports every provider |
| A user's | The user's test title or comment cites the provider's id (`` `run-rules` R29 ``) | 2,857 cited (provider, id) pairs in tests | A convention, not complete |

## 1c. Candidate definitions of "the interface changed"

Each is judged against the old process's record (section 1e). That record holds 2,342 verdicts on a (change, user) pair: 241 "affected", 2,101 "not affected".

### (i) The set and shape of the entry file's exported names changed

- **Catches** added and removed names and changed parameter lists. Example: `actions:715` recorded `actionOverdue(fm, nowMs, place = null)` becoming `actionOverdue(fm, nowMs, place = null, layers = null)`. The old tool also descended into classes (`Actions.zoneRead`, `Membership.isAdministrator`).
- **Misses a changed value under an unchanged name.** `op-declarations:289` extended `REAUTH_ACTS`, and admission's default changed. `ai-accounts:483`, `local-facts:429` and `mail-door:428` changed weights inside `DECLARED_OPS`. `member-roster:286` and `:446` grew `MODULE_IDS`, which changed the order membership runs listeners in.
- **Misses a changed answer under an unchanged signature.** `action-grammar:396`: `governingLawsOf(fm)` entries "now carry layer". `content:440`: `cellsAt` "now answers cells:null reason removed". `basis-versions:177`: grades "now capped".
- **Misses the 13% of imports that go to inner files,** unless every imported file is treated as an entry.
- **Misses every coupling of section 1a that has no import.** `interface-shell:310` affected journey-check through the served page. `interface-assets:443` affected the installer through a committed bundle. `agent-worker:569` affected signin-door through a binding in `wrangler.jsonc`.
- **False positives:** names only added. 50 of the 71 notices with an export record were additions only. An added name cannot break an importer, with one exception found in the record: agent-worker's test "calls every function agent-harness exports and fails on any uncalled one".
- **Replay.** On the 71 notices with an export record, the rule "notify the users that import a changed or removed name" notifies 55 pairs, catches 13 of 104 affected and misses 91. Most misses are a method called on a handed-in instance, which no import analysis can attribute.

### (ii) Any file reachable from the entry file's exports changed

- In the sample, 98% of source lines are reachable from an entry or an imported file (112,794 of 114,598). Modules are a few large files: `ai-runs/index.mjs` has 4,841 lines.
- So this is "any source file of the module changed". It is what the old process did: a notice was raised when a merged pull request "changed a file of the module's source".
- **Catches** every change that travels by import, including behaviour with no signature change.
- **Misses** changes outside source: a provider's fixtures under its tests (1,254 imports), and couplings with no import where the user is not a declared user.
- **False positives: about 90%.** 2,101 of 2,342 verdicts were "not affected". 67 of the 167 notices that were triaged had no affected user at all.

### (iii) The Public part of the requirement file changed, by id

- **Catches** a stated change of service: an amended line, a new id, a retired id. It also catches a requirement becoming met, because the `*(not yet met: …)*` mark is struck from the id's own line. 392 unmet marks stand in Public parts today, each a future change of this kind.
- **Misses** a change of behaviour that leaves the text alone: a bug fix, or a change in the Private part with an outward effect. 73 of the 178 notices carried ids. The 105 without ids still drew 117 "affected" verdicts out of 1,338 (8.7%), against 124 of 1,004 (12.4%) for those with ids.
- **False positives:** wording edits and moves. `agent-worker:97` lists seven ids, all of them lines moved to agent-drafts with no change of behaviour.
- **One complication.** 18 modules hold requirements split off another module's file for size. The Public part that governs `jurisdictions`' code is in three files.

### (iv) The provider's interface-level tests changed

- By the job rules every module test is at the module's interface and names an id, and a code change needs "a test of your own for the change, failing with it reverted". Where that rule is enforced, every behaviour change comes with a changed or added test.
- **Catches** bug fixes and behaviour changes that (i) and (iii) miss, and names the public id through the test title.
- **Misses** a behaviour change made with no test change, which the revert check exists to refuse.
- **False positives:** coverage added with no change of behaviour; the 195 `notice-*` tests, which record a user's answer to someone else's change; tests that pin requirement ids.
- **Not measured.** The old notices did not record test changes. Measuring this needs each pull request's diff.

### (v) The job declares it

- **Catches** what the job knows it changed, including couplings no tool sees (a wire shape, a table column).
- **Misses** what the job does not notice. It cannot be verified.
- It is safe only as an addition: a declaration may add a part, never remove one.

### Which combination gives no false negatives

**The union of all five, with (ii) as the floor.**

1. Raise a change whenever any of these differs between the job's base and its merge: a source file of the module, a file under its tests that another module imports, a Public line of any requirement file that governs its code, or a non-source file in its paths that another module reads (`wrangler.jsonc`, `fleet-member.json`).
2. Name the parts from (i), (iii), (iv) and (v): names with before and after signatures, class members, a value hash for exported data; public ids edited, added, retired or newly met; public ids whose tests changed; anything the job adds.
3. When step 1 fires and step 2 names nothing, send the change as "unattributed". On the record, 65 of 178 notices had neither ids nor an export difference, and they carried 63 of the 241 affected verdicts (26%). Test changes were not recorded then, so the true unattributed share under this rule would be lower.
4. Notify every declared user, and every module whose tests import the provider.

**How many false positives.** As many as the old process: about nine notifications in ten reach a user that is not affected. Naming the parts does not reduce the number of notifications. It reduces what each notified job must read.

**Could the parts excuse a user mechanically?** Not soundly today.

| Rule, replayed on all 2,342 verdicts | Notified | Affected caught | Affected missed | Needless |
| --- | --- | --- | --- | --- |
| Notify all (the old process) | 2,342 | 241 | 0 | 2,101 |
| Users importing a changed or removed name | 55 | 13 | 228 | 42 |
| Users citing a changed public id in their requirement file, source or tests | 195 | 104 | 137 | 91 |
| Either of the two | 237 | 112 | 129 | 125 |
| Citing users when the notice has ids, all users when it has none | 1,533 | 221 | 20 | 1,312 |

- The citation figures are an upper bound. They read the tip of the tree, where many citations were written in answer to the notice itself. Counting only citations in requirement files, the rule catches 44 of the 124 affected in notices that have ids.
- So a notified job still has to judge. The parts tell it where to look.

**Where behaviour change is invisible, and what could show it.**

| Invisible to a signature check | What in the repository shows it |
| --- | --- |
| A changed answer or refusal under the same signature | The public id's line or its mark (iii); the provider's test for that id (iv) |
| A changed value of an exported table | A hash of the evaluated export, taken by importing the module in Node |
| A changed method of a class | The class-member comparison the old tool already made |
| A changed wire route or page | `fleet-member.json` `surface`, which lists each route against its ids; the public id |
| A changed table or column | `schema.mjs` and `declaredTables`, as data |
| A fix with no requirement change | Only the provider's test (iv) or the job's declaration (v) |

## 1d. Precision available per user

**For a changed exported name, the importing users can be listed mechanically.** The imports are static and named. Three exceptions must be treated as "imports everything": 163 namespace imports whose members cannot be traced, 76 dynamic imports in tests with no destructuring, and any instance passed on to other code.

**How much it narrows.**

- For the sampled providers, the median imported name is imported by **14%** of the provider's declared users. That is the median over providers of each provider's median.
- For the most used providers it is far lower: setup-words 2%, record-grammar 4%, record-core 4%, ai-runs 3%, membership 7%. The exception is test-support at 25%.
- Over all 144 providers with five or more declared users, the median is 18%. A quarter of names are imported by a tenth of users or fewer.
- 51% of exported names (3,855 of 7,539) have no importer outside their own module. A change to one of them concerns no user.

**Where the narrowing fails.** The names with the most importers are factories: `membershipOf` is imported by 100 of membership's 116 users, `recordOf` by 110 of record-core's 116. A change to a method of the `Membership` class maps to everyone who holds the instance. The replay in 1c shows the result: name-level listing misses most affected users.

## 1e. Evidence from the old process's records

### What exists

| Where | What | Count |
| --- | --- | --- |
| `origin/process-state`, `notices/<provider>-<pr>.json` | One notice per recognised change | 178 |
| `origin/process-state`, `notices/triage/<user>-<provider>-<pr>.json` | A verdict, or a row saying a verdict is owed | 3,125 (2,342 verdicts, 783 owed) |
| `origin/process-state`, `notices/answered/…` | How each notification was closed | 2,542 (2,101 by triage, 209 by "layer land", 232 by a pull request) |
| `origin/process-state`, `notices/withdrawn/…` | Notices taken back | 6 |
| `origin/tranche`, `process/metrics/<module>.jsonl` | Job starts, receipts, merges | 1,885 rows: 688 starts (287 list the notices handed to the job), 688 receipts, 279 merges |
| `origin/tranche`, test trees | `notice-*.test.mjs` | 195 files |
| `origin/tranche`, `process/ledger/<module>.json` | One job record per module | 220 |

The notices are not in the tranche tree. They are 5,851 small files (2.06 MB) at the tip of the state branch.

### How a change was recognised

- **When:** at the merge of a pull request, if it changed a file of the provider's source. Two notices were withdrawn because the pull request "changed no file of membership's source".
- **Who was told:** every module whose source imports the provider. An owed row gives the reason as "`bio-plane/src/money/index.mjs` imports local-facts". All 2,707 notified modules are declared users at the tip.
- **What a notice held:** `provider`, `pr`, `users`, `source` (the number of source files changed, median 1), and `ids` (requirement ids, present on 73).
- **From 4 Nov 05:21Z a notice could also hold `exports`:** `removed`, `added`, and `changed` with each name's `before` and `after` signature, including class members. 71 notices have it: 21 with a changed or removed name, 50 with additions only.
- **What a verdict held:** `verdict`, `evidence` (a file and line in the user and one sentence, median 188 characters), `worker`, `cost`.

### What the records show

| | Count |
| --- | --- |
| Notices | 178, from 95 provider modules |
| Notifications | 2,707 (median 11 per notice; largest 108, `membership:77`) |
| Verdicts | 2,342: 2,101 "not affected" (89.7%), 241 "affected" |
| Triaged notices with no affected user | 67 of 167 |
| Triage cost recorded | $565 over 1,914 verdicts, median $0.20 |

| Kind of notice | Notices | Verdicts | Affected | Rate |
| --- | --- | --- | --- | --- |
| Signature changed or name removed, with ids | 9 | 139 | 26 | 18.7% |
| Signature changed or name removed, no ids | 12 | 196 | 28 | 14.3% |
| Names added only, with ids | 22 | 230 | 24 | 10.4% |
| Names added only, no ids | 28 | 423 | 26 | 6.1% |
| No export record, with ids | 42 | 635 | 74 | 11.7% |
| No export record, no ids | 65 | 719 | 63 | 8.8% |

No signal the old tool recorded separates affected from not affected. The rate runs from 6% to 19% in every class.

### Can the records serve as a replay set?

**Yes, with one piece of work.**

- Each notice names the provider and the pull request. Each verdict names the user and gives evidence a person can check.
- To score a new rule properly, each of the 178 changes must be re-read at its own commit: the provider's source, requirement file and tests before and after. That is a bounded fetch of the changed files of 178 pull requests, not a walk of history. Receipts give the base commit of each job attempt.
- The replays above used the tip of the tree instead. They are indicative.
- Two cautions. "Affected" was an LLM worker's judgment, and 134 notifications have neither a triage row nor an answer. A rule's false-negative rate measured this way is a rate against the old triage, not against truth.

## 1f. The minimal precise definition this codebase can support today

**Interface of module M.** Four surfaces, each read mechanically from the repository:

1. **Names.** For every file of M that another module's source or tests import: the exported names; for a function its parameter list; for a class its public methods and their parameter lists; for exported data a hash of its value.
2. **Public requirements.** Every line under `## Public`, by id, with its met or unmet mark, in every requirement file that governs M's code.
3. **Interface tests.** M's own tests, by the public id in their titles.
4. **Published files that are not code.** The files in M's paths that other modules read: `wrangler.jsonc`, `fleet-member.json`, schemas.

**Interface change.** Any difference in the four surfaces between a job's base and its merge, or any other change to M's source, which is reported as "unattributed". The notice lists the changed names with before and after, the changed ids with the kind of change, and the ids whose tests changed.

**What must be true of every module for this to be sound, and how many are there already.**

| Condition | Sample (36) | All (220) |
| --- | --- | --- |
| It has one entry file | 24 | 152 |
| Other modules' source imports only its entry file | 12 | 74 |
| Other modules' source and tests import only its entry file | 4 | 38 |
| Every exported name is named in its Public part | 2 | 12 |
| Every live public id is named in one of its own test titles | 25 | 170 |
| As a user, every import it makes, tests included, is a declared use | 23 | 157 |
| As a user, it imports no later module, tests included | 27 | 194 |
| Every module that imports it declares the use | 20 | 166 |
| All of the above | 0 | 3 |

Three further conditions cannot be counted module by module, and none holds across the tree:

- **No dependency without an import or a declaration.** 181 declared uses have no import; SQL, bindings, word keys and handed-in instances are in section 1a.
- **Every code file has an owner.** 52 do not.
- **Every module with requirements owns the code that meets them.** 29 do not.

**The conditions that matter most are the ones about undeclared dependence.** Notification goes to declared users. A module that depends on a provider without declaring it is never told. The 38 undeclared test dependencies on later modules, and the couplings with no import, are where a false negative would come from.

### The sample

| Module | Pos | Entry | Declared users | Source imports: entry / deep | Test imports: entry / deep / test files | Exported names (named in Public) | Live public ids (in a test title) | Median share of users per imported name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| setup-words | 1 | 2 files | 213 | 578 / 2 | 992 / 11 / 0 | 6 (5) | 18 (16) | 2% |
| record-grammar | 2 | index | 132 | 178 / 139 | 293 / 72 / 1 | 60 (60) | 60 (60) | 4% |
| jurisdictions | 3 | index | 61 | 47 / 0 | 124 / 0 / 9 | 72 (7) | 34 (34) | 7% |
| test-support | 7 | 14 files | 153 | 0 / 0 | 522 / 0 / 0 | 60 (15) | 28 (28) | 25% |
| runtime-limits | 8 | 5 files | 58 | 88 / 0 | 108 / 0 / 0 | 34 (27) | 41 (41) | 7% |
| signatures | 9 | 3 files | 29 | 28 / 0 | 78 / 0 / 0 | 50 (43) | 47 (47) | 7% |
| docprofile | 24 | none | 14 | 0 / 32 | 0 / 69 / 0 | 0 (0) | 22 (22) | 14% |
| pdf-worker | 35 | index | 4 | 0 / 0 | 3 / 0 / 3 | 2 (1) | 15 (0) | 25% |
| record-core | 43 | index | 116 | 114 / 1 | 217 / 2 / 20 | 19 (15) | 86 (86) | 4% |
| membership | 44 | index | 116 | 121 / 1 | 272 / 5 / 4 | 26 (16) | 49 (48) | 7% |
| ai-catalogue | 46 | index | 12 | 6 / 2 | 8 / 3 / 16 | 46 (13) | 47 (47) | 25% |
| promotion | 49 | 2 files | 63 | 54 / 4 | 102 / 1 / 24 | 29 (10) | 55 (55) | 6% |
| provenance | 52 | index | 73 | 44 / 4 | 79 / 24 / 46 | 42 (10) | 58 (58) | 7% |
| capture | 57 | index | 44 | 24 / 8 | 66 / 13 / 25 | 44 (4) | 33 (33) | 11% |
| extraction | 69 | 2 files | 39 | 30 / 4 | 70 / 15 / 28 | 67 (14) | 88 (87) | 13% |
| observation-log | 76 | index | 26 | 15 / 9 | 27 / 7 / 1 | 75 (5) | 31 (31) | 12% |
| inquiry | 95 | index | 38 | 33 / 0 | 43 / 3 / 26 | 71 (22) | 54 (54) | 11% |
| hypotheses | 96 | index | 9 | 3 / 1 | 18 / 1 / 7 | 40 (2) | 16 (16) | 22% |
| steps | 97 | index | 14 | 9 / 1 | 12 / 0 / 15 | 26 (2) | 24 (24) | 14% |
| run-rules | 103 | index | 20 | 24 / 2 | 71 / 3 / 0 | 124 (46) | 34 (34) | 15% |
| agent-harness | 104 | none | 8 | 0 / 12 | 0 / 36 / 0 | 0 (0) | 16 (16) | 25% |
| agent-model | 105 | none | 7 | 0 / 9 | 0 / 22 / 3 | 0 (0) | 48 (48) | 14% |
| ai-runs | 107 | index | 30 | 18 / 0 | 43 / 0 / 25 | 10 (5) | 68 (67) | 3% |
| answers | 113 | index | 19 | 7 / 8 | 25 / 12 / 7 | 49 (5) | 31 (31) | 11% |
| agent-steps | 114 | index | 3 | 4 / 1 | 5 / 0 / 15 | 26 (12) | 53 (0) | 33% |
| agent-runner | 115 | none | 1 | 0 / 0 | 0 / 0 / 0 | 0 (0) | 32 (32) | |
| agent-drafts | 116 | 3 files | 1 | 2 / 0 | 5 / 0 / 0 | 22 (0) | 7 (5) | 100% |
| agent-worker | 117 | index | 7 | 0 / 4 | 5 / 8 / 2 | 4 (1) | 52 (13) | 43% |
| ai-gate | 118 | index | 5 | 1 / 0 | 2 / 0 / 0 | 130 (49) | 67 (67) | 20% |
| publication | 126 | 2 files | 27 | 20 / 2 | 33 / 8 / 14 | 72 (4) | 41 (41) | 15% |
| actions | 146 | index | 19 | 14 / 0 | 31 / 0 / 11 | 36 (7) | 78 (77) | 11% |
| monitoring | 155 | index | 12 | 8 / 1 | 12 / 2 / 9 | 64 (2) | 58 (57) | 25% |
| op-declarations | 176 | index | 21 | 14 / 0 | 117 / 6 / 1 | 111 (15) | 47 (47) | 14% |
| store-assembly | 183 | index | 3 | 3 / 0 | 3 / 59 / 10 | 11 (11) | 66 (66) | 100% |
| interface-shell | 186 | index | 18 | 4 / 0 | 50 / 0 / 152 | 46 (7) | 75 (75) | 17% |
| control-plane | 205 | index | 4 | 3 / 0 | 2 / 4 / 17 | 18 (3) | 95 (93) | 50% |

Notes on the table. "Test files" counts imports of the provider's own test helpers and fixtures. Zero ids in a test title for pdf-worker and agent-steps reflects their test style, not missing tests. ai-gate's count omits ai-issuer, whose files have no owner in the map and which imports three of ai-gate's inner files.

---

# Part 2. agent-runner (115), agent-drafts (116), agent-worker (117), ai-gate (118)

## 2a. What each module is for, and what it takes from the others

**agent-runner** is the container in which a gate run happens, and the small Worker that hosts it.

- Someone gives it a declared AI provider, model and plan, a key, the tiers and parts to run, and a spending ceiling.
- It asks the issuer for a challenge, runs ai-gate's public test items against the provider through one outbound door, keeps within the ceiling, scrubs and scans for secrets, seals and signs the results, shows a manifest for approval and hands over the bundle.
- Its routes are `GET /version`, `POST /run`, `GET /run/status`, `GET /run/manifest`, `POST /run/approve`, `GET /run/bundle` and `POST /run/discard`.
- Until T53 it was something else: the container that ran Claude Code on a member's own Claude sign-in. Those requirements (R1 to R4, R17 to R24) are retired in its file.

**agent-drafts** is the handler of one route of the agent Worker, `POST /draft`.

- It makes labelled machine drafts: writing help, a group description, interface words translated, a passage translated for reading, and the action drafts (text check, infraction, bearing, status report). It stores nothing.
- It is three files inside `agent-worker/src/`: `draft.mjs`, `action-drafts.mjs` and `untested.mjs`. It was split from agent-worker on 4 Nov because agent-worker's requirement file passed the 70,000-byte cap.

**agent-worker** is the fleet Worker that does AI work for the plane.

- `/run` walks the fixed control-flow table of an AI run and calls the plane back under the run's credential. `/ask` answers a member's question from the record under a read-only grant and returns only what the plane's checks pass. `/draft` hands the request to agent-drafts. `/transcribe` turns page pictures into text. `/signin` relays a member's own Claude sign-in to a runner. `/version` and `/health` report.
- It also holds the tables of what the agent may call on the plane (`ops.mjs`).

**ai-gate** is the library that decides, with evidence, whether an AI at a host can do the product's work, part by part.

- It holds the signed item bank, the planner, the scorer, the thresholds and verdicts, the cost estimate and meter, the canaries, the bundle format with its sealing, signing and verification, and its words.
- It runs each item through agent-model against an in-memory stub of the plane. It holds no network client.

### Every import among them

| From | To | Names | What they do |
| --- | --- | --- | --- |
| agent-runner `src/run.mjs` | ai-gate `src/index.mjs` | `checkDeclared`, `PARTS` | Check the run request |
| | | `PUBLIC_BANK`, `hasPrivate`, `itemById`, `selectItems`, `suiteVersions` | The item bank and what is drawn from it |
| | | `verifyChallenge`, `runPublicLine` | The issuer's challenge and the run's key |
| | | `planRun`, `meter` | Plan the calls and hold the ceiling |
| | | `scoreAnswerFree` | Score an answer without the expected answers |
| | | `scanForSecrets`, `buildManifest`, `sealPayload`, `signBundle`, `encodeBundle` | Scan, seal, sign and pack the bundle |
| agent-runner tests | ai-gate `src/index.mjs` | `openSealed`, `parseBundle`, `verifyBundle`, `sha256Hex`, `verifyChallenge`, `PUBLIC_BANK` | Open and verify what the runner produced |
| agent-drafts `draft.mjs` | agent-worker `ask.mjs` | `admitRead`, `readTool`, `ASK_DECLARED` | The check on which reads are allowed, the read tool, the declared bounds |
| agent-drafts `draft.mjs` | agent-worker `signin.mjs` | `doorTrace` | Read the two trace headers of a request |
| agent-drafts tests | agent-worker `src/index.mjs`, `test/account.mjs`, `test/remote.mjs` | the Worker itself, `MEMBER`, `remoteBindings` | Drive `/draft` through the whole Worker |
| agent-worker `index.mjs` | agent-drafts `draft.mjs` | `handleDraft` | Route `POST /draft` |
| agent-worker `ask.mjs` | agent-drafts `untested.mjs` | `untestedOf`, `UNTESTED_BAD` | The test-instance label and its refusal |
| agent-worker tests | agent-drafts' three files | `machineLabel`, `untestedOf`, `DRAFT_OPS`, `READ_TEXT_MAX`, `ACTION_DRAFT_OPS`, `READS_AS`, `AUDIENCES`, `BEARINGS`, `TEXTCHECK_TEXT_MAX` | Pin the draft tables and labels |
| ai-gate `src/run.mjs` | agent-worker `ops.mjs` | `PLANE_OPS` | The table of ops a run may call, and which write |
| ai-gate `src/run.mjs` | agent-worker `ask.mjs` | `admitRead`, `readTool` | The same read check and read tool production uses |
| ai-gate tests | agent-worker `ops.mjs`, `ask.mjs` | `ASK_OPS`, `PLANE_OPS`, `readTool` | Pin the stub plane to the tables |

Three couplings have no import:

- **agent-worker to agent-runner.** `agent-worker/wrangler.jsonc` binds `RUNNER` to agent-runner's class `AgentRunner`. `remote.mjs` reads the binding, and `signin.mjs` relays to `/signin`, `/signin/code`, `/signin/state` and `/signout`.
- **agent-runner to agent-worker.** `agent-runner/fleet-member.json` names agent-worker under `bind`, and `agent-runner/test/worker.test.mjs` reads `agent-worker/wrangler.jsonc`.
- **agent-runner to agent-worker, through ai-gate.** ai-gate's `index.mjs` re-exports its `run.mjs`, which imports agent-worker's `ask.mjs`. The runner's image build bundles ai-gate "and the plane modules it reads", so the ask handler's file and what it imports travel into the image's build.

ai-gate takes nothing from agent-runner or agent-drafts. agent-worker takes nothing from ai-gate.

## 2b. Why the loop exists

| Coupling | Essential or accident | Why |
| --- | --- | --- |
| agent-runner uses ai-gate | **Essential.** The position is the accident | The runner is ai-gate's container. The planning fold (`build/plan/beta/planning/FOLD-AI.md` §2.7, §2.9, decided 27 Oct) put it last in layer 6: "agent-runner moves after ai-gate (it is ai-gate's container); the agent-worker → agent-runner edge comes off". `layers.md` records that it was instead placed before agent-worker "so agent-worker's test fixture import stays downward until its job removes it". That test import is gone. The position was never corrected |
| ai-gate uses agent-worker | **Essential in substance, wider than it needs to be** | The gate must test a model against the same op table and the same read check production uses. To get two small pure functions it imports the file that holds the whole `/ask` handler |
| agent-worker uses agent-runner | **History** | It dates from when the runner held a member's Claude sign-in. T53 retired those routes from agent-runner. A coordinator ruling of 5 Nov bound the runner again. agent-worker's own file says both: its Private Uses reads "`agent-runner` is no longer reached", its R109 says the configuration "declares no `RUNNER` binding", and its F5 says "A runner is bound". In the map the use was restored on 6 Nov for a test import that no longer exists |
| agent-drafts and agent-worker use each other | **Accident of the size cap** | The split was made to shorten a requirement file. agent-drafts has one caller (agent-worker's router), no unmet requirement, and three test files of its own (257 lines) that drive the whole Worker. About 2,000 lines of tests that exercise `/draft` stayed in agent-worker's files (`t35`, `t37`, `t45`, `t46`, `t48`). The source comments in `draft.mjs` still use agent-worker's numbers (R59, R68) |

**File by file there is no loop.**

```
untested.mjs      (agent-drafts)   imports nothing of the four
ops.mjs           (agent-worker)   imports nothing of the four
ask.mjs, signin.mjs (agent-worker) import untested.mjs, ops.mjs
draft.mjs         (agent-drafts)   imports ask.mjs, signin.mjs, untested.mjs
index.mjs         (agent-worker)   imports draft.mjs, ask.mjs, signin.mjs
ai-gate run.mjs                    imports ops.mjs, ask.mjs
agent-runner run.mjs               imports ai-gate
```

The module boundary puts the bottom file and a middle file in agent-drafts, and the files between and above them in agent-worker. That is the whole loop.

**One stale route.** agent-worker's `/signin` relays to four routes of the runner. agent-runner's manifest lists `/version` and the `/run` routes, and "anything else" answers 404. So in the code at the tip, a member's sign-in step that reaches the runner meets the runner's 404 `UNKNOWN`. This is outside the ordering question, and it is the kind of break notification exists to catch.

## 2c. Refactoring options

All three options include the same first step.

**Step common to all: agent-runner after ai-gate.**

- Move agent-runner's row to directly after ai-gate in `build/modules.json`, and delete `agent-runner` from agent-worker's `uses`.
- Files: `build/modules.json`, the layer 6 paragraph of `build/layers.md`, and the generated `bio-plane/src/member-roster/order.mjs`. No source file, import or test.
- Other modules affected: none. Only agent-worker declared a use of agent-runner, and nothing imports it.
- What stays: the `RUNNER` binding in agent-worker's configuration. The map already treats a call over a binding as no use: agent-worker calls the plane, module 209, the same way.

### Option A. Put the map right (the simplest that works; recommended)

**In plain words:** undo the split. `POST /draft` is part of the agent Worker, so its three files belong to agent-worker again.

- **Moves:** `draft.mjs`, `action-drafts.mjs` and `untested.mjs` return to agent-worker's ownership. They do not move on disk.
- **Merged, split, renamed, reordered:** agent-drafts stops owning code. The order becomes agent-steps, agent-worker, ai-gate, agent-runner.
- **Its seven requirements** can be carried in either of two ways:
  - *A1.* agent-worker owns two requirement files, its own and `agent-drafts.md`. The module count falls to 219.
  - *A2.* agent-drafts stays in the map as a module that owns only its requirement file and its three tests, placed after agent-worker and using it. This is the form of the 18 other size splits ("the op-grades-folds pattern", the coordinator's standing rule of 5 Nov). agent-drafts was split one day before that rule and is the only one done the other way.
- **Files and import sites:** no source file, no import site. Edited: `build/modules.json`, `build/layers.md`, the generated `order.mjs`, and the Status lines of the two requirement files.
- **Other modules affected:** none.
- **Tests:** none move. agent-drafts' three tests already drive agent-worker's Worker.
- **Risk:** lowest. Under A2 one test of agent-worker (`requirements-ids.test.mjs`) reads `agent-drafts.md`, which would then belong to a later module; it pins the 4 Nov move and can be retired or handed to agent-drafts. The other thing to check is the id numbering under A1: agent-drafts' R1 to R7 would sit in the same module as agent-worker's R1 to R7, and 13 test titles name them. Either they keep a module prefix, as agent-worker's retired lines already write them (`agent-drafts:R1`), or they return to their old numbers (R59, R68, R69, R70, R76, R77, R86).

### Option B. Cut along the real seam

**In plain words:** make a small earlier module of the things all the others share, so that drafts, the Worker and the gate each use it and none uses a later one.

- **New module,** placed before agent-drafts. It holds what the agent may read and call: `ops.mjs` (the op tables), `untested.mjs` (the labels), and one new file that receives `readTool`, `admitRead` and `ASK_DECLARED` from `ask.mjs` and `doorTrace` with its two header names from `signin.mjs`. About 60 lines move.
- **Order:** the new module, agent-drafts, agent-worker, ai-gate, agent-runner. agent-drafts and ai-gate use the new module in place of agent-worker.
- **Files and import sites:** one new source file; six edited (`draft.mjs`, `ask.mjs`, `signin.mjs`, `transcribe.mjs`, `index.mjs`, `ai-gate/src/run.mjs`); about eight import sites in source and two in tests (`agent-worker/test/notice-answers-103.test.mjs`, `ai-gate/test/run.test.mjs`).
- **Requirements:** a new requirement file takes about seven of agent-worker's ids (R4, R37, R53, R55, R79, R87, R122; 6.1 KB). By the rule on permanent ids they are retired in agent-worker and renumbered, as on 4 Nov.
- **Other modules affected:** control-plane, plane and store-assembly, whose tests import `ops.mjs`, must declare the new module. 13 agent-worker test files import `ops.mjs`; their paths do not change.
- **Tests:** the tests of the read check and the op tables move from agent-worker's suite to the new module. agent-drafts' own three tests still drive the Worker, a later module. To end that, they and about 2,000 lines of draft tests in agent-worker's files must be rewritten to call `handleDraft` directly.
- **Risk:** medium to high. agent-worker's suite is 14,700 lines, takes over six minutes, and the job rules warn never to stop it midway. Word keys such as `agent-worker.ask.op_is_not_a_read` must be kept as written, or members' sentences change.
- **Gain beyond order:** ai-gate, and through it the runner's image, no longer depends on the Worker's `/ask` file. A change to agent-worker would stop notifying ai-gate, agent-runner, ai-issuer, op-grades, op-declarations and surface-declarations.

### Option C. Hand in what drafts needs

**In plain words:** `draft.mjs` stops importing from agent-worker. agent-worker's router passes it the four things it needs when it calls it.

- **Files and import sites:** two source files (`draft.mjs`, `index.mjs`), two import lines removed, four names added to the object the router already passes.
- **Other modules affected:** none. No module is created or moved, apart from agent-runner.
- **Tests:** agent-drafts' three tests still drive agent-worker.
- **Risk:** low in code. But the dependency does not go away. It becomes a coupling with no import, the same form as hypotheses and steps, which the map then had to declare anyway. It is the kind of coupling Part 1 shows makes change recognition unsound.

**Not recommended.**

### Recommendation

**Option A, with the common step.**

- The loop is a fact about the map. The code's imports already run one way, so there is nothing in the code to refactor to remove it.
- Both moves restore something already decided or already true: the 27 Oct placement of agent-runner, and the fact that `/draft` is one route of one Worker with one caller.
- It changes no source file, so it cannot change what the product does.
- It restores one job for the Worker's code. Today two jobs own files in one directory that import each other.

Between A1 and A2, A1 is the honest form under the owner's rule that a module is updated and tested by its own job: a module that owns only a requirement file has its requirements met by edits to another module's code. A2 needs no ruling and matches 18 existing modules. That choice is the owner's (section 2d).

Option B is a real improvement for a different reason, ai-gate's dependence on the whole Worker, and is worth doing when agent-worker is next worked on. Its file carries 41 unmet marks, so a job will come. A cheap first part of B needs no new module: move `readTool` and `admitRead` beside the op tables in `ops.mjs`, so that ai-gate imports one leaf file.

### hypotheses (96) uses steps (97)

hypotheses is handed a steps instance. It registers with it whether an id is one of a question's rival explanations, and asks it for the steps opened from a rival. steps declares no use of hypotheses, and neither uses anything placed between them.

| Option | In plain words | Changes | Risk |
| --- | --- | --- | --- |
| **H1. Swap the two** (simplest) | steps becomes 96, hypotheses 97 | `build/modules.json`, `build/layers.md`, the generated `order.mjs`. No source, no test | **One visible change.** Both modules register a check with the promotion gate. The gate runs the checks in the modules' order and returns the first refusal. A question whose basis rests on a hypothesis and also on a step is refused by both. Today the member reads the hypothesis reason; after the swap, the step reason |
| **H2. Turn the registration round** (recommended) | Keep the order. steps is handed hypotheses and asks it "is this a rival?" directly. hypotheses offers a registration that steps fills with "the steps opened from this rival" | Two source files (`hypotheses/index.mjs`, `steps/index.mjs`), about 25 lines each; steps R31 and hypotheses F1 reworded; one line of wiring in store-assembly; four test files (`hypotheses/rivals-f1`, `hypotheses/rivals-legs`, `steps/rivals`, `store-assembly/cr2-30-hypotheses-steps`). In the map hypotheses drops steps and steps gains hypotheses | Low. No behaviour changes. It follows the pattern steps already offers later modules (`registerArrivalSource`, "a later module registers") |

H2 is recommended because it changes nothing a member sees. H1 is acceptable if the owner accepts the one changed refusal.

## 2d. Does any option change what the product does, and what belongs to the owner

**Behaviour.**

| Option | Change for users |
| --- | --- |
| Common step (agent-runner after ai-gate) | None. agent-runner registers nothing in the plane, so its place in the compiled order moves no check or listener |
| A | None. No source changes |
| B | None intended. The runner's image and the Workers' bundles change in bytes, not in behaviour, provided word keys are kept |
| C | None |
| H1 | One corner case: which of two refusals a member reads first |
| H2 | None |

One fact applies to every reordering. The module order is not only a build order. `build/modules.json` is compiled into the product as `MODULE_ORDER`, and seven modules run registered checks and listeners in that order. Moving a module that registers something can change what a member sees. The old record has two cases: `member-roster:286` and `:446` grew the list, and membership was judged affected because "the ranks changed".

**Decisions that belong to the owner.**

1. **The requirement size cap against module boundaries.** The cap of 70,000 bytes on a requirement file caused the agent-drafts split and 18 others. agent-worker's file is at 69,818 bytes, so its next new requirement forces the question again. Option A1 needs either one module with two requirement files or a waiver of the cap for agent-worker.
2. **Whether a module may own requirements and no code.** 29 of the 220 modules do. Under "each module is updated and tested by a single job", their requirements are met by changes to another module's files. This decides A1 against A2, and it bears on Part 1: the Public part that governs one module's code is then spread over several files.
3. **Whether a member's own Claude sign-in through the runner still exists.** T53 retired it from agent-runner. agent-worker still binds the runner and relays `/signin` to routes that now answer 404, and its requirement file states both positions. If it is retired, the binding, `signin.mjs`'s relay and agent-worker's R66, R67 and R81 to R85 go, in agent-worker's own job. If it is to live, someone must say where. Until this is decided, agent-worker's configuration names a module that would sit after it.
4. **For hypotheses and steps,** whether the changed refusal of H1 is acceptable. If not, H2.
5. **Under Option B only:** the creation and name of a new module, and moving permanent requirement ids to it.

Purely technical, and not the owner's: regenerating `order.mjs`, editing `layers.md`, the import lines of Option B, and the wording of Status lines.
