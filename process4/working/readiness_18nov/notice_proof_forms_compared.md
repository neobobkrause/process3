Length: 288 lines. Last section: "6. What could not be read or determined".

# The notice proof's forms, compared with build texts 2 and 5

Written by Claude on 19 Nov 2026. A reading only: nothing here is in force, and it adds no test, check, gate, review or stop. It proposes no change of design; the last column of section 3 says only what a build text would have to say to match the form the proof ran.

Short names: **BT2** is `process4/definition/process4_build_v1/02-the-forms.md`; **BT5** is `05-the-records-and-following.md` beside it; **D7** is `process4/definition/process4_definition_v7/02-modules-jobs-tests-and-the-notice.md`. Proof paths are under `notice-proof/` on the branch `origin/notice-proof` of `neobobkrause/process3-probes` (one commit, `10ad3d9`, 15 Nov 2026).

**Read in full:** BT2 (283 lines), BT5 (186), D7 (109). In the proof: `PROOF_RESULT.md` (309); the tool's `tool/p3tool.mjs` (71), `tool/lib/model.mjs` (47), `listing.mjs` (308), `notice.mjs` (288), `usage.mjs` (217), `carriers.mjs` (74), `ts.mjs` (153), `canon.mjs` (285); `notes/iteration-2-design.md` (47), `iteration-7-design.md` (35), `iteration-8-design.md` (27), `learning-loop.md` (33), `development-log.md` (17); `proof/trees.mjs` (56), `run-series.mjs` (70), `compare.mjs` (49), `groundtruth.mjs` (29); `changes/make.py` (65); `product/modules.json` (16) and the source of money (74), door (54), store (81, and its `testing.mjs`, 18) and reports (29).

**Only sampled:** `tool/lib/check.mjs` (798 lines: its first 40, its list of functions and refusal names, and lines 728 to 796); `tool/audit.mjs` (25 of 79); `tool/lib/node.d.ts` (30 of 99); the source of bookings (75 of 153), rooms (13 lines), meter (27 of 28); the notes for designs 3 to 6 (not opened; their rules were read as the one-line rows of `PROOF_RESULT.md`, lines 132 to 184); the tool's seven test files (not opened; run, see below). Of the 150 change folders and 45 set-up folders: every `change.json` was read by a script for its fields; four were read by eye (P07, P12, P21 and three of round 8) with two of their diffs. Of the expected answers and readings: the nine design-7 files of each were read by a script for their fields and counts, and about a dozen entries by eye. Of 1,087 result files: two by eye (P12, P21), `results/history.json` for design 7 by script, and the first ten rows of one table.

**Run by me, on a scratch copy outside both checkouts** (Node 22.23.5, `npm ci` giving TypeScript 5.6.3): the tool's own tests (86 pass, 0 fail); `listing` on money, door, bookings, reports and calendar; `notice` on changes P07 and P12 (P12 told the same five users as the committed result). The proof's full rerun (`npm run proof`) was not run.

## 1. What the proof holds

**Files and sizes.** 1,971 files, about 13.4 million bytes.

| Folder | Files | Bytes | What it is |
|---|---|---|---|
| `tool/` | 18 | 218,628 | The tool: 11 source files (2,419 lines), 7 test files (977 lines) |
| `product/` | 25 | 49,313 | Eleven made-up modules and `modules.json` |
| `changes/` | 819 | 2,039,341 | 150 change folders in 9 series, 45 set-up folders, the scripts that wrote them, expected answers and readings for each design |
| `results/` | 1,087 | 10,993,222 | What the tool said and every test result, for each change on each design |
| `notes/` | 9 | 36,387 | The rules of designs 2 to 8, a development log, the learning loop |
| `proof/` | 9 | 23,769 | The runner |

There is no README and no separate rules file. `PROOF_RESULT.md` is the report; the rules are the table in it (lines 132 to 184) and the notes.

**The tool is JavaScript on Node, using TypeScript's reader.** `package.json`: `"type": "module"`, `"engines": { "node": ">=22" }`, one dependency, `"typescript": "5.6.3"`, fixed exactly in `package-lock.json`. `tool/lib/ts.mjs:2` is `import ts from 'typescript';`. `PROOF_RESULT.md:252` gives the versions it ran on: "Node 22.23.4, TypeScript 5.6.3".

**How many designs, and which was proven.** `PROOF_RESULT.md:40`: "A **design** is one version of the method's rules together with the tool that applies them. There were seven built, and an eighth described." The committed tool is design 7: the nine points of the brief and 51 added rules.

