# Bob's own typed words, 14 Nov 2026, to the session on one question: when must a module's users be updated? (verbatim, complete, in order)

These are every message Bob typed to that session, exactly as typed. Lines in *italics between messages* are the session's notes on what a message answered; they are not his words.

---

## 1

I am Bob. This session has one question: when a module changes, how do we know which of the modules that use it must be updated, so that the others are left alone?

Read this file first and follow it: process4/working/notice_study/session_brief.md
It gives my rules for how to work with me, the question in my own words, what has been measured so far, and where the data and scripts are. The full groundwork study is beside it, in study.md.

The product's record is in the public repository neobobkrause/civicsmith-copy. Read only. Never commit or push to it.

Start by telling me, in plain words, what the groundwork found and what you think the next step is. Then we will explore it together.

## 2

*The session had asked whether a user module must be updated only when, with the provider's change in place, the user itself is wrong (it no longer loads, its own tests fail, or it breaks a requirement of its own).*

To be clear, a provider's answer to a user changing (content) doesn't necessitate the user being retested. What matters is when the interface to the provider (metadata) changes.

## 3

*The session had reported that, on its reading of the record, ten user modules broke after a change of content only.*

Help me understand why a content change would cause a previously passing test to fail. The interface to a provider is it's domain. The bounds of valid values passed to and received from a provider are it's range. So what I'm saying is that any change to either a provider's domain or range necessitates that its users be retested. But if both domain and range stay the same, then no retesting of users is needed.

## 4

Your last response is highlighting how important it is that module tests be designed and written correctly. The tests are supposed to confirm bounds, confirm the accuracy of results under valid conditions, and confirm the recognition of an error when out of bounds. Tests should not fail because they expect a specific valid response but receive a different though still valid response.

Programming languages like JS include language constructs for defining an interface. The specificity of the interface can vary because of many factors that include how typed a language is. But even in loosely typed languages the formal interface can be augmented with structured comments that the language runtime doesn't see but that clarifies how the interface is to be used, and used by our build tools to determine whether the domain or range has changed so that user modules need to be updated.

## 5

I need your assessment of TypeScript’s reader tool. Once every module has these comments that define an interface, if an interface changes then the comments would also change. The act of changing those comments would result in the provider's users being notified that there was an interface change that they may need to respond to. If a job makes changes but none of those changes result in interface comment changes, then that provider's users don't need to be notified. Is that a solid strategy?

## 6

The comments and tool can also inform module tests to ensure that boundaries are properly checked.

Properly done, this sounds like a means by which the set of notifications sent out when a provider changes to be greatly reduced while still ensuring that user modules are still notified when an interface changes.

That said, in order for this to work every module needs to be edited to add structured comments. This will be a challenge given that adding comments that describe the range of an interface requires a level of understanding that isn't readily apparent without careful and rigorous analysis.

## 7

I need more info on whether the trigger is the written-out interface. You also ask whether the tool may refuse a comment that disagrees with its code. You know what we're trying to achieve. What do you think on both of these questions?

## 8

*The session had put two questions, each with its recommendation. First, which event sends the notice to user modules: "A. A job edited a comment" or "B. The listing after the change differs from the listing before", where the listing is the module's interface as the tool writes it out from the code and its structured comments together. Second, whether the build tool may refuse a comment that disagrees with its code, inside a job's own module tests.*

which event sends the notice: B

the tool may refuse a disagreeing comment

## 9

*The session had listed four points on which Bob had typed nothing yet: who is told (every user of the provider, or only the users of the entry that changed); how a user module states which parts of a provider it uses; what rule applies to a module that has no comments yet; and the one fixed form for bounds written in words.*

Who is told: ideally only the users of the entry that changed. But in order to do so, a user module must state which parts of a provider it uses. Is that a reasonable thing to support?

What rule applies to a module that has no comments yet: The first time a job for a module without comments starts the first thing it does is add the structured comments.

The one fixed form for bounds written in words: If those words are changing, then there must be a reason why. It must be that that interface is changing, right?

## 10

*The session had asked Bob to decide whether a user module's use of a provider may be worked out by the tool from the user's code and comments, with no separate list kept by hand. It had also said it would add one detail unless he objected: "The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands."*

Why is this mine? - may a user’s use of a provider be worked out by the tool from the user’s code and comments, with no separate list kept by hand? You tell me.

Agreed: The comments go in as a step of their own, before the job changes anything else, and they describe the module as it stands.

## 11

*The session had asked which changes to an existing entry of a provider's interface send a notice to that entry's users, and had recommended: for what a provider accepts, tell users only when the new interface cannot stand in for the old (something removed, renamed, newly required or newly refused), so that accepting more tells no one; for what a provider hands back, tell users of the entry on any change to it, because handing back something new can break a user.*

I agree with your recommendation

## 12

So where does this leave us with regard to the task of making a distinction between meaningful interface changes of a provider and all other changes? Is it your assessment that what we have is load-bearing?

## 13

*Received on 15 Nov 2026 by the session's clock. The session had reported that the tool pointed at 5 of the 11 broken user modules and at none that was not broken, and that the largest reason for the misses was operations called by name through a door.*

How do we make the calls by name made followable?

What else is needed for a load-bearing approach?

## 14

*Received on 15 Nov 2026 by the session's clock. The session had asked whether the tool may also refuse a module's code that disagrees with a provider's stated interface, inside that module's own module tests and on that module only, and had recommended yes.*

As recommended.

How do we wrap this up?

## 15

*Received on 15 Nov 2026 by the session's clock. The session had asked whether it should send the main session a message naming the result files, or Bob would tell it himself.*

Send the other session a message. Are you ready to run a proof session to confirm that everything works? You can use the process3-probes repo for that purpose. If you run it, pick a model and effort that's appropriate.

## 16

*Received on 15 Nov 2026 by the session's clock. The session had reported that the proof session, after six designs of its tool, still met holes in a fresh blind round (10 in 16 changes, by the proof session's own table), had recommended stopping it, and had asked whether to stop it and have it write up or let it continue.*

Stop, write it up. It's usable, even if there's an occasional extra unnecessary notice sent out. It's 2 orders of magnitude better than the old method.
