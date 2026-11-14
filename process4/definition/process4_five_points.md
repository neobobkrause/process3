# Process4: the five things that most stand in the way, in detail

14 Nov 2026. For Bob, from Claude. Nothing here is your decision, and nothing here is proven to work.

You asked: "Let's begin the next session by going into greater detail on each of the points you make in the 'What most stands in the way' section of your last response."

How this was made. Five AI workers each took one point. Each re-read the three audit reports and then checked the facts against the repositories and Process3's stored records. Where a sentence below says "checked today", a worker checked it today, unless I say I checked it myself. Where the earlier session told you something that turned out wrong, I say so.

Words used throughout. A **session** is one running Claude conversation. A **branch** is one line of work in a repository; the **main branch** is the finished line, the **tranche branch** is the line a tranche is built on. **ARCH** is the long-running session that directs the building of one product. **ROOT** is the first session you start. **Your approvals** are the paragraphs in your name, in a repository, that say what sessions may do without asking.

---

## 1. The end of a tranche

Your words: "a tranche only ends when an external walk (of a development deployment) completes without flaws." "An internal walk uses the UX Screens document to confirm that the workflow matches the definition. The external walk follows the UX journeys to confirm that all journeys can be completed successfully to produce proper results." "screens and journeys are kept in docs/development/ux-substrate/ in the product repo".

**What is in that folder (checked today; I checked the second item myself).**

- The folder is different on the two branches. On the main branch, which has not moved since 1 November, it holds 133 files, with a Journeys page and a Screens page among them.
- On the tranche branch, where Process3 did its building, a design session removed 49 files on 6 November, the Journeys page among them. The folder's own note now says: "This folder holds only what the product's build and checks read (Bob, 5 Nov 2026). The design documents are claude.ai artifacts". It lists Journeys and Screens as links to claude.ai pages.
- So the earlier session's statement to you, that the documents are not in the folder, is only partly right. The Journeys page is gone from the tranche branch. The Screens page is still there as an old copy of 28 October, together with everything needed to rebuild it, current to 8 November. The claude.ai Screens page says it was built from that folder.
- There are three lists of journeys, and they do not agree: the claude.ai Journeys page (27 journeys, dated 6 October, the oldest); the Journeys page on the main branch (27, marked on 13 October as folded into the Screens page); and a script in the folder that the Screens page is built from (32 journeys). Nothing says which of these is "the UX journeys".
- A worker opened both claude.ai pages today from a session, to read only. The earlier session told you it was not known whether a session could.

**Who writes those documents (checked today).** Every one of the 892 changes to that folder between 2 October and 9 November was made by an AI session. None came from your own GitHub account. The earlier session told you "61 of 63" for November; it is 63 of 63. This is not sessions going outside your word: your approvals in the product's repository say design lanes "own their lane folders, the design stream (docs/development/ux-substrate) included" and "Within the product's principles they decide design and wording there." That is the lanes question, taken up in the lanes document.

**What the walks did in Process3 (checked today).** Five walk reports were stored: three internal, two external. None was clean. The two external walks visited each screen once as an administrator and once as a member. Neither followed a journey from start to finish. So the external walk as you define it has never run, and nobody knows how long it takes, what data it needs, or whether it can finish. All twelve recorded deployments failed, and the tranche never ended.

**Who decided whether a walk passed.** In Process3 the walking program's own pass or fail decided, and sessions wrote the rules for what could be excused: the last external walk carried 36 notes reading "the designed absence", written in by the architecture session. In the fifth draft, ARCH starts the walks, turns flaws into work, and merges the tranche when the walk is clean. No other session has a part. That one session decides "clean" is the auditors' reading of the draft, and I agree with it.

**What the draft leaves unset.** How large a tranche is. How many rounds it may take; the draft says "Nothing bounds the number of rounds." What happens to a tranche that never comes clean. The draft's sentence "Only your word ends a tranche that will not come clean" was Claude's, not yours, and it was not marked as Claude's. I am withdrawing it; the truth is that the case is undefined.

**Yours to decide.**