**On what, with what result.** Eleven modules of about 400 lines of code, and 150 changes (29 planned, 121 attacks).

- `PROOF_RESULT.md:9`: "On the latest built design (design 7), all 133 changes written before it, the 29 planned ones and every attack of rounds 1 to 7, were run again: the tool told exactly whom the method's rules say on all 133, and no user that needed a change went untold and unstopped."
- The other 17 are round 8, written blind against design 7. `PROOF_RESULT.md:107` gives its row: 17 changes, 8 holes, 7 false refusal lines. `results/history.json` records that the tool matched the rules on 7 of those 17, so on 140 of 150 in all.
- `PROOF_RESULT.md:11`: "The holes found, design 1 to design 7: **5, 8, 15, 6, 7, 10, 8**. There is no downward trend."
- `PROOF_RESULT.md:9`: "the tool sent 182 notices where the old rule (tell every module that declares the provider) sends 474, and 111 of the tool's notices were for nothing against 376 of the old rule's".

**What the proof says was not proven** (`PROOF_RESULT.md:275-282`, each a quotation):

- "**The made-up modules are not the real product.**"
- "**No real job wrote these comments.** I wrote the product, its comments and its tests knowing the tool."
- "**Each design was built knowing the attacks it was then run on.**"
- "**'Needed a change' is one reader's judgement** (mine). The failing tests are measured."
- "**What a told job does was not run.** No user's job was started on a notice."
- "**Design 8 was not built or run.** Rule 52's effect and rule 53's cost on the real product are unproven."
- "**One version of the reader** (TypeScript 5.6.3) and of Node were used."

Two more facts bear on what BT2 and BT5 take from it:

- Design 7 includes 23 refusals beyond the two the owner approved. `PROOF_RESULT.md:130`: "Bob has approved only the two refusals of the brief ... and has said no new tests or checks." The result on the 133 changes was measured with those 23 in the tool.
- Design 8 is what was recommended (`PROOF_RESULT.md:17`): "The notice part of design 7 with one change to how it compares interfaces (TypeScript's own type checker must confirm every 'accepts more'), and, beside it, the test run above. This is described below as design 8; it is **not built and not run**."

## 2. The proof's actual forms

**A structured comment** is a JSDoc block. `product/money/src/index.mjs:20-27`:

```js
/**
 * Makes an amount, refusing one outside its bound.
 * @param {number} cents
 * @param {Currency} currency
 * @returns {Amount}
 * @throws {RangeError} when cents is outside its bound or the currency is not one of CURRENCIES
 */
export function amount(cents, currency) {
```

The kinds of error an entry raises are part of the comment (`@throws {Kind}`) and of the listing. Code that builds or checks a value crossing the interface says so with a plain `@type` on that value, the words after it being for people: `/** @type {Amount} builds an Amount */` (`money/src/index.mjs:32`), `/** @type {MeterInput} checks a MeterInput below */` (`meter/src/worker.mjs:17`). A kind of another module is brought in with `/** @import { Amount } from '../../money/src/index.mjs' */`.

**A bound** is a JSDoc tag, `@bound`, inside the block of the kind or function it limits. `product/money/src/index.mjs:10-16`:

```js
/**
 * An amount of money.
 * @typedef {Object} Amount
 * @property {number} cents the amount in whole cents
 * @property {Currency} currency
 * @bound cents: whole number, 0 to 10,000,000 inclusive
 */
```

- It carries no kind name; the block it stands in says whose it is. On a function it is the same tag: `@bound parts: whole number, 1 to 100` (`money/src/index.mjs:63`).
- It is read "from the comment as written, up to the next tag" with "whitespace made single" (`tool/lib/ts.mjs:107-108`), so it may run over more than one line.
- In a kind of plain data the tool does not split bound lines by field: every bound line of the kind goes wherever the kind goes. Only in an operations table or a handle kind does a line belong to one member, and then only when it starts `member.`: `@bound bookquote.total: what the whole stay costs, ...` (`bookings/src/index.mjs:59`; the rule is `tool/lib/listing.mjs:14-23`).
- In design 7 every bound line also has a test named `bound <the line's words>` (`money/test/index.test.mjs:5`), and a change to what that test checks counts as a changed bound (`tool/lib/notice.mjs:188-207`). The half of this rule that refuses a missing test is one of the 23 refusals not approved.

