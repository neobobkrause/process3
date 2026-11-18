# Process4 Foundations, part 8: Changing the process

Length: 81 lines. Last section: "What Process4 does not carry".

## Only PROCESS changes the process

The process is changed in one place, a separate lane called PROCESS, and Bob works with it directly. His statement of this is one paragraph in `process4/owner_words/bob_words_14nov_b.md`. Its points are these.

- Process changes are often technical and detailed. PROCESS explains the nature of the problem and offers options. Bob explores them and chooses.
- Changes need Bob, and he may be away from his computer for long periods. So more than one change may be waiting at once. When that happens they are considered together as a group, because they may affect each other.
- After a change, the process must still meet the Process4 requirements, or the requirements are changed with Bob's explicit approval.
- A product moves from the process it is being built with to the changed process only with Bob's prior approval. PROCESS proposes the best and least disruptive way to make the move.

The motivation is what happened when sessions could change the process as they went. Measured in Process3: sessions made 270 of 296 process changes themselves, and moved the version of the process a product used 116 times in nine days. Measured: checks were added in 41% of Process3's merges. Bob's finding is that this growth is why no tranche finished (part 2).

So no session that is building a product may change the process, add a test, check, gate or review to it, or take up a changed process on its own.

Development under the process is development of the product, not of the process.

## The rule PROCESS works under

A change to the process may correct or remove what is broken. It may not add a test, a gate, a review or a stop. The tests are closed (part 2).

Three more rules apply, all from part 1. Caution is a cost, paid only against a measured failure or Bob's word. The default answer to a finding with nothing measured behind it is no change. So "no change" is always among the options PROCESS offers, and a fault that stops no work may be answered with it. And a workaround is not a fix. Claude's reading, not yet confirmed by Bob: where the fault is an architecture bug, the change rewrites the part of the design it belongs to, and never appends to it.

PROCESS writes Bob's approving words into its record exactly as typed, with the date. Nothing else counts as his approval. Claude decided this.

## How a process fault travels

A job that meets a fault in the process reports it to ARCH. The fault goes from ARCH to the coordinator, and from the coordinator to PROCESS. If PROCESS is not running, ARCH asks ROOT to start it. Bob's outline of this route is in `bob_words_14nov_c.md`.

Claude decided: the description of the fault is written once, by the session that met it, and is passed on unchanged. Writer's reading: this is the same care taken with Bob's words in part 7. A description rewritten at each step drifts from what was seen.

A process fault that stops work waits for Bob at PROCESS. How often that happens can be shown only by the first real tranche.

## What holds the rule

Bob rewords his approvals in the process's repository to say that a process change is merged only on his word given at PROCESS. Nothing enforced by GitHub is added.

So the rule is held by words: Bob's approvals and each session's instructions. Claude Code: the permission checker reads those approvals and protects them (part 9). Codex: what stands in for the permission checker there is not yet known. See `process4/working/codex_shortcomings_to_fill.md`.

## One fixed version for each tranche

The process has its own repository. A product names one fixed version of the process, and a tranche runs on that version from its opening to its end. Each session fetches a read-only copy of that version. The product's sessions work on one repository, the product's.

The version a product names moves only with Bob's prior approval, by the means PROCESS proposes. ARCH makes the move. A job held up by a process fault is not started over. Once the product has moved to the corrected process, the same job carries on.

PROCESS works in the process's own repository. The process's tool has tests of its own, which run only when PROCESS changes the process (part 2).

## Process4 develops itself

Process4 develops itself. Bob asks that its development reach the point where its own constructs can be used for its further development. He expects that to make better use of calendar time, of his time and of tokens. His words are in `bob_words_17nov_fresh_context_and_process_self_development.md`.

- PROCESS may have lanes of its own for standing subjects, as needed. Claude's reading, not yet confirmed by Bob: PROCESS starts its own lanes.
- A hard open question gets a session of its own, with a written brief and a bounded task. That session ends with a written result once the result is usable.

## When a new model version arrives

When a new model version arrives, PROCESS puts one question to Bob. It asks which parts of the process may no longer be needed, and which of the working rules that exist because of the permission checker may no longer be needed. Those working rules are in part 9, and the permission checker is a Claude Code construct.

Nothing is removed or tried unless Bob says so.

Writer's reading: parts of the process exist to cover shortcomings of the models and harnesses of the day. A better model may make a part needless, so the question is asked. It is asked of Bob so that a change to the process stays his decision.

## What Process4 does not carry

Process4 keeps its own bookkeeping small. It does not carry any of the following.

- A count of false "done" claims.
- A session with no memory between wakes.
- A line-by-line test of instruction files.
- A written receipt from each job of the commands it ran.
- A set-up check before a job starts.
- Records of reading and cost for each job, a cost alarm, or a job record in a fixed format.
- A check of records, or a check for oversized or temporary files.
- A rule that every rule cites a measured failure.
- An audit of whether sessions read documents whole.

Writer's reading: each of these served the process and not the product. The measured cost in Process3 supports leaving them out. Measured: 105 of 508 merges changed nothing but job records. Measured: the job's receipt caught nothing in 1,187 test runs. Measured: a cost figure made compulsory blocked every job's completion for 45 minutes. Measured: the set-up check refused every job start after Bob applied new settings.

Cost is still reported where it can be read, in the account after each round and in the report at the end of a tranche. It is a reported number and never a target.
