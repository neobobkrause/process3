Length: 179 lines. Last section: "9. What could not be settled".

# Process4 build text 2: the forms of the files the design names

Written by Claude on 18 Nov 2026, beside the seventh draft (`process4/definition/process4_definition_v7/`), not into it. **Status: proposed. Nothing here has run.** It answers part 10, section 2, items 6 and 7 of that draft. It adds no check, gate, review or stop. Reconciled the same day with build texts 1, 3 and 5 and with part 4, section 11. Sections 5 and 6 are in `02b-the-comment-and-the-listing.md` (build text 2b) since 19 Nov 2026, to keep each file under 24,000 bytes; the numbers are kept.

Marks: **Decided here:** a choice made in this text, with what it gives and what it costs. **Unproven:** never shown to work in this form. Every example is made up: a product in plain JavaScript with modules `dates`, `pricing` and `orders`.

## 1. What was proven, and in what form

Read for this text: the seventh draft, parts 0, 2, 4, 5 and 6 in full; `schema/` and `tool/`; `process4/working/notice_study/`; and, on 19 Nov, the proof of the notice (`neobobkrause/process3-probes`, branch `notice-proof`, folder `notice-proof/`; "proof:" paths here and in build text 2b are in that folder) with the comparison `process4/working/readiness_18nov/notice_proof_forms_compared.md`.

**Measured by the study session (15 Nov),** on a past record: TypeScript 5.6.3 wrote out every module's interface from plain JavaScript with no comments added (1,181 source files, none failed). The study's trial forms are not used below.

**Proven by the proof session (15 Nov), as its `PROOF_RESULT.md` states it.** On a made-up product of eleven modules and 150 changes, design 7 (Node 22, TypeScript 5.6.3) was run again on "all 133 changes written before it" and "told exactly whom the method's rules say on all 133". On the 17 changes of round 8, written blind against it, 8 holes were found. Holes found, design 1 to design 7: "5, 8, 15, 6, 7, 10, 8. There is no downward trend." Over the 150 it sent 182 notices where telling every declaring module sends 474. Sections 5 and 6 (build text 2b) give its forms.

**Not proven, in its words:** "The made-up modules are not the real product." "No real job wrote these comments." "What a told job does was not run." "Design 8 was not built or run."

**The form the design takes is design 8** (part 2, section 7): the notice of design 7 without the 23 refusals the owner has not approved, and with the type checker confirming "accepts more". It was described and never built or run; the 133 were measured with the 23 refusals in the tool. Where a form there ran only with one of them, it says so.

**The process before this one** kept its module list as `build/modules.json` (220 modules) and requirements as `build/requirements/<module>.md`. Sections 2 to 4, 7 and 8 start there.

## 2. Where everything is

**Decided here:** the process config is `process.json` at the top of the product's repository, the one fixed place. It names the process folder, and every other form here lives under that folder. Gives: the tool finds everything from one file. Costs: one more file at the top level. The examples use `process/`.

| Form | Place | Writer |
|---|---|---|
| Process config | `process.json` | ARCH |
| Module order | `process/modules/order.txt` | ARCH |
| A module's entry | `process/modules/<name>.json` | ARCH; the module's job, its `uses` only |
| A module's requirements | `process/modules/<name>.md` | ARCH the text; the job the word `met` |
| Ranking page | `process/ranking.md` | ARCH |
| The owner's decisions on the product | `process/decisions-owner.md` | The coordinator |
| ARCH's technical decisions | `process/decisions-arch.md` | ARCH |
| Procedures, release notes, tranche reports | `process/procedures/`, `process/releases/`, `process/reports/` | ARCH |
| A job's kind and its record | Two comments on the job's own pull request (build text 5, section 5) | The tool: the job block in ARCH's session, the record in the job's |
| The shared state's records | Comments on one issue (build text 5, sections 1 to 4) | One session each |

## 3. The module list

**Decided here:** the list is one order file and one small entry file for each module. Gives: no file nears the maximum however many modules there are (220 entries in one file would be about 60,000 bytes, estimated), and a job reads only the order and its own entry. Costs: "the module list" is many files, and a rename touches two.

**The order file** holds one module name on each line and nothing else. A module's order is its line number. A name is lower-case letters, digits and hyphens.

```
dates
pricing
orders
```

**An entry** is a JSON object with exactly five fields.

