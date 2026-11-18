Length: 98 lines. Last section: "9. Never measured, and not found".

# Background, part 4: the tranche, rounds, walks and release

This part gives the reasons and the evidence behind design part 3. It states no rule.

## 1. The owner's words on a tranche

Typed on 14 Nov (`owner_words/bob_words_14nov_b.md`):

> A tranche ends after a successful external walk of a development deployment. So a deployment is a step in a tranche. But if flaws are found during an external walk those flaws are added to the next round, not the next tranche. So a tranche only ends when an external walk (of a development deployment) completes without flaws. A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully.

These replaced the session's record of 13 Nov, as the fourth draft quotes it (`definition/process4_definition_v4.md`, line 55): "A round that completes with no failures ends the tranche. An optional multi-session deploy-and-external-walk runs after that." In that earlier form the external walk was optional and came after the tranche. In his typed words it is a step in the tranche.

His definitions of the two walks, the same day: "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results."

## 2. How a tranche ends: what is his and what is a reading

His words above speak of one external walk that "completes without flaws". On 18 Nov, as the design state records in Claude's words (`working/design_state_18nov.md`, section 5), he ruled that every round's walks are partial and that a full external walk is made only when he asks for it. No file of his typed words holds those rulings.

Putting the two together is not his. The earlier form of this background said flatly that the tranche ends when a round's external walk comes clean. The design marks how a tranche ends as a reading: clean partial walks, internal and external, or a clean full walk where he asked for one (design part 3, section 5). It also holds a question that is open with him and that the earlier form lacked: what shows that the journeys named for the tranche do complete at its end, when each round's walks cover only what that round changed. Both are in design part 10, section 1, item 2.

Why walks are partial at all: this writer found no recorded reason of his. It is consistent with his words of 8 Nov in section 4 below, where he calls a long walk "an expensive means of identifying many of the same the flaws".

## 3. What Process3's walks showed

- No walk of either kind finished without flaws (sixth draft, `definition/process4_definition_v6.md`, lines 13 and 275, marked measured).
- A walk's own report could not be trusted to say so. On 8 Nov the stored report of the internal walk had all 238 steps marked ok with 63 failures listed, and the count of steps moved from 238 to 357 inside one round (the same draft, line 275). This is the fact behind the design's meaning of "without flaws" for a full walk, that it "leaves out no step that the walk before it made" (design part 3, section 3). The fourth draft's tenth proposal was headed 'What "without flaws" means'; the owner answered "agreed" (`owner_words/bob_words_14nov_c.md`).
- The external walk as the owner now defines it was never made in Process3, and walks there failed for reasons that have nothing to do with a growing process: the walker's own machinery, the deployment's data, and a browser that died (`working/audit2_corruption.md`, line 118).

So there is no evidence either way on whether a walk under Process4 can come clean. The design lists it as unproven (design part 10, section 3) and as something only the first real tranche can show (section 5).

## 4. The order of a round, and the owner's caution on walkers

The design marks the order of a round as "Claude decided": jobs, then the internal walk, and a deployment only after an internal walk with no flaws (design part 3, section 2). The earlier process's decision record shows the owner giving that order for Process3 on 8 Nov. As `evidence/DECISIONS.md`, line 117, quotes him (a coordinator's record, not his typed words, and the closing bracket is missing there as here):