1. *What each walk is measured against, and which journey list counts.* The choices: the claude.ai pages; pages kept in the folder; or the folder's machine data. The pages on claude.ai cost nothing to keep, but their history is outside the repository and the Journeys page there is the oldest list. Pages in the folder mean restoring the Journeys page and allowing the built Screens page to be kept there, which your approvals now forbid ("never committed"). The machine data you cannot read, and it describes more than is built. **My recommendation:** pages in the folder, because your words of 14 November say that is where they are kept, and because the repository then records every change to what a walk is measured against. It needs one proposal from me to you about the "never committed" sentence. For the journey list I have no recommendation yet: I need to show you how the 27 and the 32 differ first, and I have not had that compared.
2. *What a tranche contains.* Either all open work, which means the first walk comes after about 177 jobs (an estimate) and carries every flaw Process3 left; or a smaller content you name for each tranche. **My recommendation:** a smaller content you name. It is the one lever here that is not a new check. Its cost is a decision from you at each tranche, and a clean walk of a part says less about the whole.
3. *What happens to a tranche that will not come clean.* Merged with its flaws, which sits against your sentence "So a release is always fully tested and walked successfully"; or dropped; or kept open. I have no recommendation I can support with evidence, because no tranche has ever been walked your way.
4. *Which journeys count toward "all journeys".* Three journeys begin at the website or the installer, which you put outside the tranche. Six have steps only the AI assistant can do (one of the six is also among the three), and one more is connecting a Claude account; you wrote "A tranche can end without an AI enabled run". That is nine journeys of the 32 touched. **My recommendation:** a tranche's external walk follows every journey, and what it leaves out is named beforehand: the three journeys that begin outside the tranche, the connecting of a Claude account, and the steps that need the assistant. Then leaving them out is neither counted as a flaw nor hidden as a note.
5. *Who runs the walks.* Your hint was "sessions". A line you kept in your ledger, and Process3 itself, had GitHub's machines run them, and that form is the only one that has ever run. Whether a session's browser can even reach the development site is unmeasured. **My recommendation:** keep your hint, and let me try one walk from a session in the trial repository before the definition depends on it. That needs your go-ahead, because it starts a session and a deployment on your accounts.

**One risk with no remedy inside your rules.** One session judges the walk clean and then merges. Every stop the auditors could think of is a check or a gate, which you have ruled out. It is a risk to accept knowingly, not one I can remove.

---

## 2. The rule that only PROCESS changes the process is held by words only

Your words: "Process changes only happen in a separate process lane call PROCESS that I interact with." And: "The transition from the process a product is being built using to the updated process will be done only with my prior approval".

