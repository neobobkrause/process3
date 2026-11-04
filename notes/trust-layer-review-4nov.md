# Trust layer design review, 4 Nov 2026

Read-only review of tranche f9e82ad, asked for by the coordinator on Bob's word: "a design
review of the trust layer, aimed at simplifying it, not adding to it." No code was changed.

Scope read in full: tool/lib/gate.mjs (548 lines), merge.mjs (706), record.mjs (415),
anchor.mjs (95), workflows.mjs (296), shims/ (process-gate.yml, process-record.yml,
process-dev-release.yml, settings.hooks.json, CLAUDE.process.md), and what they call to decide
trust: github.mjs verifyRow, checks.mjs (generated rows), basered.mjs, found.mjs foundOnly,
p3.mjs record-check. Between 7f50bdd and f9e82ad these trust files grew by 1,527 lines and lost
152 (git diff --stat); workflows.mjs, anchor.mjs and basered.mjs are wholly new.

The security outcomes every proposal is measured against:
- O1: no unreviewed code reaches a trusted branch (main, the tranche).
- O2: no session can widen its own approvals (approvals block, .claude/, config anchored keys).
- O3: the gate runs from a trusted base (its code and policy cannot come from the change it judges).

One framing point first. README.md:129 says the tool's checks hold against mistakes, and that
"deliberate attacks by a session with Write access are held by GitHub's walls (rulesets,
required checks, ...), not by the tool." Most of the 4 to 5 review rounds on approvals,
workflows and generated files were spent closing deliberate constructions (a U+2028 line break
in YAML, two config edits that compose in a line merge, a PR retargeted after its run, a side
branch dated ahead). Either the README's line is the policy, and much of that code can go, or
the tool is meant to stop a hostile session, and then the README is wrong and the walls need
measuring. Bob should pick one; the proposals below assume the outcomes O1 to O3 still hold
against a hostile session, and say where they lean on a wall.

## 0. Fix first: one place where O3 does not hold today

shims/process-dev-release.yml:133-135, job publish, reads the tranche's name from the pushed
commit's own config (`git -C repo show "$GITHUB_SHA:process/config.json"`) and then checks the
commit is an ancestor of `origin/<that name>`. A commit whose config names its own branch
(for example `"tranche": "p3dev-release/x"`) passes trivially. The same step takes
process_repo, the pin and `release.sign_secret` from that commit, and the job holds
`contents: write` and the named secret. Separately, a push trigger runs the pushed commit's
copy of the workflow file, so no check written inside this file can bind a session that can
push the branch: it can push a different file.

Simplest fix, which also removes code: trigger the release by `workflow_dispatch` on the
tranche ref (`gh workflow run process-dev-release.yml --ref <tranche>`), so the file, the
commit, the config and the pin all come from the trusted branch, and put the signing secret in
an environment whose deployment branch rule allows only the tranche. The ancestry check and the
branch-name version parsing go; the version becomes a dispatch input. Lines: about -10 in the
shim, release.mjs `version --branch` simplified. Risk: low. Tests: release.test.mjs, shims.test.mjs.
This needs Bob for the environment (sessions may not change it).

process-record.yml:30 has the same shape (tranche name from the pushed commit) but it is not a
required check, so it only misreports; it can read the name from origin/main's config instead.

## 1. Where each check reads its code and policy today

| Check | Code (tool) from | Policy (config, ledger) from | Workflow file from |
|---|---|---|---|
| gate, job gate | base's `.process` pin (process-gate.yml:57); head's pin at bootstrap (:58); the tranche's pin for the tranche into main when it descends on process3 (:76-87) | base's config (:64), head's at bootstrap (:65); gate.mjs:59 `lastConfigAt(base)`; bootstrap takes the head's RUN_KEYS (gate.mjs:55-71) | the merge commit, so the head's |
| gate, ledger entries and ownership | as above | **the head's** ledger (gate.mjs:103 `entriesAt(root, head)`, used for ownership at :110 and scope) | head's |
| gate, job post | base's pin only (process-gate.yml:151) | base's config | head's |
| record check in the gate | base's pin | `loadConfig(root, base)` (p3.mjs:413); record_since from the head (record.mjs:137); take-in tips from the head's metrics (record.mjs:172) | head's |
| process-record (push) | origin/<tranche>'s pin, else the pushed commit's (:203-204) | the pushed commit's config names the tranche (:30) | pushed commit's |
| record-pr (process3 only) | main's tool | main's config | main's (pull_request_target) |
| merge (job PR) | BOB's checkout of the tool | `loadConfig(root)`, the **working tree** (merge.mjs:118); entry from the merge base (:157) | n/a |
| merge --plain | BOB's tool; `processRepo()` is the tool's own clone (merge.mjs:448) | base's last config (:610), base's ledger (:632), base's generated rows | n/a |
| close workflows (rules 1 to 4) | BOB's tool | structure from the base's copy of each workflow (workflows.mjs:293); record_since from the head (:233); pin and gate shim at each gated commit (:216) | n/a |
| dev release | pushed commit's pin | pushed commit's config, tranche name and secret name (:133-141) | pushed commit's |
| setup check | the pin | settings.hooks.json at the pin | n/a |

