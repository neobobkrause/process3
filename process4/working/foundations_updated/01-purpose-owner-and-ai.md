# Process4 Foundations, part 1: Purpose, the owner and the AI

Length: 84 lines. Last section: "Words used".

## Status

Process4 is proposed. It goes on trial when Bob accepts it. On trial it is used for the trial repository and for the first real tranche. It is in force after the first real tranche ends, on Bob's word. Nothing is in force on the day it is written.

These parts give the background to the design: the motivations behind it and the conclusions it rests on. The design document is what sessions follow. Where a part and the design document differ, the design document rules.

## What the process is for

Process4 is the way AI sessions build a software product for Bob, the owner, in a GitHub repository. It can do so with nobody watching.

It has one output: product behaviour that meets its requirements, merged to the main branch quickly and cheaply, and still there later. Nothing else is output. A rule, a record or a test has value only as far as it serves that output.

A product starts as the description of a need. The need is described from the view of the audiences who share it, though their interests differ. The process serves the standards Bob sets in two roles.

| Bob's role | What Bob sets | Where the process carries it |
| --- | --- | --- |
| Product manager | The audiences, and their requirements, use cases, priorities, journeys, perspectives, resources and styles | The product's founding documents, each module's requirements file, the Screens document and the journeys, and a design lane for each design area Bob identifies |
| Software engineer | The standards for architecture, user experience, reliability, versatility, scalability, performance, responsiveness and cost | The ordered list of modules, the module tests and the two walks, the technical decisions ARCH records, and cost reported where it can be read |

The process names no product. A product's own facts are kept with that product.

## The owner and the AI

Bob is human and the sessions are AI. The process uses the strengths of each.

Bob defines the product: its purpose, audiences, requirements, principles and broad design. The AI decides everything technical and tells him in plain words what it decided. Where a matter sits between the two, both give opinions, options and recommendations, and neither is dogmatic.

Bob's time is the scarcest resource. Five conclusions follow.

- Only what is Bob's reaches him. A technical question is never brought to him.
- A question that is his is put once, in one fixed form, with options and a recommendation (part 7).
- An act only he can take is named and walked through in plain steps.
- Work does not wait on him unless only he can clear the way. A stop is recorded as a named blocker and other work goes on. One that only he can clear is told to him at once. Measured in Process3: one question that sessions treated as his waited about nine hours.
- No merge needs him. He may ask to hold or to approve one particular merge. That is unproven.

A question that is Bob's becomes his decision, and then a design, before anything is built on it.

These conclusions rest on Bob's working rules for sessions, in `process4/owner_words/bob_words_14nov_b.md`; on his third message in `bob_words_15nov_main.md`, which asks to be walked through what he needs to know in plain words with context; and on his words about unattended work in `bob_words_16_17nov_codex_development.md`.

## The owner's acts

Bob enters no commands and edits no source files. His acts are few.

- He starts the first session, ROOT, at each start or restart of development.
- He tells the coordinator things, and marks the messages that are decisions or instructions (part 7).
- He approves or changes what a tranche is for, before it opens (part 4).
- He says when a tranche that does not come clean stops, and what becomes of it (part 4).
- He approves a release (part 4).
- At PROCESS he chooses among the options for a change to the process, and approves a product's move to the changed process (part 8).
- Very occasionally he changes a permission or rule setting in GitHub or in the product's hosting account.
- Claude Code: he commits his standing approvals and the list of forbidden commands himself, on GitHub's website. He connects Claude to GitHub and enters secret values into the cloud environment, from a page the process writes (part 9).

A worked list of each act asked of Bob at the start, in order and in one piece, is owed (part 10).

## How problems are handled

Caution is a cost. It is paid only against a measured failure or Bob's word. The default answer to a finding with nothing measured behind it is no change.

A flaw in the product that a walk finds becomes work for a named module in the next round (part 4). A fault in the process is never fixed or worked round by a session that is building a product. It goes to PROCESS, where Bob chooses (part 8).

## The shape in one paragraph

Git and GitHub hold all state. Bob starts ROOT, and ROOT starts the standing roles. The coordinator is Bob's front door. One architecture session for each product, ARCH, directs the work and keeps what needs judgment. The process's own tool does whatever has one right answer. Short job sessions each build one module as one pull request, up to eight at a time. The tests are the module tests, the internal walk and the external walk, and nothing is added to them. A tranche is built apart from the main branch and reaches it only as a whole. A release can follow a tranche that has ended. Only PROCESS changes the process, and only with Bob. Every text that must be read in full is kept below a measured maximum size. Long-lived sessions are refreshed on purpose before their context fills. Rules are held by each session's instructions and by the harness's permission checker.

## Words used

- **Session:** one running AI conversation in the harness's cloud.
- **Harness:** the AI coding product the sessions run in. Process4 is designed for two: Claude Code and Codex. A statement marked "Claude Code:" depends on that harness.
- **Pull request:** a proposed change to a repository, which GitHub can test and then merge. A draft pull request is one not yet offered for merging.
- **Module:** one part of the product, with its own code files, tests and requirements file.
- **Provider and user:** a module whose services another module uses is that module's provider. The module that uses it is its user.
- **Job:** one session's work on one module, delivered as one pull request.
- **Slot:** room for one job to run.
- **Tranche:** one batch of product work, built on the tranche branch, apart from the main branch.
- **Round:** one pass within a tranche: jobs, then the internal walk, then, if that finds no flaws, a deployment and the external walk.
- **Internal walk:** a walk of the product as built, not deployed, against the Screens document.
- **External walk:** a walk of the journeys on a development deployment, which reaches no one but the walkers.
- **Mechanical edit:** one change that touches many modules in the same trivial way and needs no judgment.
- **The process's tool:** the small tool through which sessions reach GitHub.
- **"Claude's reading:"** marks an interpretation in the design that Bob has not yet confirmed. **"Claude decided:"** marks a technical matter the AI settled and reported. **"Writer's reading:"** marks an interpretation made by the Claude worker that wrote these parts.