**An operations table** is one kind per provider, marked `@optable`, whose members are the operation names, each a pair `req` and `res`. `product/bookings/src/index.mjs:50-60`:

```js
/**
 * The operations bookings answers by name through the door.
 * @typedef {{
 *   bookopen: {req: BookingRequest, res: Booking},
 *   ...
 *   bookquote: {req: {room: string, party: number, nights: number}, res: {total: Amount}}
 * }} BookingOps
 * @optable
 * @bound bookquote.total: what the whole stay costs, for the whole party and every night
 */
```

The table is found by the mark, not by its name. There is no exported table value. The functions that answer are a separate kind written from the table (`BookingHandlers`, line 64) and a function that hands them out.

**How calls by name are followed.** The gathered list is a kind written in the source of the shared piece, which stands after the providers in the module order and declares them. `product/door/src/index.mjs:5-6, 8-11, 18-24`:

```js
/** @import { BookingOps } from '../../bookings/src/index.mjs' */
/** @import { RoomOps } from '../../rooms/src/index.mjs' */
/**
 * @typedef {BookingOps & RoomOps} AllOps
 */
/**
 * @typedef {Object} Door
 * @property {<K extends keyof AllOps>(op: K, body: AllOps[K]['req']) => Promise<AllOps[K]['res']>} call calls an operation by name with a body
 * @property {<K extends keyof AllOps>(line: `op=${K}&${string}`) => Promise<AllOps[K]['res']>} get calls an operation written as a request line, ...
 * @carriesop call get
 */
```

The mark `@carriesop <members>` on the handle's kind (or on a function) names what carries a call by name (`tool/lib/carriers.mjs:24-30`). At each call through a carrier the tool reads the name from the first argument: a piece of text written out, a choice of such texts, or a request line beginning `op=<name>&` (`carriers.mjs:50-70`). `deps.door.call('bookquote', {...})` in billing is then a use of bookings' entry `op:bookquote` (`tool/lib/usage.mjs:179-188`). A name the tool cannot read is recorded as such (section "cannot follow" below). Shared tables are followed the same way, with `@storedrows <table>` on the kind of the rows and `@carriestable get list put remove` on the store's handle (`bookings/src/index.mjs:28`, `store/src/index.mjs:24`).

**An interface listing** is an object held in memory, one item for each entry; `listing <product folder> <module>` prints it as text or, with `--json`, as JSON (`tool/p3tool.mjs:3, 22-33`). It is made from the reader's own checker over the module's interface files, the files `modules.json` names as `public` (`tool/lib/listing.mjs:70-75`; `product/modules.json:4-14`). Output of `listing product money`, first and fifth entries (my run):

```
Listing of money
  kind Amount   [money/src/index.mjs:12]
      accepts: { cents: number; currency: "EUR" | "GBP" | "USD" }
      hands back: { cents: number; currency: "EUR" | "GBP" | "USD" }
      bound: cents: whole number, 0 to 10,000,000 inclusive
  function amount   [money/src/index.mjs:27]
      accepts: (arg0: number, arg1: "EUR" | "GBP" | "USD")
      hands back: { cents: number; currency: "EUR" | "GBP" | "USD" }
      bound: cents: whole number, 0 to 10,000,000 inclusive
      throws: RangeError
```

- An entry is named by its name within the module. Beside exports there are: each member of a handle kind (`Bookings.open`), each member of a class (`Name.x` static, `Name#x` otherwise), each operation (`op:bookquote`), each shared table (`table:bookings`) (`listing.mjs:94, 112, 144, 165-166`; `PROOF_RESULT.md:238`).
- An entry's sort is one of: function, value, kind, handle kind, method, class, class member, operation table, operation, stored rows.
- A kind of plain data is written out in full wherever it appears, with its bound lines; a handle kind is written by name (`handle bookings.Bookings`) (`tool/lib/canon.mjs:1-9`). Arguments are `arg0`, `arg1`: their names are not in what is compared (`listing.mjs:180`), though their places are kept apart (`paramNames`, line 27).
- A plain constant's single value is widened to its kind: "content, not a kind" (`listing.mjs:199-203`).
- Each entry also keeps the reader's printed declaration of it, comments removed, as a backstop (`listing.mjs:287-302`; `ts.mjs:41-102`).
- The listing names no commit and no reader. The notice's first line names the reader: `Notice for a change to money (TypeScript 5.6.3)`.

**How two listings are compared** (`tool/lib/notice.mjs:31-115`). `notice <product before> <product after> <module that changed>` reads both folders whole, with the same tool and reader, and compares the listing of the provider and of every later module in the order, entry by entry, as objects and not as text. For each entry that differs it gives one or more of these words:

| Word | Tells |
|---|---|
| `removed` (an entry gone, or a name lost from a handle or table) | users |
| `new entry` | nobody |
| `accepts more` | nobody, except a user that hands the function on as a value |
| `cannot stand in` (removed or renamed, newly required, newly refused: one word for all three) | users |
| `hands back differently` (also: error kinds, a message's channel, a member that may now be missing) | users |
| `bound changed`; `bound test changed` | users |
| `parameters moved` | users |
| `declaration changed (not classified)` (the tool's comparison found nothing, the printed declaration differs) | users |
| `kind renamed, shape unchanged` | users that write the name |
| `<module> now answers the same name` | users of that operation |

A later module whose own files did not change but whose listing did, because it passes on a kind of the provider, is "changed through" the provider, and its users are told too (`notice.mjs:174-187`). From my run of change P07:

```
  bookings BookingRequest: accepts more -> tells nobody
      accepts before: { day: string; nights: number; note?: string; party: number; room: string }
      accepts after:  { arrival?: "afternoon" | "evening" | "morning"; day: string; nights: number; note?: string; party: number; room: string }
```

With no difference the notice says `The listing before and after is the same. Nobody is told.` (`notice.mjs:262`).

**"Accepts more"** in the proven design is the tool's own comparison of the two written-out kinds, `standsIn` (`tool/lib/canon.mjs:202-252`): "True when everything the old one accepted is still accepted the same way: nothing removed or renamed, nothing newly required, nothing newly refused." A new kind of "anything" or "unknown" counts as accepting more (line 210). For "functions handed in, handles, library kinds, generics: only the same thing stands in" (line 249). TypeScript's type checker is not asked. That it should be is rule 52 of design 8 (`notes/iteration-8-design.md:13`), described and not built.

**How users are found** (`tool/lib/usage.mjs`; `notice.mjs:223-259`). `PROOF_RESULT.md:242`: "**Who is a user**: every later module, declared or not; uses are read from the user's source and tests as they stood before the change." Every name, member read, member filled in an object, and member taken apart in the user's files is resolved by the reader to a declaration, and the declaration to the smallest listed entry that holds it. A value handed where a provider's kind is expected uses the members it fills (`usage.mjs:128-145`). Each use is kept as `file:line`; the notice prints at most six for an entry (`notice.mjs:245`). From my run of P12:

```
  TOLD front
      uses money Amount (bound changed) at front/src/index.mjs:46
```

**When it cannot follow.** `PROOF_RESULT.md:243`: "**Not followed fully**: a user that reads or calls a value of unknown kind, or calls by a name the tool cannot read; it is told whenever the provider's listing changes at all." In the code (`notice.mjs:247-255`) this applies to a provider the user declares, and has four causes: the user declares the provider and no use is found; it reads or calls a value of unknown kind anywhere in its files, unless that value comes from outside the product; it calls by a name the tool cannot read and the provider has operations; it names a table the tool cannot read and the provider has tables. The made-up case is `@param {*} source` (`product/reports/src/index.mjs:9`). From my run of P07, a change that told no other user:

```
  TOLD reports
      not followed fully for bookings: reads or calls values of unknown kind: reports/src/index.mjs:13 source.list('rooms').map; reports/src/index.mjs:13 source.list('rooms'); reports/src/index.mjs:13 source.list (+9)
```

`PROOF_RESULT.md:213`: 54 of design 7's 111 notices for nothing went to this one module.

**A module with no comments yet.** A module "has interface comments" when any source file holds a JSDoc tag that states a kind (`listing.mjs:7-10`). For one that has none, a change that leaves its running code the same sends nothing; any other change tells every user (`notice.mjs:155-172`).

## 3. Every difference found

"To match" says what the build text would have to say for its form to be the proof's. It is not a recommendation. Rows marked (R) rest on one of the 23 refusals of design 7 that the owner has not approved; the form ran, but only with that refusal in the tool.

| # | Build text's words | The proof's form | To match |
|---|---|---|---|
| 1 | BT2:105 "Every exported function, every public method of an exported class and every exported value has a block"; BT2:166 the listing is made from "every source file under the module's `files`" | Entries come from the module's named interface files only (`product/modules.json:4-14`, field `public`; `tool/lib/listing.mjs:70-75`). Members of handle kinds, class members, operations and shared tables are entries of their own (`PROOF_RESULT.md:238`). (R: that a user imports only interface files is rule 28.) | A module names its interface files; the listing is of those files' exports, with the further entries named. BT2's four-field entry (BT2:55-63) has no place for this |
| 2 | BT2:112, 128 the bound is `[bound <Kind>.<field>: <words>]` | A JSDoc tag `@bound <words>` in the block of the kind or function (`money/src/index.mjs:15, 63`; `PROOF_RESULT.md:34`) | The mark is the tag `@bound`; no kind name is written |
| 3 | BT2:128 "It is never wrapped onto a second line" | Read "up to the next tag", whitespace made single (`tool/lib/ts.mjs:107-125`) | A bound runs to the next tag or the block's end and may wrap |
| 4 | BT2:128 the line names one field, `<Kind>.<field>` | In plain data, every bound line of a kind goes with the kind, not with a field. Only in an operations table or handle kind, a line starting `member.` is that member's; any other is every member's (`listing.mjs:14-23`) | Say that; drop the field as part of the mark |
| 5 | BT2:132-140 a check says so by `@returns {v is PriceArgs}`, a build by `@type` | Both by a plain `@type {Kind}` on the value (`money/src/index.mjs:32`; `rooms/src/index.mjs:74`; `meter/src/worker.mjs:17`). No `v is` form was found in the product | One form, `@type` on the value built or checked |
| 6 | BT2:144-153 one kind named `<Module>Ops` with a row `name: (args) => answer`, and one exported frozen value `OPS` | One kind of any name, marked `@optable`, rows `name: {req: ..., res: ...}`; no table value; handlers are a separate kind (`bookings/src/index.mjs:50-65`; `listing.mjs:85-106`) | The table is a kind marked `@optable` with `req` and `res` for each name |
| 7 | BT2:155 "the list is not a file in the repository"; the tool writes `ProductOps` in its working folder | A committed kind in the shared piece's own source, `@typedef {BookingOps & RoomOps} AllOps`, with an `@import` of each provider's table (`door/src/index.mjs:5-11`). The shared piece stands after the providers in the order and declares them (`modules.json:10`) | The gathered list is a kind in the shared piece's source; the shared piece comes after the providers it carries to |
| 8 | BT2:158 one `@type` comment on the exported carrying function | A mark `@carriesop <members>` on the handle's kind or on a function; the tool reads the name from the call's first argument, a text or a request line `op=<name>&...` (`door/src/index.mjs:21-23`; `tool/lib/carriers.mjs:24-30, 50-70`) | The tie is the mark `@carriesop`, with the carrying member written over the gathered list |
| 9 | BT2:162 an operation name is the only one of that name, "a rule ARCH applies" | The tool tells that operation's users when a second module starts to answer the name (`tool/lib/notice.mjs:208-220`) | Say the tool tells them |
| 10 | BT2:166 written "from the reader's declaration output" | Written from the reader's checker, each kind put into the tool's own ordered form (`tool/lib/canon.mjs`). The declaration output is kept for each entry only as a backstop (`listing.mjs:287-302`) | The listing is made from the checker; the printed declaration is the backstop |
| 11 | BT2:166 "for one module at one commit"; BT2:171 first line `listing pricing a1b2c3d reader typescript 5.6.3` | Made from a product folder; a change is two folders (`tool/p3tool.mjs:3-4`; `PROOF_RESULT.md:247` "Changes are file overlays ... not commits"). No commit or reader on the listing; the reader is named on the notice (`notice.mjs:150`) | The commands take two folders; the tool or its caller makes them from two commits |
| 12 | BT2:168-183 "A listing is plain text", sorted lines of `file entry sort rest` | An object for each entry, with `kind`, `accepts`, `handsBack`, `bounds`, `throws`, `channel`, `optional`, `side`, `paramNames`, `decl`; printed as in section 2 (`p3tool.mjs:22-33`) | The listing is an object for each entry; the text is a printing of it |
| 13 | BT2:168 an entry is "an exported name of one file"; every line starts with the file | An entry is named by its name within the module; also `Kind.member`, `Class.x`, `Class#x`, `op:<name>`, `table:<name>`. The file and line are shown beside it, not compared | Name entries so |
| 14 | BT2:174-183 a kind is shown by name (`priceOf accepts args required PriceArgs`), its fields on the kind's own entry | Plain data is written out in full wherever it appears, fields in name order; a handle kind by name (`canon.mjs:1-9, 84`) | Say plain data is written out in every entry that accepts it or hands it back |
| 15 | BT2:173-176 a `bound` line stands on the kind's entry | A kind's bound lines are carried into every entry that writes the kind out, "without the kind's name, so that renaming a kind does not look like a changed bound" (`listing.mjs:35-43`) | Say bound lines travel with the kind into each entry |
| 16 | BT2:179 the argument's name is on the `accepts` line; BT2:193 "its name changed" tells the users | An argument's name is not compared; a renamed argument tells nobody. An old name found at another place tells: `parameters moved` (`listing.mjs:27, 180`; `notice.mjs:94`). A renamed field does tell (`cannot stand in`) | Arguments are compared by place; only fields by name |
| 17 | BT2:183 the sorts hold no errors | `@throws {Kind}` kinds are in the listing; a change is `hands back differently` (`listing.mjs:189-197`; `notice.mjs:92`) | Add the kinds of error to what an entry hands back |
| 18 | BT2:183 `value` is "an exported value's kind" | A plain constant's single value is widened to number or text unless its comment states a kind (`listing.mjs:199-203`) | Say a constant's value is content |
| 19 | BT2:183 no sort for a member that may be missing, a message, or a shared table; BT2:281 "no form is given" for messages | `optional` on a member (`listing.mjs:124-126`); `@message stdin` or `stdout` on a kind, its channel in the listing (`meter/src/index.mjs:18, 27`); `@storedrows <table>` and `@carriestable` (`bookings/src/index.mjs:28`; `store/src/index.mjs:24`). (R: the refusals that hold messages and rows to these marks.) | Name these three parts of an entry and their marks |
| 20 | BT2:166, 185 one module's two listings are compared | The provider's and every later module's are compared; a later module "changed through" the provider has its users told (`notice.mjs:174-187`) | Both listings are made for the provider and every module after it |
| 21 | BT2:185 "Identical text: nobody is told" | A test named for a bound whose checks changed while its line did not counts as `bound test changed` and tells (`notice.mjs:188-207`). (R: rule 4 needs every bound to have such a test.) | Either say this, or say on purpose that it is left out |
| 22 | BT2:189 "A rename is a removal and an addition" | True for a function. A kind renamed with its shape unchanged tells only the users that write its name, and its members are still compared (`notice.mjs:35-58`) | Say the exception for a renamed kind |
| 23 | BT2:193-196 the words "Removed or renamed", "Newly required", "newly refused"; BT5:134 "`change` is one of removed, hands back, bound, newly required, newly refused" | The words in section 2's table. The three on the accepting side are one word, `cannot stand in`; the tool does not say which (`notice.mjs:23, 88`) | Use the proof's words, or say the three are not told apart |
| 24 | BT2:195-198 accepts more "if the checker agrees"; "It writes a two-line file" | The tool's own comparison, `standsIn` (`canon.mjs:202-252`). The checker is not asked. Rule 52 as described has both interfaces read "in one program"; a function's new form must be assignable to the old, and what a user hands in the old to the new; "or the tool cannot find the entry to ask about" tells (`notes/iteration-8-design.md:13`) | Nothing proven to match. To match the description: state both directions and the "cannot find" case |
| 25 | BT2:198 "a kind the checker calls 'anything': the entry's users are told" | A new kind of anything or unknown counts as accepting more; nobody told (`canon.mjs:210`) | The proven form is the opposite; rule 52 does not speak of it |
| 26 | BT2:195 a new optional line tells nobody | A user that hands the function or method on as a value, not calling it, is told (`notice.mjs:241`; `usage.mjs:115-126`) | Add the exception |
| 27 | BT2:185-196 no backstop | Where the tool's comparison finds nothing and the entry's printed declaration differs, the users are told: `declaration changed (not classified)` (`notice.mjs:97-103`) | Add the backstop |
| 28 | BT2:200 users are "the modules whose code or comments name it"; BT5:149 a use is where "a name ... resolves" | Every later module, declared or not. Also counted: a member filled or taken apart, a value handed where a provider's kind is expected, objects merged with `...`. A use of an undeclared provider is noted on the notice (`usage.mjs:86-212`; `notice.mjs:284`) | Widen the definition of a use to these |
| 29 | BT5:129 `places` is the list of places | The notice prints at most six places for an entry (`notice.mjs:241, 245`) | The whole list is not in the proof's notice; the tool holds it (`usage.mjs:98`) |
| 30 | BT2:200, BT5:151 a user not followed "is a user of every entry" | It is told "whenever the provider's listing changes at all", so also for a new entry or an accepts-more that tells no other user (P07, P21) (`notice.mjs:247-255`; `PROOF_RESULT.md:243`) | Say it is told on any change to the listing |
| 31 | BT5:153-156 four cases: a file the reader cannot read; an import path worked out at run time; `import * as` handed on or indexed; a call by name not written out | Four causes, for a declared provider: no use found; a value of unknown kind read or called; a call by a name the tool cannot read; a table name it cannot read (`notice.mjs:250-253`; `usage.mjs:183, 186, 198-204`). Only the call by name is in both. BT5's first three were not in the proof. BT5:158 gives the value of unknown kind as a use that "is missed"; in the proof it is the main cause | Replace the four cases with the proof's four |
| 32 | D7:82 a declared use that no code makes "receives no notice"; BT5:149 takes uses from code alone | Such a user is not followed and is told: "declares <provider> but no use of it is found in its code" (`notice.mjs:250`) | The proof does the opposite of D7:82 |
| 33 | BT5:151 prints `cannot follow <U>: <which>, <file>:<line>` and writes `"places": ["everything"]` | Under `TOLD <user>`: `not followed fully for <provider>: <why>; <why>`. In JSON a reason is `{ module, notFollowed: [...], through }`, with no places (`notice.mjs:254, 281`) | Use the proof's line and its reason object |

Thirty-three differences. In four places the two agree: both listings of a comparison are made together by one tool and reader (BT2:166; `notice.mjs:146`); an entry only in the new listing tells nobody; a changed bound or a change to what is handed back tells; and a kind that is handed back anywhere is treated as handed back (BT2:199; `listing.mjs:208-218`, where a kind is "accepts", "handsBack" or "both" by where the module's own entries use it).

## 4. What the build texts describe that the proof does not have

1. **Following inside a module to pick related tests** (BT5 section 7: pieces, calls, "reaches", the related list, losing the thread). The proof holds nothing of it. The tool has no command that reads a test file's calls; the uses it keeps are places in a user's files, and nothing leads from a place to a test. `PROOF_RESULT.md:279`: "No user's job was started on a notice." D7:80 already says so.
2. **The type checker confirming "accepts more"** (BT2:198; D7 section 7, decision 7). Described as rule 52, not built, not run.
3. **The listing as sorted plain lines** compared by eye or by text (BT2:168-183, 201). The proof compares objects.
4. **The tool-written `ProductOps`** and the one `@type` comment on a carrying function (BT2:155-162).
5. **The bracket mark on one unwrapped line** (BT2:128-130). That came from the study's trial, not the proof.
6. **`@returns {v is Kind}`** for code that checks (BT2:135).
7. **The job block's `uses`** with `entry`, `change`, `was`, `now`, `places` (BT5:121-134). The proof's notice holds the same matter in another shape (`report.entries` with `before` and `after`, and `told` with `reasons`), and nothing in the proof writes or reads a job block.
8. **Listings made from commits**, a listing naming its commit, and a reader version read from a process config (BT2:166, 171, 221).
9. **`cannot follow` cases 1 to 3 of BT5:153-155**: an unreadable file, an import path worked out at run time, a whole file taken under one name.
10. **Any use on a real product, or by a job.** The comments, product and tests were written by the session that wrote the tool.

The other way round, the proof holds these that neither build text gives a form for: the comments-only first step and how the tool tells it (`tool/lib/check.mjs:770-796`; `notice.mjs:155-172`); the reader's settings (`ts.mjs:8-32`: strict, the 2023 language library, and a hand-written description of the parts of Node the product uses, `tool/lib/node.d.ts`); a helper for other modules' tests listed as an interface file under `src/` (`store/src/testing.mjs`, which answers BT2:280); the `check` command with the two approved refusals and the 23 others; and `tool/audit.mjs`.

## 5. The recorded changes, and what it would take to make them tests of a new tool

**The form.**

- **A change** is a folder `changes/<series>/<id>/` holding `change.json`, `change.diff` and `files/`. `change.json` has `title`, `provider` and `covers` (all 150), and sometimes `before` (44) and `note` (67). Example, `changes/planned/P12-bound-line-changed/change.json`:
  ```json
  { "title": "An amount may now be at most 500,000 cents (code and bound line both changed)",
    "provider": "money", "covers": ["bound line changed"] }
  ```
- `files/` holds every file the change writes, whole, at its path in the product. `change.diff` is the same change as a readable difference and is not used by the runner.
- `before` lists other changes whose files stand first. Many are in `changes/setups/` (45 folders): states of the product a change needs, such as a user that already disagrees.
- The runner copies `product/`, lays the `before` files over it, copies that, and lays the change's files over the copy: two folders, before and after (`proof/trees.mjs:43-55`).
- **The series:** planned 29, adversarial 12, adversarial-independent 10, round3 13, round4 21, round5 15, round6 17, round7 16, round8 17.

**The recorded answers** are kept apart from the changes, one set for each design: `changes/<series>-expected.json` for design 1 and `changes/iter<N>/<series>-expected.json` for designs 2 to 7.

- **Expected**, written before the design was run. For each change: `told` (the users the rules say are told), `why`, `brokenPredicted`, `wrongWithoutFailingTest`, `refuses` (modules whose check should refuse); sometimes `guard`, `refusesBefore`, `attack`, `realistic`.
- **Reading**, written after: `needs` (users that truly needed a change, one reader's judgement), sometimes `note`, `guard`, `throughOnly`, `falseRefusals`.
- **Results**, `results/iter<N>/<series>/<id>.json`: `tool` (the notice's `entries`, `told`, `toldDetail`, `notTold`, the `checks` of the provider and every later module), `groundTruth` (every later module's tests before and after, and which broke), `timing`. A summary and a table for each series; `results/history.json` for all.

The answer names users only. Which entry and which places are in the results, not in the expected answers.

**What would be needed.**

1. **A product the new tool can read.** The made-up product and all 195 overlay folders are written in the proof's forms (`@bound`, `@optable`, `@carriesop`, `AllOps`, `modules.json` with `id`, `public`, `uses`). A tool built to BT2's forms as they stand cannot read them. Either the tool takes the proof's forms (section 3), or the product and every whole-file overlay are rewritten, which is no longer the recorded change.
2. **Two folders and a provider's name** as the tool's input, or a step that turns each change into two commits. `proof/trees.mjs` makes the folders as it stands.
3. **A choice of which recorded answer is the test.** The design-7 `told` lists are what was shown: the tool gave them on 140 of 150. For the ten of round 8 where the tool differed, the expected answer and the tool's answer are both on record and they disagree.
4. **The answers that rest on rules the design does not take.** Design 7's answers were made with the 23 refusals, the bound-test rule and the tool's own "accepts more". A tool without the refusals, or with the type checker deciding "accepts more", will give other answers on some changes: `refuses` will not apply at all, and some `told` lists will change. `PROOF_RESULT.md:205` says how: "A recorded answer changes only on purpose, with the reason written down". Which changes those are was not worked out here.
5. **The same reader and Node**, TypeScript 5.6.3 on Node 22, for the answers to be comparable; and `node --test` for the product's own tests if "which users broke" is to be measured again.
6. **Nothing for following inside a module.** The 150 changes record who is told. They hold no answer about which test files relate, so they cannot test BT5 section 7.

## 6. What could not be read or determined

1. **The order of the proof's commits.** `PROOF_RESULT.md:64` says expected answers were committed before results. The clone is shallow and shows one commit, so this could not be seen.
2. **The notes for designs 3 to 6** were not opened, and `check.mjs` was sampled. A difference that lives only there is not in section 3. The check is outside BT2 sections 5 to 6 and BT5 sections 6 to 7.
3. **Which 28 rules "change who is told".** `PROOF_RESULT.md:186` counts 23 refusals and 28 others, and design 8 keeps the 28. Rule 4 (bound tests) is marked a refusal, yet its other half changes who is told, and five kept rules (15, 26, 32, 42, 51) build on it. Whether design 8 keeps the bound-test comparison is not said.
4. **Whether the 133 would still be answered rightly without the 23 refusals.** Not measured by the proof and not by me. On design 7, 31 users were "stopped at the provider by a check rather than told" (`PROOF_RESULT.md:190`).
5. **Whether `v is Kind` works with the proof's tool.** It was not in the product; I did not try it.
6. **The full rerun.** `npm run proof` (7 minutes by the report) was not run. The 86 tool tests and two notices were, and agreed with the record.
7. **Why each of the ten round-8 answers differs.** `results/iter7/round8-independent-summary.json` marks five of the ten as holes (T02, T04, T06, T07, T08) and five as held with the tool telling other users than expected (T09 to T12, T17); the other three of the 8 holes are among the seven where the tool matched the rules. The changes themselves were not read one by one.