```json
{
  "name": "orders",
  "files": ["src/orders/"],
  "tests": ["test/orders/"],
  "public": ["src/orders/index.mjs"],
  "uses": ["dates", "pricing"]
}
```

- `name`: as in the file's name and the order file.
- `files`: the paths of the code the module owns. A path ending in `/` is a folder with everything under it. A file belongs to the module with the longest matching path, as in the process before this one.
- `tests`: the paths of its tests, read the same way. Its walk steps are under these paths too, in `walk/internal/` and `walk/external/`, and the module's test command never runs those two folders (build text 3, section 3).
- `public`: its interface files, read the same way: the files whose exports, with the further entries named there, make its listing (build text 2b, section 6). The proof's field of the same name (proof: `product/modules.json`). A helper for other modules' tests is one too, as the proof's `product/store/src/testing.mjs` was.
- `uses`: its declared uses, by name.
- The requirements file is not named: it is always the `.md` of the same name. The test command is not here either: it is one line of the process config (section 7).
- A module is identified everywhere by its `name`: in the tool's commands, in a job's branch `job/<name>/<n>` (build text 1b, section 4), and in the records.

**How "a module may use only modules before it" reads:** every name in `uses` stands on an earlier line of the order file than the module's own. `orders` is on line 3, `dates` and `pricing` on lines 1 and 2, so it holds. Had `pricing` listed `orders`, that would be a design error, which ARCH corrects by reshaping code (part 2, section 1). Nothing refuses it.

**Decided here:** a job may change the `uses` of its own entry and nothing else in the list. Gives: the job can remove a declared use that no code makes, as part 2, section 7 says, and add one its new code needs. Costs: a job adding a use of a later module is caught only by ARCH's reading. This is a rule in the job's instructions, held by no check.

## 4. A module's requirements file

Place: `process/modules/<name>.md`. It is a governing text for the module's job, so its top says its length.

```
Length: 10 lines. Last section: "Requirements".

# orders: requirements

Next number: 4

## Requirements

- **R1** [met] An order holds one or more lines, each a product code and a quantity.
- **R3** [not yet met] An order of more than 999 of one product is refused, and the refusal says which line. (screen: checkout / basket)
```

- One requirement is one line: `- **R<n>** [met]` or `- **R<n>** [not yet met]`, then the text. However long the text, it stays one line, so that a change to a requirement is a change to exactly one line.
- The number is permanent. A requirement that is withdrawn has its line deleted and its number is never used again (R2 above). `Next number` is what makes that hold.
- **Who changes which part.** ARCH writes and rewords the text, adds and deletes lines, and keeps `Next number` and the length line. The job changes one thing only: `[not yet met]` to `[met]`, in its own pull request. Marking changes no line count, so the job never touches the length line.
- ARCH writes `[not yet met]` on a new requirement, and puts it back on a met one in the same change that rewords it so as to change what the product does (part 2, section 2). So "the module has work" (part 2, section 3) reads from the file alone.
- Requirement text names what it serves by ending with `(screen: <page> / <screen>)` or `(journey: <page> step <n>)`. `walk areas` reads these endings.
- ARCH keeps the file under 24,000 bytes by splitting the module (part 2, section 2). Nothing refuses a longer one.

## 7. The process config

Place: `process.json`. ARCH writes it; it changes as the process's named files do (part 2, section 9).

```json
{
  "process": { "repository": "https://github.com/<owner>/<process repository>", "version": "4.0.0", "commit": "9f2c…(40 characters)" },
  "tranche_branch": "tranche",
  "node": "22",
  "lock_files": ["package-lock.json"],
  "test_command": "node --test",
  "slots": { "default": 8, "share": 8 },
  "lanes": [ { "name": "ux", "folder": "lanes/ux/" } ],
  "hosting": { "provider": "cloudflare", "development_account": "<the account's id>" },
  "walks_folder": "lanes/ux/walks/",
  "walk": { "build_and_serve": "npm run serve-local", "run_steps": "npm run walk --", "most_external_walkers": 1 },
  "deploy": { "deploy": "npm run dev-deploy --", "seed": "npm run dev-seed --", "remove": "npm run dev-remove --" },
  "process_folder": "process/",
  "language_reader": { "name": "typescript", "version": "5.6.3", "source": ["**/*.mjs"] }
}
```

