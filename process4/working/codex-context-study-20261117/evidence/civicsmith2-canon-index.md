# The requirements canon

**Status** · APPROVED by Bob 2026-09-25 (TRANSITION.md T3), as drafted by BOB #37 the same day, including its three calls: unreviewed drafts are canon as they stand, a document named by section is canon only there, and Bob's DEC rulings are canon. The canon is the one place every module's requirements cite, by section (PROCESS-MECHANICS §1, P5). Files stay where they are until T8 moves them here. A document listed "by section" is canon only in the sections named; the rest is history. AMENDED at T18's opening by a worker for BOB #75, 2026-09-30 (K608 (1)): `BIO_Action_v0_1.md` listed as canon (whole), and Case Making's canon part narrowed as its §6 says. AMENDED 2026-10-05 by BOB #111 (K1432): `BIO_Capability_Ladders_v0_1.md` listed as canon (whole). AMENDED 2026-10-11 by a worker for BOB (K2780): `BIO_Action_v0_2.md` listed as canon (whole) in place of `BIO_Action_v0_1.md`, which is kept as history; Case Making's action sections are governed by v0.2.

## Canon

**Mission and product requirements**

| document | canon part | one line |
| --- | --- | --- |
| `docs/architecture/BIO_Complete_Roadmap_v5.md` | §§1–12 | the mission of record: values, operational principles, trust hierarchy |
| `docs/architecture/BIO_Design_Requirements_v2.md` | whole | the fifteen design requirements; the system fails if any is violated |
| `docs/architecture/BIO_Functional_Architecture_v3.md` | the functional analysis, not the v3 annotations | Information, Analysis, Action: every function a group needs, and where human judgment is required |
| `docs/architecture/BIO_System_Design.md` | whole except §3's state column | the whole system at level 0: every construct and its home document |
| Bob's product rulings (DEC-n), in `docs/development/DECISIONS.md` and quoted in the home documents | each ruling | binding doctrine; at T6 each ruling a module rests on is cited in its requirements |

**Construct designs (level 1)**

| document | canon part | one line |
| --- | --- | --- |
| `docs/architecture/BIO_Content_Framework_v0_10.md` | whole | content: extraction substrate (Part I) and the content, meaning and retrieval model (Part II) |
| `docs/architecture/BIO_Intake_Doctrine_v1_1.md` | whole | how material enters the record: provenance, the intake contract, capture grades |
| `docs/architecture/BIO_Membership_Architecture_v2.md` | whole | members, administrators, capabilities, invitations, projects, verified export |
| `docs/architecture/BIO_Case_Making_v0_1.md` | whole except §2's action paragraphs and §THE ACTION PLAN (history since K608; `BIO_Action_v0_2.md` governs them, K2780) | the inquiry, the claim, the case |
| `docs/architecture/BIO_Investigation_v0_1.md` | whole | the project as an investigation (under construct 8): the objective and its condition, steps, saving steps and questions, the system's part, AI use, the first message, narrative and evidence, people, and what is new in publishing a case (K2417, K2419, K2420) |
| `docs/architecture/BIO_Action_v0_2.md` | whole | the Action layer (construct 16): standards, determinations, consequences and success records, action plans, actions, filings and communications, escalation (K2780; its design in `docs/development/actions-design/`; replaces `BIO_Action_v0_1.md`, kept as history, K608 (1)) |
| `docs/architecture/BIO_Declared_Bias_v0_1.md` | whole | bias as a declared, justified construct; hunch debt; masking safeguards |
| `docs/architecture/BIO_Interaction_Constructs_v0_1.md` | whole | QUEUE and ACT, the rung ladder, UNDETERMINED as a display primitive |
| `docs/architecture/BIO_Assistant_and_AI_Roles_v0_1.md` | whole | the assistant and the AI roles |
| `docs/architecture/BIO_Publication_v0_1.md` | whole | publication, audiences and communications |
| `docs/architecture/BIO_Distribution_v0_1.md` | whole | installer, releases, fleet, multi-instance |
| `docs/architecture/BIO_State_Rules_Consistency_v1_5.md` | §3 onward | the record's shape and rules: ids, schemas, state machines, relationships, invariants I-1…I-20 |
| `docs/architecture/BIO_Technical_Architecture_Decisions_v10.md` | the general rules, not the mechanisms | the technology decisions that remain live |
| `docs/architecture/BIO_Bundle_Skill_Composite_Design_v1_7.md` | the bundle format, promotion semantics and C-series checks | the format the plane must still satisfy |
| `docs/architecture/BIO_Capability_Ladders_v0_1.md` | whole; a rung not yet built is a planned design, re-verified when its stage is planned (K1432) | the capability ladders of time, organisations and obligations, people, events, money, law, courts, analysis, questions and actions (§9A, K2780): every need found, every rung L0–L5 with its design, what must exist first, realism and performance, and the decisions it raises (all ruled, K1494; the backward question deferred by Bob, D-165); every construct to L5 (B1 (c)) |

