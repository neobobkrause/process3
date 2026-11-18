Length: 129 lines. Last section: "9. Never measured, and not found".

# Background, part 9: permissions and the platform

This part gives the reasons and the evidence behind design part 6, sections 1 to 4, and design parts 7, 8 and 9. It states no rule. Nearly everything measured here was measured on Claude Code, in Process3, between 31 Oct and 9 Nov 2026.

## 1. What holds a rule

The earlier form of this background said four things hold a rule and counted each session's instructions among them. The design counts three that hold whatever a session intends: the owner's standing approvals as judged by the permission checker, the list of forbidden commands, and GitHub's own rules. It says every other rule is held by text, and calls that a known limit (design part 6, section 1).

Why instructions are not counted among the things that hold: the record of part 1, section 1, and part 8, section 1, of this background. In the owner's words of 14 Nov, "in Process3 text alone did not hold" (`owner_words/bob_words_14nov_b.md`).

Why the design still leaves most rules to text: the owner's judgment, from what he saw on Claude Code, that jobs "never tried to modify another module", and that enforcement by role is "important and useful, but not essential" (`owner_words/bob_words_16_17nov_codex_development.md`). That is an observation, not a count.

## 2. The standing approvals: what was measured

The approach is the owner's direction of 1 Nov for Process3, as his Foundations record it (`evidence/foundations_tranche_9nov.md`, line 196; a session's record): his approvals are "recorded once, in your own words", and live "only where your own hand puts them".

| What was seen | Count | Where recorded | Evidence file |
|---|---|---|---|
| Consent only quoted in a session's starting text: sessions started by another session declined every merge asked of them | 11 of 11 (2 Nov) | `evidence/foundations.md`, line 185 | Not found |
| Consent typed by him in the acting session: the checker refused none | 0 of 21 (2 Nov) | The same line | Not found |
| With his approvals committed in the repository, a confirming round saw no refusal | About 450 acts | `evidence/foundations.md`, line 279 | Not found |
| An unforeseen request from the directing session was carried out with his committed approvals, and not without | 10 of 10, against 0 of 10. One file says 2 of 10 | `evidence/foundations.md`, line 189; `working/design_work_18nov/owner_acts_and_approvals.md`, section 2 | Not checked |
| A session writing his relayed approvals into a loaded file was refused | 2 of 2 | `evidence/permissions_inventory.md`, as that worker file cites it | In the inventory |
| Merges with no review through Process3's tool, under wording that names the tool and says "without a person's review" | About 700, none recorded as refused | The same | In the inventory; "in use, not counted" (`working/trial_plan_facts.md`, line 58) |
| Under the first wording, of 1 Nov, the checker's reason "Merge Without Review" fired | Once | The same | In the inventory |
| Approvals restated for one repository only, on 8 Nov: the sessions' next two pushes there were refused | 2. Cause never found | The same | In the inventory |

The list of what could not be found is the worker's (`working/design_work_18nov/owner_acts_and_approvals.md`, section 8): evidence files for "11 of 11", "0 of 21", "about 450" and "15 of 15".

**Loaded once, at the start.** A session reads the approvals from the copy of the repository it is handed when it starts. Four recorded facts:

- Each of the owner's five edits to his approvals in Process3 stopped every long-lived session, and after the last the product never restarted (`working/trial_plan_facts.md`, line 299).
- On 5 Nov the owner started ROOT on the correct branch, and the cloud handed it a saved copy of that branch about an hour old: seven changes behind, and without the approvals he had committed sixteen minutes earlier. ROOT noticed and stopped; another session sent it one message, it fetched the newest copy, and it carried on. On 8 Nov the same happened with the same saved copy (sixth draft, `definition/process4_definition_v6.md`, line 416, from a worker's check of Process3's log on 14 Nov). A start by commit id landed fresh, 1 of 1 (`working/design_work_18nov/owner_acts_and_approvals.md`, section 2). Why the cloud did so was never learned.
- In Process3 he did not start ROOT with a plain prompt: he pasted the starting text Process3's tool printed (the same line of the sixth draft). His hint of 14 Nov for Process4 (`owner_words/bob_words_14nov_c.md`): "ROOT starts with the product repo, which contains the needed approvals in CLAUDE.md and settings.json". So a ROOT started by a plain prompt has no earlier example, and the design marks it unproven (design part 4, section 2).
- A session started by hand from a branch that did not carry the working approvals "held no approvals and was refused session starts" (the same worker file, section 2).

These are the grounds for two lines the design marks "Claude decided": that ROOT's first act is to fetch the newest copy of its branch (design part 4, section 2), and that an edit to the approvals goes with a restart of ROOT (design part 6, section 2). The earlier form of this background gave the second with no mark. What the edit does to a running round was owed; it is now in design part 4, section 7. Whether approvals that reach a session after its start count the same as those read at the start is not proven (design part 7, section 3).