Today there are at least six different answers to "what is trusted": the base commit, the
base's last config, the head (bootstrap), the tranche's pin (into main), the working tree
(merge), and the pushed commit (release, record push).

**Proposed single rule.** Code and policy come from the current tip of a trusted branch, read
by name from origin: for a pull request into X, the tip of X; for the tranche into main, the
tranche tip itself (it is a trusted branch, and the head must equal it). The tool is the
`.process` pin at that tip; config, ledger entries, generated rows and the owner are read from
that same tip. Nothing in the head is read except as data being judged. A missing config or pin
at that tip fails closed; there is no fallback.

What the rule removes or simplifies:
- The tranche-into-main pin exception (process-gate.yml:68-87, 20 lines): replace with one
  test, `HEAD_SHA = origin/<tranche>` tip, then the tranche's pin judges.
- Bootstrap routes (section 2, item B).
- `lastConfigAt` (anchor.mjs:66-70) and its four callers: a deleted config fails closed.
- merge.mjs:118 reads the working tree's config; it should read `origin/<tranche>`'s.
- gate.mjs:103 reads the head's ledger for ownership; reading the base's (as merge already does
  at merge.mjs:157) makes the gate and merge agree.

## 2. Special cases, carve-outs, bypass flags and tolerances

Each with where it is, what it protects, and whether a general rule makes it unnecessary.

A. **Tranche cover** (gate.mjs:336-404 trancheCover, :423-458 jobMerge, :413-422 branchBound,
github.mjs:148-156 the `merged` branch of verifyRow). Protects the 45 min cap on the tranche
into main by skipping suites of files a green job merge already gated. Needs title regexes,
tree equality, PR reads, branch binding against retargeted PRs, provider-change propagation.
General rule that removes it: every tranche commit's tree is a gated merged result by
construction. merge already gates the merged result for job PRs (merge.mjs:200-210); require
"branches up to date" on the tranche's ruleset so plain PRs are too, and make a PR's gate scope
include modules that use the changed ones (the provider rule, moved to scope selection). Then
the tranche into main only checks that the tip's merge was gated green (one verifyRow) and
reruns what was tolerated on the way. Needs Bob's ruleset change.

B. **Bootstrap, the first close** (process-gate.yml:55-65 and :149-152; gate.mjs:44-71
gateConfig and RUN_KEYS; merge.mjs:525-535 bootstrapHead, :612-618, :674-678, :682; anchor.mjs:72-73
isBootstrap). Protects a product whose main has no Process3 yet. General rule: onboarding ends
with Bob's own website commit putting `process/config.json` and `.process` on main, so no base
is ever without Process3. One owner act per product, which README's Onboarding already asks of
him (values confirmed once). Check first: if civicsmith-copy's main now holds both files (its
first close landed on 4 Nov), this route is dead code for the only product.

C. **record_since and earlier work** (record.mjs:125-150 recordSince, :247-249 onBase, :362-376
the record_since half of the config check; workflows.mjs:222-240 earlierWork; p3.mjs:415).
record_since is "used only while the base has no config" (record.mjs:138). Under B's rule every
base has a config, so recordSince always returns null and all of this goes.

