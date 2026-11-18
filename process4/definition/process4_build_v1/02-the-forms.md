Length: 305 lines. Last section: "9. What could not be settled".

# Process4 build text 2: the forms of the files the design names

Written by Claude on 18 Nov 2026, beside the seventh draft (`process4/definition/process4_definition_v7/`), not into it. **Status: proposed. Nothing here has run.** It answers part 10, section 2, items 6 and 7 of that draft. It adds no check, gate, review or stop. Reconciled the same day with build texts 1 and 3 and with part 4, section 11.

Marks: **Decided here:** a choice made in this text, with what it gives and what it costs. **Unproven:** never shown to work in this form. Every example is made up: a product in plain JavaScript with modules `dates`, `pricing` and `orders`.

## 1. What was proven, and in what form

Read for this text: the seventh draft, parts 0, 2, 4, 5 and 6 in full; `schema/` and `tool/`; `process4/working/notice_study/` and `replay/`; the sixth draft's notice sections; `process4/evidence/interface_and_cycle.md`.

**Measured, on a past record, by the study session (15 Nov), with TypeScript 5.6.3 reading plain JavaScript:**

- The reader wrote out every module's interface with no comments added: 1,181 source files, none failed. The listing was its declaration text with comment blocks taken out, compared line by line. Of 178 recorded changes, 64 listings were identical, 36 only gained lines, 78 lost or altered lines.
- One provider was commented by a helper (about 1,500 comment lines). The form was JSDoc: `@typedef`, `@property`, `@param`, `@returns`. A bound was written inside a field's description as `[bound <field>: <words>]`, often over several lines. The provider's operations table was one `@typedef {object} AiRunsOps`. Eight recorded changes were replayed against it.
- Twenty-two user modules were commented with `@param` and `@type {import("…").Kind}`. After one change the reader's own checker pointed at 5 of 11 broken users and at none of 18 unbroken ones.
- One case each: a comment on inner code that checks a record made the checker complain; a nine-line comment on a helper carrying a call by name made it flag two lines.

**Proven by the proof session (15 Nov), as the study session reports it:** on eleven made-up modules and 150 changes, the seventh design of the rules told users as its rules say. Its tool, rules and forms are in another repository (`neobobkrause/process3-probes`, branch `notice-proof`), which this session could not open, so its exact forms are not carried here.

