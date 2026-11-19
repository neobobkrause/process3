Length: 93 lines. Last section: "6. What I am not sure of".

# Build texts 2 and 5 corrected to the notice proof's forms

Written by Claude on 19 Nov 2026. A report of edits to two files; nothing was committed or pushed. It adds no test, check, gate, review, refusal or stop.

Short names: **BT2** is `process4/definition/process4_build_v1/02-the-forms.md`; **BT5** is `05-the-records-and-following.md` beside it; **D7** is `process4/definition/process4_definition_v7/02-modules-jobs-tests-and-the-notice.md`; "the comparison" is `notice_proof_forms_compared.md` in this folder. Proof paths are under `notice-proof/` on `origin/notice-proof` of `neobobkrause/process3-probes`, read only.

## 1. What was read and what was changed

Read in full: the comparison (288 lines), BT2 (283 lines before), BT5 (186 before), D7 (109). Opened in the proof, in part: `PROOF_RESULT.md` (lines 1-20, 128-131, 137, 161, 186-190, 234-248), `product/modules.json` (whole), `product/door/src/index.mjs` (1-30), `tool/p3tool.mjs` (1-45), `tool/lib/listing.mjs` (1-45, 68-115, 280-302), `tool/lib/notice.mjs` (14-115, 140-288), `notes/iteration-8-design.md` (rule 52). Everything else about the proof is taken from the comparison, not from the proof itself. The proof's tool was not run by me.

Changed in BT2: its first line, and sections 1, 5, 6 and 9. Sections 2, 3, 4, 7, 8 and the opening two paragraphs are untouched.
Changed in BT5: its first line; section 5 (the job block's example and the bullets on `uses`); section 6 (rewritten); section 7, one line (losing the thread, item 3: `"places": ["everything"]` became "a `notFollowed` reason"); section 8, item 3. Sections 1 to 4 are untouched.

## 2. The 33 rows

1. Applied without its refusal. BT2 section 6 says the listing is of the module's interface files, with the further entries named. The refusal (a module imports only interface files, rule 28) is not written; BT2 section 5 and BT5 section 6 say the form without it is unproven. BT2 section 3's entry still has four fields and no place for interface files (section 5 below).
2. Applied. The mark is the tag `@bound`.
3. Applied. A bound runs to the next tag and may wrap.
4. Applied. Bound lines go with the kind; `member.` only in an operations table or handle kind.
5. Applied. One form, `@type {Kind}` on the value; `v is` is gone.
6. Applied. The table is a kind marked `@optable` with `req` and `res`; no `OPS` value.
7. Applied. The gathered list is a kind (`AllOps`) in the shared piece's source. The example needs a fourth made-up module, `door`, which section 3's order file does not show.
8. Applied. The tie is `@carriesop`.
9. Applied. The tool tells the operation's users when a second module answers the name.
10. Applied. The listing is made from the checker; the printed declaration is the backstop.
11. Applied. The proven commands take two folders; making them from two commits is marked unproven.
12. Applied. The listing is an object for each entry; the text is a printing.
13. Applied. Entries are named within the module, with `Kind.member`, `Name.x`, `Name#x`, `op:`, `table:`.
14. Applied. Plain data is written out in every entry.
15. Applied. Bound lines travel with the kind, without its name.
16. Applied. Arguments by place; `parameters moved`; a renamed field is `cannot stand in`.
17. Applied. `@throws` kinds are in the listing; a change is `hands back differently`.
18. Applied. A constant's value is content.
19. Applied without its refusal. `optional`, `@message`, `@storedrows`, `@carriestable` are given; the refusals that hold messages and rows to their marks are not written, and the forms without them are said to be unproven.
20. Applied. Both listings are made for the provider and every later module; "changed through".
21. Not applied. `bound test changed` tells where the two listings are the same, which D7 line 70 does not allow, and it rests on a refusal (rule 4). BT2 section 6 states what the proven tool did and that it is not taken.
22. Applied. A renamed kind with its shape unchanged tells users that write the name.
23. Applied, in BT2 section 6 and BT5 section 5. The proof's words are used; the three on the accepting side are `cannot stand in`.
24. Applied as rule 2 of the task directs. The design's rule is kept (the type checker confirms), said to be design 8, described and not built, with both directions and the "cannot find the entry" case; the proven tool's own comparison (`standsIn`) is stated.
25. Applied. BT2's "a kind the checker calls anything: users are told" is removed; the proven tool's opposite is stated. Rule 52 does not speak of it.
26. Not applied. The proven tool told, on accepts-more, a user that hands the function on as a value. D7 line 69 says accepting more tells no one. BT2 states what the proven tool did and keeps the design's rule.
27. Applied. `declaration changed (not classified)` is in the table.
28. Applied. BT5 section 6: every later module, declared or not; the wider list of uses; the note of an undeclared use.
29. Applied, as a statement. BT5 section 5 says the proof's notice kept the first six lines for an entry; the job block keeps the whole list as a "Decided here", marked unproven, because section 7 needs every place.
30. Applied. Told on any change to the listing (BT2 section 6, BT5 section 6). D7 decision 2 now says the same.
31. Applied. BT5's four cases are replaced by the proof's four causes.
32. Applied. Cause 1 is the declared use that no code makes; D7 line 82 now says the same.
33. Applied. The proof's `not followed fully for <provider>: <why>` line and its reason object; `"places": ["everything"]` is gone from BT5 sections 5, 6 and 7.

Totals: 29 applied; 2 applied without their refusal (rows 1, 19); 2 not applied (rows 21, 26).

## 3. Final sizes

| File | Lines | Bytes | Before |
|---|---|---|---|
| BT2 | 296 | 23,862 | 283 lines, 22,918 bytes |
| BT5 | 204 | 17,000 | 186 lines, 14,838 bytes |

Both are under 24,000 bytes by `wc -c`. BT2 has 138 bytes to spare. To fit, BT2 section 1 lost the study's detail (the trial's forms, the 178 recorded changes, the 22 commented users) and most of the paragraph on the process before this one.