D. **Take-in tips** (record.mjs:152-221 takenIn, p3.mjs:416-419, job.mjs:837). Protects the
record check from flagging pre-Process3 commits that a take-in merged. General rule: a take-in
brings earlier work in as one new commit of its tree (not a merge of its history), so no old
commit is ever in a checked range. The old branch keeps its history. Removes about 70 lines
and the six-step honour test.

E. **Base-red tolerance** (gate.mjs:186-200; basered.mjs, 114 lines; revertCheck `tolerated`
gate.mjs:526-547; receiptAgrees base-red branches :296-303; job.mjs callers). Protects a PR
from failures already on the base. Under A's rule the tranche is green at every tip, so
base-red only covers flakes and drift. It can go once A holds; until then keep it. Highest
risk to throughput, so ranked low.

F. **Records-only fast paths for a ready job PR** (gate.mjs:124-152 sinceGreen, stands,
receiptRun; :309-320 measuredBy; :254-256 refresh carry-over; :266-275 receipt measured;
merge.mjs:299-306 unagreed). Protects gate minutes on records-only pushes. Three review rounds
(copy PRs 105, 247). General rule: a ready job PR's gate always runs its module's suite; keep
the record fast path only for drafts and plain PRs. Cost: one suite run per records-only push on
a ready job PR, which merge's merged-result push mostly triggers anyway.

G. **Generated-file refresh by a plain PR** (gate.mjs:120-127, :240-262; checks.mjs:96-120
refreshOthers, refreshCheck; merge.mjs:573-584 refreshGate, :646-662). Protects committed
generated files from hand edits. Five review rounds (PR 95). General rule: no module's generated
file is committed. JOB-8 already forbids a job committing one (checks.mjs:70 committedGenerated),
and buildGenerated (gate.mjs:172-179) builds untracked rows before the suite, as deploy and
release do. Extend JOB-8 to every PR and the refresh route goes. Bob's 4 Nov approval for the
design stream already allows "stop committing a generated file ... and have it built where it
is needed".

H. **Found marks in a requirement file by a plain PR** (merge.mjs:633-645; found.mjs:51-89
foundOnly, a markdown diff parser). found.mjs already has a second home for marks,
`process/found/<module>.md` (found.mjs:15-17), which is a records path. General rule: found
marks always go there. The exception and foundOnly go; the module's requirement file stays
job-only.

I. **Close workflow changes, rules 1 to 3 and shapes S1 to S3** (workflows.mjs, all 296 lines;
merge.mjs:504-516 the `close` branch). See section 3.

J. **Approvals and settings across merges** (record.mjs:105-123 introduced with guarded and
judged; :259-283 landed, onTrusted, cleanFrom, mergeBases; :322-333 fromTrusted, carried
"review A"; :52-71 ownerBlock per ref). Protects O2 for merge commits that carry an old block
from one side. See section 3, item 2.

K. **Anchored config keys** (anchor.mjs:8-59 keyAt, keySetAt, unanchored; :81-95
mergedUnanchored, a merge-tree composition check; merge.mjs:473-489 pinChange). Protects O2 for
process_repo, tranche and approvals. Duplicated: record.mjs:362-376 judges the approvals key in
the config again, per commit, with its own JSON reading. See section 3, item 3.

L. **Size waiver** (record.mjs:350-355, :388-401). Oversize blobs up to 2x the limit are waived
when the head is within it. Reasonable and small; keep.

M. **Shallow cuts** (record.mjs:232-236, :298-305). Keep: fails closed, 10 lines.

N. **Draft read live** (gate.mjs:85-101). Keep: small, fixes a measured race.

O. **mergeRowSince rerun path, job cost rerun** (merge.mjs:25-29, :140, :197-218). Not trust;
bookkeeping. Out of scope, noted for the next simplification pass.

## 3. Allowlists of exact shapes or hashes instead of parsers

1. **Workflow YAML (workflows.mjs).** It reads YAML as lines with an LCS diff (`hunks`,
   :69-93), detects run blocks, path lists and matrix rows by regex (:104-149), and judges each
   hunk (:152-188), plus plainText for line-break tricks (:50-64), plus rule 1, which walks the
   tranche's first-parent history and binds each commit to a gated PR (:190-281). It took four
   rounds on PR 98. S1 already allows any shell inside an existing `run:` block, so the
   security it buys is "no new key, job, permission or event", which a frozen file gives too.
   Proposal: freeze every product workflow file. Each must equal the pin's shim, or a blob hash
   listed in an owner-set allowlist (a file only Bob's website commit changes, like the
   approvals). Product logic that changes moves out of YAML into scripts the frozen file runs
   (`run: ./ci/<name>.sh`, owned by a module, gated as code), and matrices and path lists into
   a JSON file read with `fromJSON`. Same reach as S1 to S3 today (arbitrary commands, no new
   jobs or permissions), no parser. Removes workflows.mjs (296) and the close branch of
   workflowChanges (about 10). One migration on civicsmith-copy, through PRs.