**Where they live, and the wording.** Marked "Claude decided" and open with the owner, in that order (design part 6, section 2). The worker's proposal, with what was accepted and declined in Process3 behind each phrase, is `working/design_work_18nov/owner_acts_and_approvals.md`, sections 4 to 6. What the worker took from the table above: name each act in so many words; say "including sessions that other sessions started"; say "without a person's review"; name the tool as the route.

## 3. Forbidden commands and GitHub's rules

- A command on the deny list is removed from the session outright (measured 1 Nov; one probe, eight acts). An allow rule changed nothing under the unattended mode: allowed acts were still judged (`evidence/foundations_tranche_9nov.md`, line 194; the worker file, section 2).
- A session loads the deny list only when it holds one repository and starts from a branch that carries it (`evidence/foundations_tranche_9nov.md`, line 224).
- Sessions acted on GitHub as a second account with write access and no admin rights. The sessions' route to GitHub refused a write to branch rules 2 of 2 (the worker file, section 3).
- Nobody has read the live GitHub settings of any repository. What is recorded is what Process3's guide asked the owner to set.

The earlier form of this background said flatly that a change touching only a lane's folder merges without a test run. See part 5, section 6.

## 4. The owner's acts to start a product

The design lists ten acts in order, marks the order "Claude decided", and says none has been carried out for Process4 (design part 7, section 4). The grounds are in `working/design_work_18nov/owner_acts_and_approvals.md`, section 3.

**What Process3 asked of him.** Eleven steps in one sitting, interleaved with acts of the architecture session. The guide itself is on another branch and was not read; only other files' accounts of it were.

**Why each act cannot be a session's.**

| Act | Why it is his |
|---|---|
| A second GitHub account for the sessions | GitHub's terms ask that a person set up a machine account and answer for it. Without it sessions act as the owner and no GitHub rule holds them |
| Write access for that account | Only the repository's owner can change collaborators |
| The repository's settings, and the rule for every branch | A collaborator cannot change settings, and his approvals forbid sessions to |
| Connecting Claude to GitHub as the second account | No session has a tool for it. On 5 Nov the connection was first made as his own account and no job ran for 94 minutes (`working/k_evidence.md`, line 133) |
| The deploy token and other secret values | Only he holds the values, and the design keeps them out of every session's sight. Values reach only sessions started after they are saved |
| Committing his approvals and forbidden commands, in the process's repository and in the product's | They are his words; a session that wrote them was refused 2 of 2 |
| Starting ROOT | A session is started only by a person, by another session, or by a scheduled task, and a task's fresh session could start none, 0 of 3 |
| The rule for the main and tranche branches, last | It stops direct commits, and the required test run must exist before it can be required |

**Not known.** Whether the last act can be done before ROOT is started; whether a rule can name a required check that has never run; whether his app can start a session at a commit id (the worker file, sections 3 and 8).

**A product moving over from Process3** has more acts, which belong to that product's conversion plan.

## 5. The deploy token

**Why sessions deploy at all.** The owner's word of 2 Nov, as his Foundations record it (`evidence/foundations_tranche_9nov.md`, line 226; a session's record): "The process deploys so walkers can run, so a project runs unattended only if it can deploy". The same line says the cloud environment's variables were "the one route both the deploy tools and setup check were measured to read (2 Nov)".

**Who can read it.** The earlier form of this background listed this as owed. The design now answers it, marked "Claude decided": the token is for the development account only, only ARCH's instructions name deploying, and nothing physical keeps the value from another session in the same environment (design part 9, section 2). Process3 was the same: "Jobs share that environment" (the Foundations line above). A session can read the variables' names, never the values (`working/design_work_18nov/owner_acts_and_approvals.md`, section 2).

One loose end the worker noted, from the platform's text and not tried: PROCESS, started by a session, inherits its starter's cloud environment, so it would hold the product's deploy token (the same file, section 6).

## 6. Working with the permission checker

The design keeps three working rules that exist because of the checker (design part 6, section 4). What was measured behind each:

- **The checker is not steady.** The same call passed and failed minutes apart (`evidence/ledger_lines.md`, line 24). Before the owner's approvals were committed it refused archiving, timer edits and interrupts "at random"; after, it passed each 15 of 15 (`evidence/foundations_tranche_9nov.md`, line 192; no evidence file found for the 15 of 15).
- **One judged act for each command.** "the only judge refusal in rounds 2 to 4 fell on a chained merge" (measured 2 Nov; the same file, line 211).
- **Three refusals in a row stop a session,** which then waits for a person (measured 1 Nov; the same file, line 194). The harness's documentation also hands a session to a person after 20 refusals; that is documented, not measured.
- **The two kinds of refusal** are distinguished in Process3's Foundations (line 196): an act the checker refused, and an act a session's own model declined because its starting text did not name it. The measurement there: jobs "took in-repository work from their coordinator's messages, and declined unforeseen outward acts" (1 Nov).

