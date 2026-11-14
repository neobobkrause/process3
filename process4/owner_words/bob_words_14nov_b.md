# Bob's own typed words, 14 Nov 2026, second message of the day to the main session (verbatim, complete)

The throwaway repo that you need already exists: process3-probes.

A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche. But if flaws are found during an external walk those flaws are added to the next round, not the next tranche. So a tranche only ends when an external walk (of a development deployment) completes without flaws. A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully.

Yes, a job writes its own tests. That's an important responsibility. It's also a challenge because tests must be complete yet fast and efficient.

An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results.

You say that most job starts are likely to be caused by notices that turn out to need no change (an estimate from a simulation, not a measurement). Explain what you mean.

You also say that ehe line between correcting the process and adding to it cannot always be drawn. Explain what you mean.

You say that the narrower trigger in the draft, “the interface changed”, would have missed 5 of the 241. You say that you have replaced it with the wider wording, which missed none on this record. When you change something I defined you need to describe the PROPOSED change in words I understand so that I know what you're proposing and whether to approve the change or not.

You say that 122 pairs of modules depend on each other through tests without declaring it. Why are there so many cyclic references in the tests - just laziness? How do these errors get corrected?

Are you saying that 71% of job merges change an interface? How was that measured? How certain are you that the test of an interface change is correct?

Process3 never finished a tranche because it kept adding test after test so that it stopped making progress before it could finish. 

You say that several things are left as “to be settled when built” with no mechanism named. What are you talking about here?

Lets be clear about how the process is changed (and how it's not changed). Process changes only happen in a separate process lane call PROCESS that I interact with. Though process changes are often technical and detailed, the PROCESS session will explain the nature of the problem and suggestion options for fixing it for me to explore and ultimately choose. Because updates require my involvement and I might be away from my computer for extended periods, there could end up being more than one change being proposed in the PROCESS session at a time. When that happens, the set of changes are considered together as a group that could potentially have interactions and implications between. The process after a proposed change is made must continue to meet the process4 requirements (or the requirements changed with my explicit approval). The transition from the process a product is being built using to the updated process will be done only with my prior approval, with PROCESS proposing the best and least disruptive means of making the update.

You can create a subtree in the process3 repo for the container being used to update to process4.

# Earlier own typed words of 14 Nov (first message), the working rules
- "Talk to me in plain words. No codes, no shorthand, no references to things I have not seen. I have not read your working files."
- "Decide technical matters yourself and tell me what you decided. Bring me only what is mine to decide, with what it is, why it matters to me, and your recommendation."
- "Only words I wrote count as my word. Never record your decision or your summary as mine."
- "Do not assure me that something will work. Say what is proven and what is not."
- "Do not add tests, gates, reviews or checks. Process4 has three tests, ever."
- "Keep your context under 70%. Do the heavy reading with workers."
- On the first draft: "it states Process4 in plain words, including my decisions of 13-14 Nov"
- "The hardest open problem: today nothing physically stops a session adding a test or a check to the process. That rule exists only as text, and in Process3 text alone did not hold."