**What stands behind that rule today (checked today, this time by reading GitHub's settings directly).**

- Your approvals in the process's repository still say sessions may "merge pull requests into working and tranche branches once their required checks pass, without a person's review, and merge the tranche's pull request into main once its required checks pass". They forbid changing settings. They do not forbid changing the process.
- GitHub's own rule on that repository asks for nobody's approval. A change merges once two automatic checks pass. The sessions' GitHub account can write there, and on 9 November it opened and merged the last change to the process with no person looking.
- A list of forbidden commands exists only on Process3's own branch, where it steers merges through Process3's tool without stopping them. The branch this Process4 work sits on has none. The earlier session told you there was no such list at all; that was imprecise.
- In Process3, sessions made 270 of the 296 changes to the process.

So today a session that decided to change the process could do it, with your approvals on its side.

**The history, which I owe you plainly.** On 13 November Claude proposed that the process change only when you yourself merge the change, and then withdrew it, because it made work wait for you. On 14 November the second draft proposed the same thing again without saying it was the same, called its cost "one click", and said silent growth became "impossible". Both statements were wrong, and that was withdrawn too. A narrower question followed, and your answer was the PROCESS paragraph. Since then nobody has asked you whether anything physical should stand behind it.

One correction to what you were told: the earlier session said your words of 14 November "accept the acts" such a setting would cost you. That was an auditor's judgement. Your paragraph says you explore, choose and approve. It does not say you merge.

**Yours to decide: whether anything physical stands behind your rule.** The four choices, with their real cost:

1. *Words only, as now.* Nothing for you to do. The risk stays exactly as it is.
2. *Your approvals are reworded* to say a process change is merged only on your word given at PROCESS. One edit, made by you, because sessions may not write your approvals. It is still only words, but today's words say the opposite of your rule, so this at least removes the contradiction.
3. *A GitHub rule so that only your account can update the branch of the process that products use.* You set it once; sessions cannot, and may not. After that, each time you approve a change at PROCESS, you also press merge on GitHub's website, and possibly do a second act to move a product onto it. Nothing merges while you are away. This is the centre of the proposal that was withdrawn twice, and I am saying so.
4. *The sessions' account loses the right to write to the process's repository at all.* The same acts as 3, and PROCESS could then no longer save its own proposals there.

**My recommendation:** 2 now, and 3. My reason for bringing 3 back is one thing that changed since it was withdrawn: it was withdrawn because it made work wait for you, and your own PROCESS paragraph now makes every process change wait for you anyway ("Because updates require my involvement and I might be away from my computer for extended periods"). What 3 adds on top of that waiting is the pressing of merge, each time. What I cannot tell you: that it works. It has never been tried on your repositories; it rests on GitHub's documentation. I would try it in the trial repository first, which needs you to set the rule there.

What none of the four stops: tests and walk steps growing inside the product itself, and what one session tells another to do. Whether pressing merge counts, for you, as one of the gates you have ruled out is yours to say.

---

## 3. The first hour

**What happened to ROOT on 5 November (checked today against Process3's log and the product's history).** A session runs on a cloud machine that is handed a copy of your repository when it starts. Your approvals are read from that copy, once, at the start. At 18:41 that day you started ROOT on the correct branch. The machine was handed a saved copy of that branch about an hour old: seven changes behind, and without the approvals you had committed sixteen minutes earlier. ROOT's first check noticed and ROOT stopped. Another session sent it one message, it fetched the newest copy, and it carried on. On 8 November the same thing happened with the same saved copy, by then three days old.

**The fifth draft got this wrong.** It said your ROOT "plainly came up on the main branch, which held old approvals, both times it was tried". Three things in that sentence are false: you did not start it plainly, you pasted the starting text the tool printed; it was not on the main branch; and you started ROOT three times, the first of which landed on the newest copy. The draft then asked you to make the tranche branch the one GitHub opens by default. That would not have helped, because ROOT was on the right branch and the setting does nothing about an old copy.

**What I have decided, and report.**

- I withdraw the request that you change the default branch.
- ROOT's first act is to fetch the newest copy of its branch and to stop if it cannot. That is what actually ran, twice. Not proven: why the cloud hands out an old copy, whether it still does, and whether approvals that arrive after a session has started count the same as approvals read at the start.
- How the process reaches a session. The draft never said. Your ledger does, in lines you marked "keep": the product names one fixed version of the process, and each session fetches a read-only copy of it. Process3 ran that way. I am putting those lines back; this was never an open design question.
- For three of the five steps the earlier session told you had "nobody named" (deploying, preparing a release, moving a product to a changed process), your Foundations name the session that directs the build. The draft dropped the name. I am restoring it, with the third now under your rule of 14 November: only with your prior approval, by the means PROCESS proposes. Archiving finished sessions I will assign and report.
- I owe you a written order for converting the three repositories (the product's, the trial one, the process's), saying who does each step.

**Yours, though I am not asking for an answer today.** Some conversion steps only you can do: new wording in your approvals, a changed list of forbidden commands, perhaps the GitHub rule from point 2. Your present approvals in the product forbid sessions to replace the required test run, so an edit of yours must come before anything else there. I will bring you the full list of your acts, in order, in one piece, before asking for any of them. One thing to know now: the trial repository refused the sessions' last two attempts to save work there, on 8 November, and why was never found.

The fifth step, how new work is written into a module, is a real question for you and I will bring it with its options separately.

---

## 4. The release reads two ways

**Your statements.** Typed on 14 November: "A release can (optionally) be started after a tranche completes. So a release is always fully tested and walked successfully." And: "A tranche can end without an AI enabled run", "installer and website are outside the tranche", "installer and site updates wait for a clean development release walk". And one sentence in Process3's decision record, written by a session and quoting you on 9 November: "Yes, the installer update and site update wait until a release walk with AI on is also clean."

**Two things that are easy to mix up.** A *development deployment* is the product put on a test site in your Cloudflare account straight from the branch it is being built on. A *development release*, in your approvals, is a packaged, numbered test version that sessions may cut and then install.

**The two readings.**

- First: "a clean development release walk" is the walk that already ended the tranche. Nothing further is walked. The fifth draft took this reading.
- Second: after the tranche ends, a development release is cut, installed on a test site and walked, and only then are the installer and the website updated.

**What goes unwalked under the first reading.** The real installer placing the product into a Cloudflare account. An existing team's site being upgraded with its stored data in it. The assistant working with a real AI model. A real team could be the first to meet each of these.

**What exists (checked today).** Process3 cut no release of any kind. It built the step that cuts a development release; that step never ran on the product. Nothing can yet install a cut release on a test site, and Process3's own tool says why: the installer needs a person to sign in. The steps that update the installer and the website were never built. So "none of it is built" was a little too broad: one step was built and never used. Your approvals on the product's tranche branch already allow sessions to "install and upgrade" a release on a test site and walk it.

A correction: the audit said the draft never showed you your 9 November sentence. It did, before you answered, and said that under its reading "nothing walks what the installer places". The earlier session removed that passage when it recorded your answer.

**Yours to decide.**

1. Which reading you meant. **My recommendation:** the second. Under the first, three things reach a real team unwalked. The cost of the second is that all of it has to be built, and the installer's need for a person to sign in may mean an act from you at each release; that is not yet known.
2. Whether "with AI on" still holds before the installer and website are updated. It costs you connecting an AI account. **My recommendation:** yes, at a release only, since you have said a tranche can end without it.
3. Whether an upgrade of an existing site is walked before a release, or left to one module's own tests. **My recommendation:** walked, as part of the same release walk.
4. Where flaws go when a walk made after the tranche finds some. No recommendation yet; it depends on your answer to 1.

Technical, mine to settle and report: which session prepares a release (your Foundations name the directing session), and how a release is packaged and put on a test site.

---

## 5. Your 288 lines

**Where the 288 come from.** 151 are from your Keep and Drop Ledger: a session drafted 159 statements and you marked each keep, modify or drop; the 151 are the ones marked keep (119) or modify (32). The other 137 come from your Foundations, the document a session wrote for you from the Ledger. Earlier auditors, not you, cut it into those 137.

**Where they stand in the fifth draft (a worker recounted today; the counts agree with the audit and add up to 288).**

- 112 kept and stated in the draft.
- 43 kept in purpose, with the way of doing them changed.
- 53 kept, but the draft says nothing about them.
- 75 ended, in whole or in one clause. Of these: 18 on something you typed on 14 November; 22 on a session's written record of your decisions of 13 and 14 November; 2 on a sentence a session wrote; and 33 by Claude without being put to you.
- 4 contradicted: the draft does what the line forbids.
- 1 no longer mentioned at all.

**The 33.** They are now grouped into seven proposals for a yes or no each: when Process4 counts as in force, and your first health number; three measurements owed on the first tranche; two duties repeated at each new model version; two removals the draft blamed on a 9 November remark of yours; records and cost figures for each job; size limits on what goes into the repository; and rules about the process's own instruction texts. Nine of the 33 are checks or re-tests that your "three tests and no others" may already end, but you were never asked whether your words reach that far. Until you answer, I will write "proposed", not "ended".

One of them was wrongly laid at your door. The draft says the set-up check ended "on your instruction" of 9 November. Process3's decision record, under your quoted words ("Is this needed at all? If so, it must be done efficiently. If not, then cut it."), decided to keep the check and run it less often. Ending it was Claude's doing.

**The 53.** Grouped into nine subjects, such as how sessions are kept short and replaceable, what each session reads, and how the process reaches a product. Putting them back is my work. Three clash with your words on PROCESS and will come to you instead.

**The 75 and "which governs".** For these lines your Ledger still says keep or modify, and your Foundations still state them, while the definition says otherwise. Nothing says which of the three a session should follow. A session that reads the Ledger does one thing; a session that reads the definition does another. The audit's two choices: a sentence saying the definition is followed from the day you accept it, with the older two kept as history; or the older two withdrawn from what sessions read. **My recommendation:** the first, and only once the definition accounts for every line, since otherwise the 53 unstated lines would vanish by default.

**Something new, found today.** The 288 are not all of your requirements. They were made from an early copy of your Foundations (up to 4 November) and from the first Keep and Drop page only. A later copy of the Foundations, and a second Keep and Drop page you answered on 6 November, hold requirements that are in none of the 288: among them everything you said on 5 and 6 November about lanes. A worker is now listing exactly what is missing. I will report the count when it is done.

**Yours to decide.**

1. The seven proposals, yes or no each. They are written out and ready; say when you want them.
2. Which document governs.
3. Whether a job may commit built files (files produced from other files). You kept a line saying it never does; the draft says it does.
4. One older line of yours lets the directing session reword a requirement and tell you in one line afterwards. Your rule of 14 November puts such a change to you first. Both cannot stand.