**What twenty clean merges can show.** The trial tries twenty or more merges by the tool (design part 10, section 4, item 2). Zero refusals in 20 bounds the true refusal rate only below about 14 percent (estimated; `working/trial_plan_facts.md`, line 45). The same file works out that at Process3's best day of 135 merges, a rate of 1 percent is more than one refusal a day, and that bounding the rate below 1 percent needs about 300 clean merges. So the trial cannot show that merges pass at a real rate; the design says only the first real tranche can (design part 10, section 5).

## 7. The platform: what the design rests on, and how each is known

The earlier form of this background said the process stands only on platform behaviour that has been measured. That sentence was Process3's (`evidence/foundations_tranche_9nov.md`, line 190), and it is not true of the design as it stands. The design rests some lines on behaviour it says is not measured, and says so in each place (design part 7, section 1).

| Behaviour on Claude Code | How it is known | Where |
|---|---|---|
| One thing runs for about thirty minutes inside a session | Measured in Process3 | `evidence/foundations_tranche_9nov.md`, line 192 |
| A fresh session started by a scheduled task could not start sessions | Measured, 0 of 3 | `evidence/permissions_inventory.md`, as cited in the worker file, section 3 |
| New starts failed silently at about 50 live sessions | Measured 1 Nov, one event | `evidence/foundations.md`, line 179 |
| Sessions created only down to a limited depth | Measured in Process3 as depth 0 to 2. The limit of eight in the design was seen once and has no record this writer could find | Part 5, section 4, of this background |
| A worker cannot start workers | Seen once, 18 Nov | `working/reading_measurements/RESULTS.md`, section 7 |
| A plain read returns a file whole up to 25,000 tokens; a file over 256 KB is refused | Measured 18 Nov, one model, one window | The same file, section 2 |
| The fill level can be read by the session | Process3 read it | `working/process3_limits_18nov.md`, section 6 |
| Sessions listed by a tag; each session's title and state; model and effort named at the start | Read in the tools' own descriptions. Not measured | Design part 7, section 1 |
| A session's browser reaching the development site | Not shown | Design part 7, section 3 |
| A program run by a session reaching GitHub at all | Process3's tool did, about 700 merges' worth (section 2). The design records that on 18 Nov one session reported the GitHub program's sign-in invalid in its environment, and another was told to use it for searching only. This writer found no working file that records either report | Design part 7, section 3, which calls this the first thing the trial must show |
| Where cost can be read | Not found | Design part 7, section 1 |

On Codex the matching table is design part 8, section 1, with a column saying how each row is known. The three things of section 1 above have no shown carrier there. The owner asked for that to be studied (`owner_words/bob_words_16_17nov_codex_development.md`): "Experience in Claude tells me that it's very important that you get this right. So don't guess or assume. Your work here should be load-bearing." No result of that study is in the repository (`working/codex_shortcomings_to_fill.md`).

## 8. GitHub's limits, and the suspension of 6 Nov

**The owner's rule for Process3,** 6 Nov, as his Foundations quote him (`evidence/foundations_tranche_9nov.md`, line 71; a session's record): "If github publishes limits, then we should introduce process3 tooling that conforms to those limits. But rather than limiting usage to a small fraction of github's stated limits, I'd suggest that the tooling limit usage to 80% or 90% of github's published limits. That feels like the proper balance." Asked on 14 Nov how GitHub's limits are kept to in Process4, he answered: "same as in process3" (`owner_words/bob_words_14nov_c.md`).

**The suspension.** GitHub suspended the sessions' account on 6 Nov without warning. Use of the primary limit never passed about 12 percent. The peak before it was 1,387 pushes to one branch in 19 hours (`working/k_evidence.md`, line 324). The earlier form of this background listed the cause as owed. It was never learned, and the design lists it among the risks with no trial (design part 10, section 6). The shared state's design removes the branch that took those pushes (part 5, section 8); whether that removes the risk cannot be shown in advance.

## 9. Never measured, and not found

- Any act under the wording proposed for Process4. No session has loaded it.
- Merges, pushes and writes of the shared state by the Process4 tool, which is not built; and, before those, whether a program run by a session can reach GitHub at all.
- A record of the two reports of 18 Nov on the GitHub program, beyond the design's own line.
- The live GitHub settings of any repository.
- Why the cloud handed out an old copy of a branch; why the pushes of 8 Nov were refused; why the account was suspended.
- The evidence files for the counts of 2 Nov named in section 2.
- Process3's own guide of eleven steps.
- Everything on Codex that design part 8 marks not known.
