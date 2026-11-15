# Process4: the notification to user modules

15 Nov 2026. For Bob, from Claude. The section that replaces section F of the fifth draft in the sixth draft. Nothing here is in force, and none of it has run as a process.

Words used. A **provider** is a module whose services another module uses; that other module is its **user**. A module's **interface** is what it accepts and what it hands back. A **job** is a session that builds one module.

## What it is

It is a notification, not a test. Your words of 14 Nov: "calling the notification of a user module that a provider has changed isn't a test, it's simply a notification."

Its purpose, your words of 14 Nov: "If every user is told when the implementation of a module changes but the interface doesn't, then every change will continue to cause every user of that module to be rebuilt and tested. That's very (very!) inefficient and unnecessary."

## What it cannot do

Your words of 15 Nov: "After much research it seems pretty clear that there is no means to reliably tell the difference when there's a change in a module between when that change changed the interface or changed something other than the interface."

So the notice is a way of saving work. It is not a guarantee. It will sometimes tell a user that needed no change, and sometimes miss a user that did. Asked which way to go given that, your answer of 15 Nov: "Okay, I'll follow your recommendation: 2". The recommendation was to use the method below as a filter, accepting both kinds of error, with a missed user caught later by the three tests.

**What catches a missed user.** Nothing new. The user's own module tests, the next time its job runs for any reason; or the internal or external walk, where the break is a flaw and becomes work for that module in the next round. Your words of 15 Nov: "There will be no additional tests added to the process than the 3 already identified." So no test of users runs before a provider's change merges.

## What counts as a change to the interface

Your words of 14 Nov, to the session that studied this question:

- "a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes."
- "The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed."
- On the words that state a bound: "If those words are changing, then there must be a reason why. It must be that that interface is changing, right?"
- "I agree with your recommendation", answering this: for what a provider accepts, users are told only when the new interface cannot stand in for the old (something removed, renamed, newly required or newly refused), so accepting more tells no one; for what a provider hands back, any change to an entry tells that entry's users.

## How it is found

Your words of 14 Nov: "even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated."

The event that sends the notice, your answer of 14 Nov: "which event sends the notice: B". That is: a build tool writes out the module's interface, from its code and its structured comments together, before and after the job's change. The notice is sent only when the two listings differ. A comment edited with no change to the listing sends nothing.

**Who is told.** Your words of 14 Nov: "Who is told: ideally only the users of the entry that changed."

**Modules that have no comments yet.** Your words of 14 Nov: "The first time a job for a module without comments starts the first thing it does is add the structured comments." And: "Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands." That step sends no notice; it gives the "before" listing.

**Inside a job's own module tests.** Your words of 14 Nov: "the tool may refuse a disagreeing comment", that is, a comment that disagrees with its own module's code. And of 15 Nov, "As recommended": the tool may also refuse a module's code that disagrees with a provider's stated interface, inside that module's own module tests, on that module only. These are parts of module tests, the first of the three tests. They are not further tests.

## Claude decided (technical; you can overrule any)

1. Which parts of a provider a user uses is worked out by the tool from the user's code and comments. No list is kept by hand. (On this you wrote: "You tell me.")
2. A user the tool cannot follow fully counts as using everything of that provider, and is told whenever that provider's listing changes.
3. A bound that a kind of value cannot express is written on its own marked line in the comment.
4. The code inside a module that checks or builds what crosses its interface says, in a comment, which kind it checks or builds.
5. Calls made by name are made followable: each provider publishes one table of its operations, the tables are gathered into one list, and each shared piece that carries a call by name has one comment tying the name to that list.
6. The tool is TypeScript's reader, reading plain JavaScript. Both listings of a comparison are made at the same moment with the same version of the tool.
7. "Accepts more", the one difference that tells nobody, counts only when TypeScript's own type checker confirms it.
8. The proof session's further refusals (twenty-three of them) are not taken. Only the two refusals you approved stand.
9. The changes recorded in the proof become the tests of the process's own tool, which run only when PROCESS changes the process and never on a product's work, as in the fourth draft's proposal 5 that you agreed.

## For section E, the three tests

Your rule for how every job writes its module tests, typed 14 Nov to the study session: "The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response." And: "The comments and tool can also inform module tests to ensure that boundaries are properly checked."

## Still open

1. **What a told job does.** The record of 13 Nov, line 10: "A user module's job checks the implications of those parts and no others, and updates and runs only the tests that relate to them." Not studied. Your answer to the fourth draft's proposal 3 was "needs to be studied further."
2. Who is told when the product's list of modules itself changes.
3. What becomes of a module that declares it uses another while no code of it does (510 of Process3's 2,707 notifications went to such modules).

## Proven and not proven

**Proven** (the proof session, on eleven made-up modules and 150 changes; checked against its data by the study session): on the kinds of change it can see, the method decides as its rules say; it cannot be made complete; every miss recounted showed up as a failing test of the user.

**Not proven:** any of it as part of a running process. How many notices it saves on the real product: the proof's changes were chosen to attack it, and there it sent 2.6 times fewer than telling every user. On Process3's record, AI workers judged about 74 of 2,707 notifications needed. Adding comments to a few heavily used real modules and replaying their recorded changes would measure it; that needs your go-ahead, because it starts sessions on your account.