## 4. Contradictions with the design, not resolved

1. **A function handed on as a value (row 26).** The proven tool tells such a user on accepts-more. D7 line 69: "Accepting more tells no one." Yet D7 line 80 takes "the notice part of design 7" with one change, and this rule is part of design 7. The design's two lines pull apart. BT2 keeps line 69.
2. **A changed bound test (row 21).** The proven tool tells when a test named for a bound changes and the listing does not. D7 line 70: "The notice is sent only when the two listings differ." It also needs the unapproved refusal that every bound has such a test. Design 7's "notice part" includes the telling half (the comparison's section 6, item 3, could not say whether design 8 keeps it). BT2 keeps line 70.

Not contradictions, but beyond what D7 says, and written into the build texts as the proof's form:

3. **Later modules "changed through" a provider, and a second module answering an operation's name (rows 20, 9).** D7 line 70 speaks of one module's listing before and after. The proof compares every later module's listing too. In both cases some listing does differ, so I took them as within the design.
4. **Interface files (row 1).** D7 says the interface is written out "from its code and its structured comments". The proof reads only the files the module list names. Neither D7 nor BT2 section 3 gives the module list such a field.
5. **"Anything" as accepting more (row 25).** The proven tool counts it so. The design asks the type checker; I did not try what the checker says, and rule 52 is silent.
6. **A module with no comments whose first change is not comments only.** The proven tool tells every user (`tool/lib/notice.mjs:155-172`). D7 line 73 covers only the comments-only step. This is not a row of the table and is not in either build text.

## 5. Other texts that now disagree (not edited)

Searched `process4/definition/process4_build_v1/` for `[bound `, `ProductOps`, `OPS`, `"places"`, `cannot follow`, and for the notice's other words. The first four no longer appear anywhere in the folder.

- `01-the-tool-and-the-required-run.md:69`: `listing <module> [--at <commit>]`. The proven command is `listing <product folder> <module>`; a listing from a commit is unproven.
- `01-the-tool-and-the-required-run.md:70`: `notify` "makes the module's listing" (the proof: the provider's and every later module's); prints `no notice` (the proof: `The listing before and after is the same. Nobody is told.`); finds "the places in their files that name it" (the proof's uses are wider); "a user it cannot follow counts as using everything" (now: told on any change to the listing).
- `01-the-tool-and-the-required-run.md:33`: the module list is "name ... order, code paths, test paths and declared uses", with no interface files.
- `04-the-trial.md:30`, `:86`, `:132`: stage 4 "cannot start until the owner has given a session the repository that holds the notice's proof", and "Where those forms differ from build texts 2 and 5, they win". The repository is now readable and the forms are in the build texts.
- `04-the-trial.md:88`: "the recorded changes of the notice's proof as the tool's tests". The recorded answers were made with the 23 refusals, the bound-test rule and the tool's own accepts-more; some will differ for the design's form (the comparison, section 5).
- `04-the-trial.md:93`: "The tool says so when it cannot follow a module". The words are now "not followed fully", and the section it points to has changed.
- BT2 itself, outside the sections I was to touch: `02-the-forms.md:5` "Nothing here has run" (the forms of sections 5 and 6 ran in the proof); `:52` "exactly four fields" (no interface files); the order file example at `:46-50` has no `door`; section 7's `language_reader` puts the reader's version in the config, where the proof fixed it in the tool's own package file.
- BT5 itself: `05-the-records-and-following.md:5` "nothing here has run".
- The starting texts: nothing found that disagrees. `starting_texts/job.md:21` ("Remove a declared use that no code makes") agrees with D7 line 82.

## 6. What I am not sure of

- The made-up examples in BT2 sections 5 and 6 are written in the proof's forms by hand. They were not run through the proof's tool, so the printed listing and notice are my rendering of what it would print. The notice example is an excerpt: a real one has a summary line and "bounds before/after" lines, and a changed bound on `PriceArgs` would also change `priceOf` and `op:priceof`.
- BT5 section 6 says a use of a file that is not an interface file is the case the unapproved refusal covered. That the tool then misses the use is my reading of `usage.mjs` as the comparison describes it; I did not read `usage.mjs`.
- BT5 section 5's `before` and `after` in a reason are this text's own choice, marked "Decided here". In the proof they are on the notice's entries, not on its reasons.
