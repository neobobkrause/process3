Length: 296 lines. Last section: "9. What could not be settled".

# Process4 build text 2: the forms of the files the design names

Written by Claude on 18 Nov 2026, beside the seventh draft (`process4/definition/process4_definition_v7/`), not into it. **Status: proposed. Nothing here has run.** It answers part 10, section 2, items 6 and 7 of that draft. It adds no check, gate, review or stop. Reconciled the same day with build texts 1, 3 and 5 and with part 4, section 11.

Marks: **Decided here:** a choice made in this text, with what it gives and what it costs. **Unproven:** never shown to work in this form. Every example is made up: a product in plain JavaScript with modules `dates`, `pricing` and `orders`.

## 1. What was proven, and in what form

Read for this text: the seventh draft, parts 0, 2, 4, 5 and 6 in full; `schema/` and `tool/`; `process4/working/notice_study/`; and, on 19 Nov, the proof of the notice (`neobobkrause/process3-probes`, branch `notice-proof`, folder `notice-proof/`; "proof:" paths below are in that folder) with the comparison `process4/working/readiness_18nov/notice_proof_forms_compared.md`.

**Measured by the study session (15 Nov),** on a past record: TypeScript 5.6.3 wrote out every module's interface from plain JavaScript with no comments added (1,181 source files, none failed). The study's trial forms are not used below.

**Proven by the proof session (15 Nov), as its `PROOF_RESULT.md` states it.** On a made-up product of eleven modules and 150 changes, design 7 (Node 22, TypeScript 5.6.3) was run again on "all 133 changes written before it" and "told exactly whom the method's rules say on all 133". On the 17 changes of round 8, written blind against it, 8 holes were found. Holes found, design 1 to design 7: "5, 8, 15, 6, 7, 10, 8. There is no downward trend." Over the 150 it sent 182 notices where telling every declaring module sends 474. Sections 5 and 6 give its forms.

**Not proven, in its words:** "The made-up modules are not the real product." "No real job wrote these comments." "What a told job does was not run." "Design 8 was not built or run."

**The form the design takes is design 8** (part 2, section 7): the notice of design 7 without the 23 refusals the owner has not approved, and with the type checker confirming "accepts more". It was described and never built or run; the 133 were measured with the 23 refusals in the tool. Where a form below ran only with one of them, it says so.

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
- `tests`: the paths of its tests, read the same way. Its walk steps are under these paths too, in `walk/internal/` and `walk/external/`, and the module's test command never runs those two folders (build text 3, section 3).
- `uses`: its declared uses, by name.
- The requirements file is not named: it is always the `.md` of the same name. The test command is not here either: it is one line of the process config (section 7).
- A module is identified everywhere by its `name`: in the tool's commands, in a job's branch `job/<name>/<n>` (build text 1, section 4), and in the records.

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

## 5. A structured comment

These are the proof's forms (proof: `product/money/src/index.mjs`, and `bookings` and `door` beside it), for plain JavaScript under TypeScript's reader, the only reader tried. Comments are JSDoc blocks, which running code never sees.

**What a module accepts and hands back.** Each export of the module's interface files (section 6) has a block with `@param` and `@returns`, or `@type`. A kind with a name is a `@typedef`. The kinds of error raised are `@throws {Kind}`. A kind of another module is brought in by `/** @import { Price } from '../pricing/index.mjs' */`.

```js
/**
 * @typedef {Object} PriceArgs
 * @property {string} sku the product code
 * @property {number} [quantity] absent is 1
 * @bound quantity: whole number, 1 to 999
 */
/**
 * @typedef {Object} Price
 * @property {number} pence
 * @bound pence: whole number, zero or more
 */
/**
 * @param {PriceArgs} args
 * @returns {Price}
 * @throws {RangeError} when the quantity is outside its bound
 */
export function priceOf(args) { /* … */ }
```

