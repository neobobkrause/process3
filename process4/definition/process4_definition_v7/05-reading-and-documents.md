# Part 5. Reading in full, and the documents

Length: 61 lines. Last section: "7. Where things are kept now".

## 1. Reading in full

- A session acts only on what it has read in full or measured.
- Every text a session must read in full, and every set of texts read together, is kept below a measured maximum size. Nothing can ensure a full reading; keeping below the maximum reliably results in one.
- The maximums and the fill level are chosen by one yardstick: after a session has read what it must, there is room for a worthwhile piece of correct work and a handover before the fill level.
- The Codex maximums are used on both harnesses, because they rest on real measurements and Codex context windows are in effect the more constrained.
- Sessions are refreshed so that compaction is never needed. In the owner's words, the process has "session refresh requirements that rigorously eleminate the need for compaction".
- **Claude decided:** each governing text says at its top how long it is and what its last section is.

## 2. The four values

All four are **provisional**. They stand, on the owner's word, until a second measurement reports. **Reading:** these four are the values he meant by "these current values".

| Value | Provisional figure | What it rests on |
|---|---|---|
| The largest single text read in full | 24,000 bytes | The largest size shown to work on Codex. On Claude Code every size up to it was read whole, in a first measurement the owner judged too weak to rely on |
| The largest set of texts read together | 175,000 bytes | The largest set shown to work on Codex, on a set that was almost all filler. On Claude Code a set of 165,358 bytes was read whole, in the same first measurement |
| A role's starting text | 4,096 bytes, and at most ten rules | Proposed by Claude. "At most ten rules" is kept from the process before this one. Not measured |
| The fill level for a refresh | 40 percent | The owner's words of 17 Nov: "process4's policy of refreshing sessions when the context window exceeds 40% or more". Not measured |

- The first two are sizes shown to work. Neither is a size at which reading was shown to fail.
- **Claude decided:** where a harness shows no fill level (part 8), the refresh comes only at a natural pause.

## 3. Keeping texts under the maximums

- Each role's principles are concise, sufficient for the role to be performed correctly, and unambiguously clear. Whenever they are changed, every effort is made to keep them short enough to be read in full and not scanned. Where that cannot be done, the matter comes to the owner to find a solution. **Reading:** PROCESS brings it to him.
- **Claude decided:** the size of a role's starting text is a rule, not a refusal among the tool's tests.
- A module's requirements file is kept under the single-text maximum as a rule ARCH applies; ARCH splits the module when a file nears it (part 2).
- Nothing is refused for size.

## 4. The two documents

- The owner's ledger was a worksheet and is retired.
- There are two documents. This design document defines the design and is what sessions follow. A background document gives the background and context; it is the owner's Foundations brought up to date with the design.
- The design document names no product and carries no history. Its body, parts 1 to 6, names no hosting provider and uses harness-neutral terms. A table for each harness and for each hosting provider follows the body.
- Where one harness's side of the design is not yet known or not yet built, the design notes the shortcoming plainly and leaves it for the owner's work on that harness's account to fill (part 8).
- Each harness's own files are kept apart in the process's repository, and a change for one harness never alters the other's.
- The design document is kept up to date with the owner's decisions in the same step as each decision is recorded.

## 5. The records of decisions

- The owner's decisions about the Process4 design are kept in the process's repository, by PROCESS. His decisions about a product are kept by the coordinator. Each record has one writer. **Claude decided:** a product's record is kept in that product's repository.
- A record is ordered by subject. Each entry states the rule as it now stands, and a decision that changes an entry rewrites it in place.
- The owner's exact dated words are kept and never edited.
- A rewritten entry is shown to the owner once before it stands.
- **Claude decided:** ARCH's technical decisions are written in a second record in the product's repository, of which ARCH is the only writer.

## 6. Each product's ranking page

- Each product has one short page, kept by ARCH and read by every role, that ranks its kinds of governing text: mission, principles, standards, requirements, design decisions. **Reading:** mission is highest and design decisions lowest.
- A lower one never overrides a higher one. A session that finds two in conflict follows the higher and tells ARCH.

## 7. Where things are kept now

- The Process4 work is kept in a folder named process4, on a branch named process4, of the process3 repository. The work for both harnesses is on that same branch.
- The owner's typed words are in `process4/owner_words/`. The working Foundations are `process4/evidence/foundations.md` and `process4/evidence/foundations_tranche_9nov.md`.
- The figures behind section 2 are in `process4/working/harness_separation/` and `process4/working/reading_measurements/RESULTS.md`. The second measurement is briefed in `process4/working/reading_measurements/RERUN_PROMPT.md`.