**Construct detail (level 2)**

| document | canon part | one line |
| --- | --- | --- |
| `docs/development/CONTENT-EXTENT-DESIGN-SPACE.md` | §6 and the doctrine it records | the content-extent primitive, as built |
| `docs/development/CONTENT-SEARCH-DESIGN.md` | whole | searching content |
| `docs/development/OBSERVATION-LOG-DESIGN.md` | whole | the observation log |
| `docs/development/EXTRACTION-BREADTH-DESIGN.md` | whole | what extraction produces, by document kind |
| `docs/development/MEMBER-KNOWLEDGE-DESIGN.md` | whole | what members know, and how it enters the record |
| `docs/development/CONTRADICTION-IDENTIFY-DESIGN.md` | whole | identifying contradictions |
| `docs/development/INVESTIGATIVE-SESSION.md` | whole | the AI run that searches evidence and suggests basis versions |
| `docs/development/ASSISTANT-PILOT.md` | whole | the assistant workflow |
| `docs/development/RETRIEVAL-SUBSTRATE.md` | the five settled design questions | the retrieval surface's specification |
| `docs/development/DOCUMENT-PROFILES.md` | whole | document profiling |
| `docs/development/OFFICE-FORMATS.md` | the format axis as ruled | the format registry |
| `docs/development/AUTHORITY-AND-TRUST.md` | the RULED sections | authority and delegated trust in capture and publication |
| `docs/development/LINK-FIDELITY.md` | whole | contemporaneity of captured links |
| `docs/development/ARCHIVE-FALLBACK.md` | whole | what a web archive can and cannot attest |
| `docs/development/SOURCE-ACCESS.md` | the rulings | access parity and the allowlist |
| `docs/development/CAPTURE-FIDELITY.md` | whole | subresource capture |
| `docs/development/CLIENT-RENDERED.md` | whole | capturing client-rendered pages |
| `docs/development/INBOX-GRAMMAR.md` | whole | the inbox contract |
| `docs/development/NOTIFICATIONS.md` | whole | the notification catalogue, classes and item contract |
| `docs/development/UI-KICKOFF.md` | the principles, not the phase description | Bob's UX principles, verbatim |
| `docs/development/SCHEDULER.md` | whole | the plane's periodic work |
| `docs/development/MULTI-INSTANCE-ISOLATION.md` | whole | what must not collide between instances in one account |

## Reference, not canon

Kept and citable as evidence. Never cited as a requirement.

| document | why not canon |
| --- | --- |
| `docs/development/STORE-AS-CACHE.md` | research; its adopted tables live in the Content Framework Part II §14.2–14.3 |
| `docs/development/RETRIEVAL-PROBE.md`, `docs/development/CAPTURE-SCALING.md` | measurements |
| `docs/development/PRACTICE-SURVEY.md` | a survey of other tools |
| `docs/development/research/README.md`, `DATA-MODEL.md`, `RECONCILED.md` | the case-making research; Case Making v0.1 is the design |
| `docs/development/UI-PLAN.md` | a plan whose state is stale; its intent is in the Interaction Constructs and UI-KICKOFF |
| `docs/architecture/BIO_Communications_Platforms.md` | an April 2026 platform selection that predates the plane |
| `docs/architecture/CONSTRUCTS.md` | a dated inventory of July 2026 |

## Retired by the new process

| document | replaced by |
| --- | --- |
| `docs/architecture/BIO_Membership_Architecture_v1.md` | v2 (superseded 2026-07-26); removed 2026-09-25 at Bob's direction, readable on `snapshot/pre-refactor-2026-09-25` |
| `docs/architecture/CORPUS-STANDARD.md` | P5 and PROCESS-MECHANICS §3 |
| `docs/architecture/README.md` | this file |
| `docs/architecture/construct-status.json` | the build state (`build/`) and each module's tests |
| `docs/development/FINDINGS-WORKPLAN.md` | the plan (`build/plan/`) |