**The mark for a bound** is the tag `@bound <words>`, in the block of the kind or function it limits. No kind name is written: the block says whose it is. It runs to the next tag or the block's end and may wrap; its spaces are read as single. In a kind of plain data every bound line goes wherever the kind goes, not with one field. Only in an operations table or a handle kind (an object handed out, whose members are entries) is a line one member's, and only when it begins `member.`; any other line there is every member's. Any change to the words is a change to the interface (part 2, section 7, decision 3).

**Which kind a piece of code checks or builds.** One form: a plain `@type {Kind}` on the value, the words after it being for people. This is what makes the two approved refusals possible.

```js
/** @type {PriceArgs} checks a PriceArgs below */
const a = args;
/** @type {Price} builds a Price */
const price = { pence };
```

**The provider's one table of operations** is one kind, of any name, marked `@optable`. Its members are the names callers send, each a pair `req` and `res`. There is no table value.

```js
/**
 * @typedef {{
 *   priceof: {req: PriceArgs, res: Price}
 * }} PricingOps
 * @optable
 * @bound priceof.pence: for the whole quantity
 */
```

**The one list, and the comment tying a call by name to it.** The list is a kind in the source of the shared piece that carries the calls, which stands after the providers in the module order and declares them. Here it is one more made-up module, `door`, after `pricing`:

```js
/** @import { PricingOps } from '../pricing/index.mjs' */
/** @typedef {PricingOps & DatesOps} AllOps */
/**
 * @typedef {Object} Door
 * @property {<K extends keyof AllOps>(op: K, body: AllOps[K]['req']) => Promise<AllOps[K]['res']>} call
 * @carriesop call
 */
```

The mark `@carriesop <members>`, on the handle's kind or on a function, names what carries a call by name. The tool reads the name from each call's first argument: a text written out, a choice of such texts, or a request line beginning `op=<name>&`. `door.call('priceof', { sku })` in `orders` is a use of `pricing`'s entry `op:priceof`. A name the tool cannot read leaves the user not followed (build text 5, section 6). When a second module starts to answer a name, the tool tells that operation's users.

**Three more marks the proof ran.** A member that may be missing is optional in the listing. A kind sent between two separately running parts is marked `@message stdin` or `@message stdout`. Rows of a shared table are `@storedrows <table>` on the rows' kind, with `@carriestable get list put remove` on the store's handle, and are followed as calls by name are.

**Unproven:** the proven tool held modules to these forms by refusals the design does not take (a module imports only another's interface files; messages and stored rows carry their marks). The forms without those refusals are unproven.

## 6. An interface listing

These are the proof's forms (proof: `tool/p3tool.mjs`, `tool/lib/listing.mjs`, `canon.mjs`, `notice.mjs`). The tool makes a listing from the reader's own checker over the module's **interface files**, the files the module list names as its interface (`public` in the proof's `product/modules.json`). The proven commands are `listing <product folder> <module>` and `notice <product before> <product after> <module that changed>`: two folders, read at the same moment by one tool and reader. **Unproven:** the tool making the two folders from two commits, and taking the reader's version from the process config.

A listing is an object for each **entry**; the text below is a printing of it. It names no commit; the reader is named on the notice's first line.

```
Listing of pricing
  kind PriceArgs   [src/pricing/index.mjs:6]
      accepts: { quantity?: number; sku: string }
      bound: quantity: whole number, 1 to 999
  function priceOf   [src/pricing/index.mjs:16]
      accepts: (arg0: { quantity?: number; sku: string })
      hands back: { pence: number }
      bound: pence: whole number, zero or more
      bound: quantity: whole number, 1 to 999
      throws: RangeError
```

- An entry is named by its name within its module; the file and line beside it are not compared. Beside exports, entries are each member of a handle kind (`Door.call`), each class member (`Name.x` static, `Name#x` otherwise), each operation (`op:priceof`) and each shared table (`table:<name>`).
- An entry has a sort (function, value, kind, handle kind, method, class, class member, operation table, operation, stored rows) and, as they apply: what it accepts, what it hands back, its bound lines, the kinds of error it raises, a message's channel, whether a member may be missing, and the reader's printed declaration of it with comments removed, kept as a backstop.
- A kind of plain data is written out in full, fields in name order, in every entry that accepts it or hands it back, and its bound lines go with it without the kind's name. A handle kind is written by name. A kind is accepted, handed back or both by where the module's entries use it.
- Arguments are `arg0`, `arg1`: compared by place, not by name. Explanations in comments are in no entry. A plain constant's value is content: it is widened to its kind unless its comment states one.