2. **Approvals block and .claude/ settings (record.mjs).** Judged per commit, with special
   handling for each way a merge can carry an old version. What lands on a trusted branch is
   the head's tree, and process-record on push is advisory, so the per-commit walk does not buy
   O2 for trusted branches. Proposal: judge the net state. For each guarded path (approvals
   block, .claude/**, .mcp.json, config approvals), the head's version must equal the trusted
   tip's (base, origin/main or origin/tranche), or the newest first-parent commit that set it
   must be the owner's website commit. Keep the per-commit walk only for size and transient
   paths, which history keeps. Removes introduced's guarded logic, cleanFrom, carried, landed,
   mergeBases and most of ownerBlock: about 120 lines. The "approv" word heuristic on any
   CLAUDE.md line (record.mjs:358-361) is a markdown parser of intent; under the net rule,
   any change to an instruction file outside its owner-set version could need the owner's
   commit instead, which is one blob comparison.

3. **Anchored keys (anchor.mjs).** Move process_repo, tranche and approvals out of
   process/config.json into their own file (process/anchor.json). Rule: its blob at the head,
   and in the merge-tree result, equals the base tip's blob, or the commit that last set it on
   the head's first-parent history is the owner's website commit not already in the base.
   Blob comparison replaces keyAt's JSON reading, duplicate-key handling and per-key loops, and
   drops record.mjs's duplicate config-approvals check. About 50 lines.

4. **Gate rows (verifyRow, checkRow, postRow).** Already close to an allowlist: a fixed set of
   fields with exact validators (gate.mjs:463-470) and a byte comparison with the run's own
   artifact. Keep as it is.

5. **Ledger and metrics JSON.** Read with JSON.parse as data, not to grant trust beyond
   ownership paths; under section 1's rule the paths come from the base. Keep.

## 4. Dead or duplicate code

- gate.mjs:288 `if (pr && post) io.addComment(...)` and p3.mjs:271 `post: !a['no-post']`: the
  shim always passes `--no-post` (process-gate.yml:109), so the gate never posts in CI. Posting
  from the process that ran product code is the very thing the two-job split forbids, so the
  default is the unsafe one. Remove the flag and the post; postRow is the only writer. 4 lines.
- merge.mjs:28 re-exports `isBootstrap, keySetAt, processRepoSetAt` from anchor.mjs; only
  tests import them from merge (merge.test.mjs:427). processRepoSetAt has no caller in the tool.
- Duplicate helpers: `blob` (workflows.mjs:39) and `blobAt` (anchor.mjs:10); `pinOf`
  (workflows.mjs:215) and `pinAt` (anchor.mjs:14); `JOB_MERGE` (workflows.mjs:35) and
  `MERGE_TITLE` (gate.mjs:335); `isJobRef` (workflows.mjs:37) and `isJob` (merge.mjs:441);
  `isAnc` twice (gate.mjs:445, workflows.mjs:48); `entriesAt` three times (gate.mjs:23,
  carry.mjs:20, merge.mjs:632 inline); the no-renames name diff three times (gate.mjs:34,
  merge.mjs:166 and :620, workflows.mjs:266); metrics `rowsAt` three times (merge.mjs:29,
  gate.mjs:435, record.mjs:184). About 30 lines into util.mjs.
- Two `takenIn` functions with different meanings (record.mjs:172 tips, carry.mjs:24 PR
  numbers). Rename one.
- Two implementations of "the approvals in the config changed": anchor.mjs unanchored (key
  `approvals`) and record.mjs:362-376. Section 3 item 3 keeps one.
- Two ownership checks: gate.mjs:110 from the head's ledger, merge.mjs:157-167 from the merge
  base. merge's is the one that holds (BOB's tool); the gate's is early feedback and should
  read the base (section 1).
- `waitForGate` (merge.mjs:47) and `waitForChecks` (:542) are two waits with the same cap logic;
  one could take a list of names. Not trust, about 25 lines.

## 5. Proposals, ranked by lines removed per unit of risk

Risk: 1 low (behaviour for the current product unchanged), 2 medium (a migration or a
measured wall), 3 high (changes throughput or needs a new wall). Lines are estimates of
non-test .mjs and shim lines removed, net of what replaces them.

| # | Proposal | Lines | Risk | Ratio | What could break | Tests that cover it today |
|---|---|---|---|---|---|---|
| 1 | Retire bootstrap and record_since: onboarding ends with Bob's website commit of config and pin on main (2B, 2C) | ~175 | 1 | 175 | A new product cannot onboard without that one owner act | gate-bootstrap.test.mjs (7), bootstrap-close.test.mjs (10), record.test.mjs record_since cases (40 mentions), close-workflows.test.mjs (2) |
| 2 | Freeze product workflow YAML: shim or owner-allowlisted hash; logic in scripts (3.1) | ~300 | 2 | 150 | The copy's workflows need one migration; a matrix change becomes a JSON change | close-workflows.test.mjs (14), shims.test.mjs, merge.test.mjs workflow cases |
| 3 | Dead and duplicate code, including removing the gate's in-process post (4) | ~60 | 0.5 | 120 | Nothing in CI; tests that import from merge.mjs move | gate.test.mjs, merge.test.mjs, github.test.mjs |
| 4 | Tranche gated by construction (ruleset up to date on the tranche, reverse-dependency scope); drop the tranche cover and the tranche-pin exception (2A, section 1) | ~150 | 2 | 75 | Needs Bob's ruleset change; plain PRs must be brought up to date before merge; larger PR gate scope | main-gate.test.mjs (17), shims.test.mjs |
| 5 | A ready job PR's gate always runs its suite; drop measuredBy and record-since-green for it (2F) | ~70 | 1 | 70 | More gate minutes on records-only pushes | gate.test.mjs, merge.test.mjs unagreed cases |
| 6 | Never commit module generated files; drop the refresh route (2G) | ~100 | 1.5 | 67 | Anything that reads a committed generated file must build it first (design stream files) | generated-plain.test.mjs (19), generated.test.mjs, checks.test.mjs |
| 7 | Approvals and settings judged at the head's net state (3.2) | ~120 | 2 | 60 | A commit in a range that briefly carried an unapproved block is no longer named (it never reaches a trusted branch) | record.test.mjs, record-tranche-merge.test.mjs, shallow.test.mjs, setup.test.mjs |
| 8 | Base-red goes once 4 holds (2E) | ~180 | 3 | 60 | A flaky or drifted tranche blocks every PR until fixed forward | base-red.test.mjs (22), gate.test.mjs |
| 9 | Take-ins as one tree commit, drop takenIn tips (2D) | ~70 | 1.5 | 47 | Old commit authorship is on the old branch only | take-in-record.test.mjs (14), job.test.mjs take-in cases |
| 10 | Found marks only under process/found (2H) | ~45 | 1 | 45 | Readers of marks in requirement files read both places until moved | found.test.mjs, merge.test.mjs found cases |
| 11 | Anchored keys in their own file, compared by blob (3.3) | ~50 | 1.5 | 33 | One config split migration in each product | anchor.test.mjs (7), merge.test.mjs pinChange cases |
| 0 | Dev release by workflow_dispatch on the tranche, secret in a tranche-only environment (section 0) | ~10 | 1 | n/a | Needs Bob for the environment | release.test.mjs, shims.test.mjs |

Item 0 is a correctness fix for O3 and should go first whatever else is chosen. Taken
together, items 1 to 11 remove roughly 1,300 lines, most of what the trust layer gained since
7f50bdd, with O1 to O3 held by fewer rules: one trusted base (section 1), frozen workflows,
net-state approvals, and a tranche that is green at every tip.

Things that need measuring before relying on them: whether a user-owned repository's rulesets
can require "up to date" on the tranche with the current merge tool's flow; whether Actions
environments with a branch rule hold a signing secret away from pushed branches on this plan;
and whether civicsmith-copy's main already holds config and pin.
