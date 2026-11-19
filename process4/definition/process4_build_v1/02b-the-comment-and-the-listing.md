Length: 125 lines. Last section: "6. An interface listing".

# Process4 build text 2b: the structured comment and the interface listing

Sections 5 and 6 of build text 2, moved here on 19 Nov 2026 so that each file stays under 24,000 bytes; their numbers are kept. Sections 1 to 4 and 7 to 9 are in `02-the-forms.md`, whose section 1 says what was proven and names the proof; "proof:" paths below are in its folder. **Status: proposed. Nothing here has run.** It adds no check, gate, review or stop.

Marks: **Decided here:** a choice made in this text, with what it gives and what it costs. **Unproven:** never shown to work in this form. Every example is made up: a product in plain JavaScript with modules `dates`, `pricing` and `orders`.

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

These are the proof's forms (proof: `tool/p3tool.mjs`, `tool/lib/listing.mjs`, `canon.mjs`, `notice.mjs`). The tool makes a listing from the reader's own checker over the module's **interface files**, the files its entry names in `public` (build text 2, section 3), as the proof's `product/modules.json` does. The proven commands are `listing <product folder> <module>` and `notice <product before> <product after> <module that changed>`: two folders, read at the same moment by one tool and reader. **Unproven:** the tool making the two folders from two commits, and taking the reader's version from the process config.

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