> The live walk will take a long time and will end up being an expensive means of identifying many of the same the flaws the internal walk found. Stop the live walk now, update the process so that the live walk only runs once a round closes with no flaws found from the internal walk. And try to configure both walks to run as many walks as is reasonable to speed up the walking process. (But be careful that there aren't too many external walkers to cause the Cloudflare system to exceed limits of the account.

The last sentence is the caution the design quotes in its hosting table (design part 9, section 1). How many external walkers the hosting account bears has never been measured; the design lists it as not known (design part 9, section 3) and as a trial item (design part 10, section 4, item 14).

That flaws go to the next round and not the next tranche is his typed word (section 1).

## 5. Who makes a walk, and why a walk is shared

**Sessions make the walks.** The fourth draft's seventh unsettled point asked whether a walk runs "in sessions or on GitHub's machines". The owner's hint of 14 Nov: "sessions" (`owner_words/bob_words_14nov_c.md`). The sixth draft read that as sessions running both the walks and the deployment (line 271).

**Why a walk is shared among sessions.** Two measured figures from Process3:

- The harness's limit on one thing running inside a session was about thirty minutes, so that anything longer ran on GitHub's machines (`evidence/foundations_tranche_9nov.md`, line 192; a row of Process3's table of measured platform behaviours, dated 31 Oct and 2 Nov).
- Process3's two late runs of a deployment and a walk took 60 and 64 minutes on GitHub's machines (`evidence/product_side.md`, line 175).

So one session cannot make one such walk in one run. How the design shares a walk, and that walking sessions use the job slots, it marks "Claude decided" (design part 3, section 3, and part 2, section 5). No walk shared among sessions has ever run. No walk of any kind has been made by a session, and whether a session's browser can reach the development site is not shown (design part 3, section 3; part 7, section 3).

**What an area is.** Marked "Claude decided" (design part 3, section 3). No working file with its grounds was found.

## 6. The walks' documents, and the reports

**Where the documents are.** The owner's fourth message of 14 Nov says the screens and journeys are kept in a folder of the product's repository (`owner_words/bob_words_14nov_c.md`). The design does not carry the folder's name, because it names no product; the process config names it.

**Who keeps them.** The earlier form of this background said the UX lane keeps them, with no mark. The design marks that as a reading (design part 3, section 3; part 4, section 3).

**The account after each round.** From the review session of 18 Nov, in Claude's words (`working/design_state_18nov.md`, section 5).

**The tranche report.** The earlier form of this background gave a shorter list of what the report holds and did not say who decided who writes it. The design marks as "Claude decided" that ARCH writes it and that it lists the UX lane's changes, and gives the full list (design part 3, section 5). Two facts lie behind its insistence that cost is given "where it can be read":

- In Process3 a job could not read its own usage in the middle of a turn. A change that made a cost figure compulsory blocked every job's completion, and was removed 45 minutes later (`evidence/change_sample.md`, lines 93 and 302).
- Process3's one tranche never closed, so no tranche report was ever written (`working/k_evidence.md`, line 221). The report has no earlier example.

Where cost can be read on Claude Code is still open (design part 7, section 1, last row).

## 7. A tranche that does not come clean

That such a tranche goes on in rounds until the owner says, and that he then chooses between merging it with its flaws named and dropping it, is from the review session of 18 Nov (`working/design_state_18nov.md`, section 5). What a merge with flaws named means for a later release is marked as a reading and is open with him (design part 3, section 5; part 10, section 1, item 3).

The risk is unmeasured. An audit of the sixth draft put it this way: nothing bounds the number of rounds, and only his word ends a tranche that will not come clean (`working/audit2_corruption.md`, line 121).

## 8. Release, the urgent fix, and support beyond the process

**No release was ever made by sessions.** `evidence/review.txt`, line 325: "There was no released version." The design marks the whole release path unproven (design part 3, section 6).

**Why approval is typed in the publishing session.** The design marks as "Claude decided" that the owner types his approval in the session that publishes, and gives the reason: the permission checker has declined consent that was only quoted (design part 3, section 6). The measurement behind that reason is in part 9 of this background (sessions declined 11 of 11 merges asked on quoted consent; no evidence file was found). Who publishes is open with the owner, and that the checker accepts an approval typed this way is unproven.

One fact from Process3 that the design does not use: its repository had a release environment whose required reviewer was the owner (`working/design_work_18nov/owner_acts_and_approvals.md`, section 2, from Process3's set-up guide; nobody has read the live settings). The proposed wording of his approvals leaves the choice between that route and typed approval for him to fill (the same file, section 4).

**The install and the update.** See part 2, section 1, of this background for his words. That they run on a development account, and what "successful" means, are readings (design part 3, section 6). Whether the product's installer can place a release into an empty account is not known (design part 9, section 3).

**An urgent fix.** The earlier form of this background said only that an urgent fix is a tranche whose content is that fix. The design now also holds a question open with the owner: what happens to a tranche that is already open (design part 3, section 7). No record of an urgent fix in Process3 was found.

**Support beyond the process.** That the process provides written procedures for promoting a release, rolling one back and handling a reported problem is from the review session of 18 Nov (`working/design_state_18nov.md`, sections 12 and 14, in Claude's words). No procedure is written yet (design part 10, section 2, item 1).

## 9. Never measured, and not found

- A walk that ends without flaws, of either kind, under any process.
- A walk made by a session; a walk shared among sessions; a deployment made from a session.
- How many external walkers the hosting account bears.
- The owner's typed words for the rulings of 18 Nov on partial walks, the opt-in full walk, the account after each round and written procedures. They are known only through the design state.
- A recorded reason of his for partial walks.
- Any earlier tranche report, release, install or update made by sessions.