**Comparing.** Both listings are made for the provider and for every module after it. A later module whose listing changed though its files did not (it passes on a kind of the provider) is "changed through" it, and its users are told too. Listings are compared as objects, entry by entry. With no difference the notice says `The listing before and after is the same. Nobody is told.` Otherwise each entry that differs gets one or more of the proof's words:

| Word | When | Told |
|---|---|---|
| `removed` | An entry gone, or a name lost from a handle or table. A renamed function is this and a `new entry` | Its users |
| `new entry` | An entry only in the new listing | Nobody |
| `kind renamed, shape unchanged` | Its members are still compared | Users that write the name |
| `accepts more` | See below | Nobody |
| `cannot stand in` | Removed or renamed, newly required or newly refused: the tool does not say which. A renamed field is this; a renamed argument is no change | Its users |
| `hands back differently` | Also the kinds of error, a message's channel, a member that may now be missing | Its users |
| `bound changed` | A bound line added, removed or reworded | Its users |
| `parameters moved` | An argument's old name found at another place | Its users |
| `declaration changed (not classified)` | The comparison found nothing, and the printed declaration differs | Its users |
| `<module> now answers the same name` | A second module answers an operation's name | That operation's users |

```
Notice for a change to pricing (TypeScript 5.6.3)
  pricing PriceArgs: bound changed -> tells users
  TOLD orders
      uses pricing PriceArgs (bound changed) at src/orders/lines.mjs:41
```

- **"Accepts more."** The design's rule (part 2, section 7, decision 7) is rule 52 of design 8 (proof: `notes/iteration-8-design.md`): the reader's type checker, reading the old and the new interface in one program, must confirm it. For a function or method the new must be assignable to the old; for something a user hands in, the old to the new. Not confirmed, or the entry cannot be found to ask about: `cannot stand in`, and the users are told. **Unproven:** this is design 8, described and not built. The proven tool did not ask the checker. Its own comparison of the two written-out kinds decided (`standsIn`, proof: `tool/lib/canon.mjs:202-252`), with the printed-declaration backstop; a new kind of "anything" or "unknown" counted as accepting more.
- On `accepts more` the proven tool told a user that hands the function on as a value. The design says accepting more tells no one, so that is not taken here.
- The proven tool also told on `bound test changed`: a test named for a bound line had its checks changed while the line stayed. That relied on a refusal the design does not take (every bound line has such a test), and it tells where the listings are the same. It is not taken here; the bound without it is unproven.
- **An entry's users** are found in every later module, declared or not (build text 5, section 6). A user not followed fully is told on any change to the provider's listing, a `new entry` or `accepts more` among them.

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
- `test_command`: the command the tool runs over a list of a module's test files. **Decided here:** one command for the product, kept here and not in each entry. Gives: an entry keeps four fields. Costs: a product whose modules need different commands must give one command that tells them apart.
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

1. **The proof's forms as the design takes them.** Sections 5 and 6 now give the proof's forms, read from its repository. What ran is design 7 with its 23 refusals; the design takes design 8, which was never built. Which of the 150 recorded answers change without the refusals is not worked out.
2. **A product in another language.** Sections 5 and 6 are for plain JavaScript under TypeScript's reader. No other reader has been tried.
3. **A module's interface files.** The proof's module list names them; section 3's entry has no field for it. The proof listed a helper for other modules' tests as one, under `src/` (proof: `product/store/src/testing.mjs`).
4. **Messages between two separately running parts.** The proof's mark is `@message` (section 5).
5. **"Cannot follow".** The proof's form is in build text 5, section 6.
6. **A decision record that outgrows the maximum.** The owner's dated words are never edited, so his record only grows. How it is split is the coordinator's and PROCESS's to settle.
