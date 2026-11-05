# Receipt re-gate: options (build/receipt-regate, 5 Nov)

## The defect

A job whose gate went red on revert findings runs `job complete <id> --exempt-revert "<why>"`
again. Its branch is at the COMPLETE commit, so `finish` takes the amend path: no commit, no push,
an amended receipt comment, and `markReady` only if the pull request is a draft, which it is not.
The gate workflow (`shims/process-gate.yml`) runs on `opened, synchronize, reopened, edited,
ready_for_review, converted_to_draft`; a comment is none of these. The red gate on the head
stands, and merge (`jobChecks`: the newest `gate` check run on the head must be `success`, and a
green row must agree with the newest receipt's attempt) and the train (`ready`: `checkRun` on
the head must be green) wait for a person's re-run (copy PRs 462, 471, 488, 490, 492, 5 Nov).

What the gate reads from an amendment: only `receipt.exempt.revert` (gate.mjs line 218, and
`measuredBy`). `not_verified` is never read by the gate. The receipt's `attempt` and `sha` stay
the same through an amendment, so merge's `receipt_attempt === receipt.attempt` still binds.

## Options

### A. job complete gives the pull request a new `edited` event (a body edit)

After an amended receipt is posted, job complete PATCHes the pull request's body (`editPR`,
already used by take-in, so the job's account can do it) to carry one marker line naming the
receipt comment, e.g. `<!-- p3:regate --> Gate re-run for the amended receipt <comment url>`,
replacing an earlier such line. GitHub fires `pull_request: edited`; the gate runs on the same
head with a fresh payload: today's base sha and the base's pin, and it reads the new receipt.

- Gate runs: one full run per material amendment, the same as today's hand re-run. No extra run.
- Time: the gate's own time (to 40 min for plane/control-plane); no person in the loop.
- Taken rows / gate rows by head: the head does not move, so the train's review notes
  (`train-notes.jsonl`, keyed by head), BOB's `--reviewed` note and every row keyed by head
  stand. A new run is a new check run, so the train's refused key (`pr@head@run`) changes and
  the train judges it again, as after a hand re-run.
- Fresh base: unlike an Actions re-run, `edited` carries the base as it is now (merge.mjs line 370
  already names "edit the pull request" as the way to give the gate a new event).
- Concurrency group `process-gate-<pr>`, cancel-in-progress: a run already going (which read the
  old receipt at its start) is cancelled and replaced. Wanted.

### B. job complete re-runs the red gate run (Actions API, `gh run rerun`)

- Gate runs: one, as A.
- A re-run replays the old event: the old base sha and the old base's pin (merge.mjs line 370).
  If the tranche moved, the run judges a stale base; `lastGreen` (keyed on `r.base === base`)
  and the revert base are the old ones.
- Needs `actions: write` on the job's account and a run id lookup by head; the job's acts
  name commenting and marking its own PR ready, not workflow control. Re-run attempts share the
  run id and overwrite the `gate-row` artifact (`overwrite: true`), so `verifyRow` reads the
  newest attempt: fine for the newest row, but an older posted row from the same run id would no
  longer verify. More moving parts than A for no gain.

### C. An empty (or records-only) marker commit

- Moves the head: `synchronize` fires one gate run, but every head-keyed record breaks: BOB's
  train note and `--reviewed` are for the old head, the train backs off/refuses by head, and
  job complete reads commits after the COMPLETE commit as a new attempt (`again`), which the
  amend path was built to avoid (copy PR 40: the amendment commits nothing). An empty commit to
  kick CI is also against the process's own rule. Rejected.

### (D.) Gate keyed by head sha plus receipt hash

Not a trigger on its own: something must still give the gate an event. As a guard it adds
nothing today: an amendment only loosens (adds an exemption) or adds not-verified lines the gate
ignores, so a green row stays true, and merge already binds the row to the receipt's attempt.
It would also add a row field, which an older pin's `checkRow` at job post may refuse (no
comment posted). Not recommended.

## When A fires (the failure cases)

job complete gives the `edited` event only when all hold:

1. The newest receipt carries a revert exemption (the only amended claim the gate reads). An
   amendment that adds only `--not-verified` lines changes nothing the gate judges: no re-gate.
2. The newest `gate` check run on the head is not green: none, completed non-success, or in
   progress but started before the newest receipt comment (it read the old receipt). A green
   gate is left alone, so a pull request the train holds (it takes only green heads) never gets
   a new run under it, and its land is not delayed by a check going pending.
3. No marker line already names this receipt comment, so a rerun of job complete after a
   failed edit edits again, and a rerun after a good edit does nothing (idempotent, as the rest
   of `finish`).

A failed PATCH stops job complete with "run job complete again"; the receipt is already posted,
so the rerun posts nothing and only edits. A cancelled run (a newer event) is handled by GitHub's
concurrency group as today. A plain pull request has no receipt and is untouched. The first
complete keeps its route (draft, then `markReady` fires `ready_for_review`); a new attempt keeps
its push.

## Recommendation

A, with the three conditions above. It removes the person from the loop at the cost of exactly
the one gate run a person would have started, keeps every head-keyed record, judges the current
base, and uses a call the job's account already makes.