**Only described, never run:** the bound on its own marked line; the tables "gathered into one list"; "accepts more" confirmed by the type checker (the proof's eighth design, not built); a listing sorted into removed, newly required and newly refused; the tool saying whether it follows a user fully.

**The process before this one** kept its module list as `build/modules.json` (220 modules, each with `id`, `paths`, `tests`, `uses` and a layer), a record for each module as `process/ledger/<id>.json` (a job could change only its own entry's status), requirements as `build/requirements/<module>.md` with `**R<n>**` first on the line, and settings in `process/config.json`. The forms below start there.

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
| A job's kind and its record | Two comments on the job's own pull request | The tool: the job block in ARCH's session, the record in the job's |

## 3. The module list

**Decided here:** the list is one order file and one small entry file for each module. Gives: no file nears the maximum however many modules there are (220 entries in one file would be about 60,000 bytes, estimated), and a job reads only the order and its own entry. Costs: "the module list" is many files, and a rename touches two.

**The order file** holds one module name on each line and nothing else. A module's order is its line number. A name is lower-case letters, digits and hyphens.

```
dates
pricing
orders
```

**An entry** is a JSON object with exactly four fields.

```json
{
  "name": "orders",
  "files": ["src/orders/"],
  "tests": ["test/orders/"],
  "uses": ["dates", "pricing"]
}
```

- `name`: as in the file's name and the order file.
- `files`: the paths of the code the module owns. A path ending in `/` is a folder with everything under it. A file belongs to the module with the longest matching path, as in the process before this one.
- `tests`: the paths of its tests, read the same way.
- `uses`: its declared uses, by name.
- The requirements file is not named: it is always the `.md` of the same name. The test command is not here either: it is one line of the process config (section 7).
- A module is identified everywhere by its `name`: in the tool's commands, in a job's branch `job/<name>`, and in the records.

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
- **R3** [not yet met] An order of more than 999 of one product is refused, and the refusal says which line.
```

- One requirement is one line: `- **R<n>** [met]` or `- **R<n>** [not yet met]`, then the text. However long the text, it stays one line, so that a change to a requirement is a change to exactly one line.
- The number is permanent. A requirement that is withdrawn has its line deleted and its number is never used again (R2 above). `Next number` is what makes that hold.
- **Who changes which part.** ARCH writes and rewords the text, adds and deletes lines, and keeps `Next number` and the length line. The job changes one thing only: `[not yet met]` to `[met]`, in its own pull request. Marking changes no line count, so the job never touches the length line.
- **Decided here:** ARCH writes `[not yet met]` on a new requirement, and puts it back on a met one in the same change that rewords it so as to change what the product does. Gives: "the module has work" (part 2, section 3) reads from the file alone. Costs: ARCH writes a mark in that one case; the design gives the mark to the job and does not say who takes it away.
- ARCH keeps the file under 24,000 bytes by splitting the module (part 2, section 2). Nothing refuses a longer one.

## 5. A structured comment

This is the form for plain JavaScript read by TypeScript's reader, the only reader tried. Comments are JSDoc blocks, `/** … */`, which running code never sees.

**What a module accepts and hands back.** Every exported function, every public method of an exported class and every exported value has a block with `@param` and `@returns`, or `@type`. A kind with a name is a `@typedef`.

```js
/**
 * What `priceOf` is handed.
 * @typedef {object} PriceArgs
 * @property {string} sku  The product code.
 * [bound PriceArgs.sku: 1 to 40 characters, each a letter, a digit or a hyphen]
 * @property {number} [quantity]  Absent is 1.
 * [bound PriceArgs.quantity: a whole number from 1 to 999]
 */
/**
 * What `priceOf` hands back. A refusal is an answer, not a thrown error.
 * @typedef {{ok: true, pence: number} | {ok: false, code: "NO_SUCH_SKU"|"BAD_QUANTITY"}} PriceAnswer
 * [bound PriceAnswer.pence: a whole number, zero or more]
 */
/**
 * @param {PriceArgs} args
 * @returns {PriceAnswer}
 */
export function priceOf(args) { /* … */ }
```

**The marked line for a bound.** A bound that a kind cannot express is one whole line of the block, and only that line: `[bound <Kind>.<field>: <the bound in words>]`, or `[bound <name>: …]` for a kind or a function's own argument. It is never wrapped onto a second line. Any change to the words is a change to the interface (part 2, section 7, decision 3).

**Decided here:** the trial's bracket mark is kept and moved onto a line of its own. Gives: the tool finds every bound by one pattern in the reader's own output, as the replay did, and tells a bound from the explanation around it. Costs: long lines. **Unproven:** the one-line form; the trial wrote bounds inside descriptions, wrapped.

**Which kind a piece of code checks or builds.** No new mark. Code that checks a value crossing the interface says so in its `@returns`; code that builds one says so in a `@type`.

```js
/** @param {unknown} v  @returns {v is PriceArgs} */
function isPriceArgs(v) { /* … */ }

/** @type {PriceAnswer} */
const answer = { ok: true, pence };
```

**Decided here:** these two standard forms and no other. Gives: the reader's own checker then compares the code with the kind, which is what makes the two approved refusals possible. Costs: a check buried in a longer function must be moved into a function of its own. **Unproven** beyond one case.

**The provider's one table of operations.** A module whose operations are called by name publishes one kind named `<Module>Ops` and one exported value `OPS` of that kind. Each row is the name callers send and the function that answers it.

```js
/**
 * @typedef {object} PricingOps
 * @property {(args: PriceArgs) => PriceAnswer} priceof  `priceOf`.
 */
/** @type {PricingOps} */
export const OPS = Object.freeze({ priceof: priceOf });
```

**The one list, and the comment tying a call by name to it.** **Decided here:** the list is not a file in the repository. When the tool reads the product it writes, in its working folder, one kind named `ProductOps` that joins every module's `…Ops` kind. A shared piece that carries a call by name has one comment:

```js
/** @type {<N extends keyof ProductOps>(name: N, args: Parameters<ProductOps[N]>[0]) => ReturnType<ProductOps[N]>} */
export const call = (name, args) => door.send(name, args);
```

After that, `call("priceof", { sku: 7 })` in any module is a use of `pricing`'s `priceof` that the reader can follow. Gives: no committed file that every provider's job would have to write, and no early module importing a later one. Costs: the comment means nothing without the tool; an operation name must be the only one of that name in the product, a rule ARCH applies. **Unproven:** this form. What was shown is one case, where a comment on one helper named one provider's kinds directly.

## 6. An interface listing

The tool writes a listing for one module at one commit, from the reader's declaration output for every source file under the module's `files`. A listing is plain text, kept only in the tool's working folder. Both listings of a comparison are made at the same moment by the same tool and reader versions.

The first line names what was read. Every other line belongs to one **entry**: an exported name of one file. Lines are sorted.

```
listing pricing a1b2c3d reader typescript 5.6.3
src/pricing/index.mjs OPS op priceof (args: PriceArgs) => PriceAnswer
src/pricing/index.mjs PriceAnswer bound pence: a whole number, zero or more
src/pricing/index.mjs PriceAnswer kind {ok: true, pence: number} | {ok: false, code: "NO_SUCH_SKU"|"BAD_QUANTITY"}
src/pricing/index.mjs PriceArgs bound quantity: a whole number from 1 to 999
src/pricing/index.mjs PriceArgs bound sku: 1 to 40 characters, each a letter, a digit or a hyphen
src/pricing/index.mjs PriceArgs field quantity optional number
src/pricing/index.mjs PriceArgs field sku required string
src/pricing/index.mjs priceOf accepts args required PriceArgs
src/pricing/index.mjs priceOf returns PriceAnswer
```

Each line is: file, entry, a word for the line's sort, then the rest. The sorts are `accepts` (an argument: name, `required` or `optional`, kind), `returns`, `field` (of a named kind: name, `required` or `optional`, kind), `kind` (a named kind that is not a list of fields), `value` (an exported value's kind), `op` (a row of the operations table), and `bound` (the words of a marked line). Kinds are written as the reader writes them. Explanations in comments are left out, so editing one sends nothing.

**Comparing two listings.** Identical text: nobody is told. Otherwise, entry by entry:

| What differs | It is | Who is told |
|---|---|---|
| An entry in the old listing is absent from the new | Removed. A rename is a removal and an addition, and reads the same | The old entry's users |
| An entry only in the new listing | Added | Nobody |
| A `returns` or `value` line, or the answer side of an `op` line | Hands back something else | The entry's users |
| A `bound` line added, removed or reworded | The interface changed | The entry's users |
| An `accepts` or `field` line removed, or its name changed | Removed or renamed | The entry's users |
| A new `accepts` or `field` line marked `required`, or `optional` become `required` | Newly required | The entry's users |
| A new `optional` line, or `required` become `optional` | Accepts more | Nobody, if the checker agrees |
| The kind on an `accepts` or `field` line changed | Accepts more if the checker agrees; otherwise newly refused | Nobody; otherwise the entry's users |

- **"If the checker agrees."** The tool asks the reader's own type checker one question: can a value of the old accepted kind be given where the new one is wanted? It writes a two-line file that does that and reads whether the checker complains. No complaint: accepts more, nobody told. A complaint, or a kind the checker calls "anything": the entry's users are told. **Unproven:** this is the proof's eighth design, described and not built.
- **Decided here:** a named kind that is reached from any `returns`, `value` or answer is treated as handed back, so any change to its lines tells its users; only a kind reached from arguments alone gets the "accepts more" question. Gives: one plain rule. Costs: some needless notices.
- **An entry's users** are the modules whose code or comments name it (part 2, section 7, decision 1), together with the users of every entry whose lines name it. In the example a change to `PriceArgs` tells the users of `priceOf` and of the `priceof` row. A user the tool cannot follow fully is a user of every entry.
- **Decided here:** a listing is lines of plain text, not the reader's raw output. Gives: "removed, newly required, newly refused" each read off a line's sort, and two listings can be compared by any session by eye. Costs: turning the reader's output into these lines is a new step. **Unproven:** all of it. What was measured is a line-by-line comparison of the raw output: identical, only gained, or lost or altered.

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
  "process_folder": "process/",
  "language_reader": { "name": "typescript", "version": "5.6.3", "source": ["**/*.mjs"] }
}
```

- `process`: the one fixed version of the process the tranche runs on: the process repository's address, the version's name, and its full commit id on that repository's main branch. Each session, and the required run, fetches a read-only copy of exactly that commit (build text 1, section 2).
- `tranche_branch`: the name of the one lasting tranche branch.
- `node`, `lock_files`: the Node version, and the lock files the required run installs the product's dependencies from (build text 1, section 5).
- `test_command`: the command the tool runs over a list of a module's test files. **Decided here:** one command for the product, kept here and not in each entry. Gives: an entry keeps four fields. Costs: a product whose modules need different commands must give one command that tells them apart.
- `slots.default`: the account's slot number when the owner has given none. `slots.share`: this product's share of it (part 2, section 5); with one product the two are equal. A number the owner gives later is held in the standing notes, not here.
- `lanes`: each lane's name and its folder. The UX lane is always there.
- `hosting`: the provider's name and the development account. The account's id is not a secret. The deploy token is, and is never written here.
- `walks_folder`: where the Screens document and the journeys are kept.
- `walk`: the command that builds and serves the product on one machine; the command that runs named steps against an address; and the most external walkers, which begins at one (build text 3, sections 4 and 5). The tool copies the two commands into a walking session's starting instructions.
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

**A job's kind and its record.** Two comments on the job's own pull request, each with a hidden mark on its first line, as in the shared state, and one JSON block after it. Each has one writing session (part 4, section 11), and only the tool writes and reads them.

The job block, `<!-- process4-job -->`, is written once by ARCH's session, by `open --module <name>`, from the waiting-work record:

```json
{
  "module": "orders",
  "work": ["R3", "notice from pricing"],
  "kind": "told",
  "uses": [ { "provider": "pricing", "old": "a1b2c3d", "new": "e4f5a6b",
              "entry": "src/pricing/index.mjs PriceArgs", "change": "bound",
              "was": "PriceArgs bound quantity: a whole number from 1 to 999",
              "now": "PriceArgs bound quantity: a whole number from 1 to 99",
              "places": ["src/orders/lines.mjs:41", "test/orders/lines.test.mjs:17"] } ]
}
```

The job's record, `<!-- process4-job-record -->`, is written only by the job's session, and holds one of two things:

```json
{ "blocked": { "by": "pricing", "why": "<one plain sentence>" } }
{ "nothing_to_change": "<one plain sentence>" }
```

- `kind` is `ordinary` or `told`; an ordinary job's block holds `module`, `work` and `kind` only. `work` is the work placed: requirement numbers, notices, and flaws by number and link. The job's starting text carries none of this; it names the pull request (part 4, section 11). `change` is one of removed, hands back, bound, newly required, newly refused. `now` is the new line or `gone`. `places` is `["everything"]` where the tool could not follow the module.
- `blocked` is written by `push --blocked <module> "<why>"`, `nothing_to_change` by `close <pr> --nothing-to-change "<why>"`. A later record rewrites the comment in place; its one writer is the job.
- The tool reads `blocked.by` to make the job ready again when that module merges, and reads `nothing_to_change` on a pull request closed unmerged to count the module finished (part 2, section 4). No test runs for that record (part 2, section 7).
- **Decided here**, following build text 1 and part 4, section 11: one JSON block for each of the two, in place of a comment of plain lines for each record. Gives: the required run and every command read fixed places, and no write can be lost to another session's. Costs: a notice that arrives while the job is open waits in waiting work for the module's next job (part 2, section 7).

## 9. What could not be settled

1. **The proof session's own forms.** They are in a repository this session could not open. Where they differ from sections 5 and 6, they have the better claim, having run.
2. **A product in another language.** Sections 5 and 6 are for plain JavaScript under TypeScript's reader. No other reader has been tried.
3. **Helpers under a module's tests that other modules import.** The listing covers `files`, not `tests`. On the earlier record such helpers were a real route between modules, and one missed effect came through one.
4. **Messages between two separately running parts.** The study names the need for one written kind shared by both ends; no form is given here.
5. **How the tool says it "cannot follow" a user.** The rule depends on it and nothing here defines it.
6. **A decision record that outgrows the maximum.** The owner's dated words are never edited, so his record only grows. How it is split is the coordinator's and PROCESS's to settle.