- `process`: the one fixed version of the process the tranche runs on: the process repository's address, the version's name, and its full commit id on that repository's main branch. Each session, and the required run, fetches a read-only copy of exactly that commit (build text 1, section 2).
- `tranche_branch`: the name of the one lasting tranche branch, which pull requests go into. The process's repository has no tranche branch: its own `process.json` names `main` here.
- `node`, `lock_files`: the Node version, and the lock files the required run installs the product's dependencies from (build text 1, section 5).
- `test_command`: the command the tool runs over a list of a module's test files. **Decided here:** one command for the product, kept here and not in each entry. Gives: an entry keeps five fields. Costs: a product whose modules need different commands must give one command that tells them apart.
- `slots.default`: the account's slot number when the owner has given none. `slots.share`: this product's share of it (part 2, section 5); with one product the two are equal. A number the owner gives later is held in the standing notes, not here.
- `lanes`: each lane's name and its folder. The UX lane is always there.
- `hosting`: the provider's name and the development account. The account's id is not a secret. The deploy token is, and is never written here.
- `walks_folder`: where the Screens document and the journeys are kept.
- `walk`: the command that builds and serves the product on one machine; the command that runs named steps against an address; and the most external walkers, which begins at one (build text 3, sections 4 and 5). A walking session reads the two commands here: its starting text names this file, and is filled in with names and addresses only.
- `deploy`: the product's own commands that deploy, seed and remove a development copy, each run with a copy's name by ARCH's session (build text 3, section 5).
- **Decided here:** one trial-only line, `"trial": { "mechanical_edit_tests": "none" }`, written only in the trial repository, asks the required run to run no test on a mechanical edit (build text 1, section 5, step 5). Gives: trial item 9's "none run" form can be tried. Costs: a line no product's config may hold.
- `process_folder`: where the files of sections 3, 4 and 8 are kept.
- `language_reader`: the reader's name, its exact version, and which files are the product's code. **Decided here:** the version is fixed in the config. Gives: every session and GitHub's machines make the same listing. Costs: a new version is a change to this file.

## 8. The ranking page, the two decision records, and a job's record

**The ranking page,** `process/ranking.md`. Five numbered lines, highest first, each naming a kind of governing text and where it is kept, then the rule.

```
1. Mission: docs/mission.md
2. Principles: docs/principles.md
3. Standards: docs/standards/
4. Requirements: process/modules/<name>.md
5. Design decisions: process/decisions-arch.md and each lane's folder
A lower one never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH.
```

**The owner's decisions,** `process/decisions-owner.md`, written only by the coordinator. One entry for each subject, in subject order:

```
## Slots
Rule now: ten jobs may run at once on this product.
- 19 Nov 2026: "make it ten"
Shown to the owner: 19 Nov 2026.
```

`Rule now` is rewritten in place when a decision changes it. The dated lines are his exact words, never edited; a new one goes below the last. `Shown to the owner` is the date he saw the rewritten entry, or `not yet`. Each recorded decision is one pull request, which the coordinator opens and merges by the tool (part 4, section 11).

**ARCH's decisions,** `process/decisions-arch.md`, written only by ARCH. Same order by subject:

```
## Money
Decision: amounts are whole pence everywhere; no module holds a fraction of a penny.
Why: two modules rounded differently.
Decided: 19 Nov 2026.
```

The `Decision` line is the one plain line the coordinator gives the owner. A changed decision rewrites the entry in place. Each is one pull request, which ARCH opens and merges by the tool.

**A job's kind and its record** are two comments on the job's own pull request, the job block and the job's record. Their forms are in build text 5 (`05-the-records-and-following.md`), section 5, with the shared state's records.

## 9. What could not be settled

1. **The proof's forms as the design takes them.** Sections 5 and 6 (build text 2b) now give the proof's forms, read from its repository. What ran is design 7 with its 23 refusals; the design takes design 8, which was never built. Which of the 150 recorded answers change without the refusals is not worked out.
2. **A product in another language.** Sections 5 and 6 (build text 2b) are for plain JavaScript under TypeScript's reader. No other reader has been tried.
3. **Messages between two separately running parts.** The proof's mark is `@message` (build text 2b, section 5).
4. **"Cannot follow".** The proof's form is in build text 5, section 6.
5. **A decision record that outgrows the maximum.** The owner's dated words are never edited, so his record only grows. How it is split is the coordinator's and PROCESS's to settle.
