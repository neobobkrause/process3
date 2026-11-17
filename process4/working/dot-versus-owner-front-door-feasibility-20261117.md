# Process4 first-class session feasibility: dot and owner-created front door

**17 November 2026. Status:** assistant research and proposed small experiments, not owner approval/adopted Process4 design. Builds on [Decision C](codex-first-class-feasibility-20261117.md). The owner supplied two options: use Dots if viable; or create one owner-visible front-door chat whose only role is communications conduit over Process4's existing session-message channels. No claim of direct runtime access has been tested.

## Official Dot evidence

- https://learn.chatgpt.com/docs/dots/tasks-and-memory — a dot can create **separate visible cloud threads**, send follow-up instructions, and run/coordinate background agents while owner talks with dot; owner can also open and directly steer created threads.
- https://learn.chatgpt.com/docs/dots — Dots gradual availability by plan/region/workspace. Eligible Pro/Business Premium delegated Codex use draws from ordinary Codex allowance; Enterprise charging may differ. Do not assume this account has Dot access.
- https://learn.chatgpt.com/docs/dots/computers-and-apps — Dot can use a previously prepared Codex Cloud environment for software work; owner can interact with the separate tasks.
- https://learn.chatgpt.com/docs/whats-new/dots-october-9-2026 — release notes say Dot can start and follow up Codex threads.

**Still not established:** account entitlement, account's own ordinary Codex sidebar listing, assignment to product project, general native inter-session message bus from unrelated Codex roles *to* Dot, peer-to-peer communication, trusted unattended relay of arbitrary Process4 messages, event-driven delivery latency, or original owner-facing independent session controls after completion. Documentation proves product possibility, not this account's end-to-end Process4 requirements.

## Owner-created front-door hypothesis

One **manually created ordinary, visible chat** acts as minimally stateful communications interface; standing roles and authoritative product/process state remain elsewhere. On each turn the front door reads compact checked routing contract and current role bindings, forwards exact owner wording, and returns correlated attributed replies. No product decisions, canon interpretation, grants, process adoption, or session-memory authority. Core message ID, recipient verification, approval provenance and transport live in deterministic tools/controller, not a model instruction that compaction could forget.

**Potential advantage:** front-door compaction does not directly discard binding canon if no authoritative decisions are stored only in that conversation and all relevant routing controls are reloaded and enforced on each turn.

**Critical unknown:** does a manually created top-level Codex session have a **supported** tool path into the existing bootstrap's child-only native messaging tree, including reactive idle recipient wake and return replies? Native followup previously worked only for addressable descendants within a managed tree; manually created peers are not automatically addressable. It may be easier for an owner-created console to spawn its **own** child tree, but that returns to a single-console UI rather than independent visible first-class role sessions.

**Compaction warning:** Even a conduit can mistransmit or fabricate authority after compaction. It is not enough that it remembers "I am the front door". Verify source reload and deterministic routing/authority checks each turn, especially exact owner approvals and pending messages. Use bounded prompts/turns and refresh where possible.

## Small decisive experiments

### Test 1: Dot visibility and continuation (only if account already eligible)

Have the owner start one dot using existing supported UI and supply one bounded prompt asking it to create **one read-only, independently visible Codex cloud task** in an already configured environment, capture the task URL/ID, and after task completion send a follow-up to that same thread. Owner checks ordinary Codex list and messages thread directly. Record whether the dot can respond to that direct owner turn and follow up later. No paid API, credentials, product writes or new grants. If Dot unavailable, mark ENTITLEMENT_UNAVAILABLE; no speculative alternative subscription purchase.

Then conduct a second gated **reactive inter-session** test: a different supported Process4 role tries to send a real identified message to Dot-created thread through a documented message method. Distinguish Dot's ability to follow up on Dot-owned tasks from general arbitrary peer access. If no supported cross-role interface, mark PEER_ROUTING_UNPROVEN even if independent creation passes.

### Test 2: Owner-created conduit to existing native roles

Owner creates **one independent test chat** (or use an already existing manually created test chat) and grants no new privileges. Execute one read-only addressed request to an actual *existing* Process4 role via a supported native tool; record canonical message ID, actual target generation, observed wake, role reply and correlated response. Verify no Github per-message write. Repeat after a completed turn. If the separate chat cannot access the prior agent tree, stop: **NO_SUPPORTED_CROSS_TREE_ROUTE**, not a guessed success. Do not claim typing a message in another chat or manually copy/pasting constitutes native reactive transport.

**Possible alternate scope, if owner accepts:** use newly owner-created console as sole root of a *new* native hierarchy. That can recover mediated interaction but does **not** satisfy earlier independent-first-class visibility of every role. Do not silently replace the earlier requirement with it.

### Decision grid

- Dot creates visible persistent tasks + Dot followup + owner direct interaction: first-class owner experience is demonstrated **for Dot-owned threads**. Inter-role reactive communication needs its own evidence.
- Owner-created conduit reaches existing role tree with attributed native reply: owner-console relay demonstrated without old bootstrap. Independent role-list presence remains unsatisfied unless owner expressly changes requirement.
- Neither works: existing Decision C stands; pause migration dependent on first-class session orchestration.
- No entitlement or no tool exposed: report a bounded blocker and exact minimal owner prerequisite, not universal impossibility.

Use existing subscription only; no separate Agents API, paid VM, purchased credits, credential reads, speculative login changes, or changes to CivicSmith2 and Claude implementation.
