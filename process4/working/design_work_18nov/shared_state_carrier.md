Length: 131 lines. Last section: "8. Proven and not proven".

# What on GitHub carries the shared state

Written by a Claude worker on 18 Nov 2026. A worker's findings and a proposal, not the owner's words. Nothing here has run. It answers the open line in part 4, section 4 of the seventh draft.

Labels: **[repo]** read in this repository today. **[doc today]** GitHub's documentation fetched today through a page summariser, so the quotations are as that summariser gave them. **[memory]** what I know without a source in hand. **Not verified** means nobody has shown it.

## 1. The short answer

- Use the first candidate: one issue in the product's repository, each record one comment rewritten in place.
- It fits three of the design's four demands on GitHub's documented behaviour: an edit is one request with no merge and no commit; all records come back in one listing call; the volume is a small fraction of the published limits.
- One demand is not met by GitHub and cannot be: GitHub has no compare-and-swap on a comment, so two writes to the same record at the same moment can lose one. Six of the eight records have one writing session, so they are safe. The two that "the tool" writes (Round, Waiting work) are written from whichever session runs the tool, and are the risk. Section 5 gives the answer and section 7 the trial that must show it.

## 2. What Process3 used, and what went wrong

Process3 kept its shared state on an orphan "state branch" (`process-state`) in the product's repository, written by ordinary commits and pushes [repo: `evidence/foundations.md` line 114]. It held messages, heartbeats, layer rows, notices, a usage ledger, and deploy and walk reports [repo: `evidence/product_side.md` line 23].

What went wrong, all [repo]:

- **It built up.** 12,881 commits and 8,937 files in seven days (3 to 9 Nov). It was 70% of all 18,295 commits; 89% of commits were bookkeeping of some kind. Notices alone: 178 files, 3,125 triage files, 2,542 answered files (`product_side.md` lines 13, 23, 70; `causal_forensics.md` line 286).
- **It was most of the push traffic.** 1,387 pushes to that one branch in 19 hours on 6 Nov, 143 to 173 an hour at peak. Of 2,713 pushes the usage ledger counted, 1,936 (71%) were to the state branch (`levers_github_cloudflare_product.md` section 4.4; `product_side.md` line 76).
- **It measured itself.** The usage ledger, added to pace GitHub use, was 3,150 commits, 42.5% of state-branch commits over its life (`product_side.md` line 76).
- **Writers collided.** A rejected state-branch push was fetched and retried a bounded number of times (`foundations.md` line 135). The record code grew to 692 lines with pending-write replay (`levers` section 8.5).
- **Each record drew guards.** "Each record the process keeps ... needs guards on its form, its freshness and its writer, and each guard is a place the product can stop" (`causal_forensics.md` line 286).
- **The account was suspended** on 6 Nov, without warning. The cause was never learned. Primary API use never passed about 12% (`k_evidence.md` line 324; `levers` section 4.4).
- It could not be cleaned: sessions may not delete or force-push a branch (`foundations.md` line 114).

Measured facts about issue comments in Process3: **none.** Process3 posted receipts, gate rows, triage and notice comments on pull requests, and nobody counted them before 6 Nov (`levers` section 4.4, item 2). That document's advice was "no comment-as-record". It meant a new comment for each event. This proposal creates each comment once and then only edits it, which is a different load; section 3 says what is and is not known about how GitHub counts edits.

GitHub's published limits as recorded here [repo: `levers` section 4.1, from documentation] and re-read [doc today]:

| Limit | Value |
|---|---|
| Primary, per user | 5,000 requests an hour. The tool once read 15,000 for the sessions' identity (`k_evidence.md` line 324) |
| Points | 900 a minute for REST; a read costs 1, a `POST`, `PATCH`, `PUT` or `DELETE` costs 5 |
| Content creation | "no more than 80 content-generating requests per minute" and "no more than 500 ... per hour"; "Some endpoints have lower content creation limits"; the web interface counts too |
| Concurrent requests | 100 |
| Pushes, merges | 6 pushes a minute for each repository, 1 merged pull request a minute (recommended) |
| When exceeded | `403` or `429`; wait `retry-after`, else until `x-ratelimit-reset`, else at least a minute, then back off. "There is no way to check your secondary rate limit status" |

## 3. GitHub facts for the candidate

- **Edit in place.** `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}` with `body`. Returns 200. The comment keeps its id and its place. No commit, no branch, no merge. [doc today]
- **Read all in one call.** `GET /repos/{owner}/{repo}/issues/{number}/comments?per_page=100`. Default page 30, maximum 100, ordered by ascending id. [doc today] The state is about 12 to 20 comments (seven single records, plus one handover for each long-lived role and lane), so one page holds it.
- **Size of a comment body.** 65,536 characters; a larger body is refused with 422 "Body is too long". [memory, from the API's own error text] The REST page states no limit. [doc today] Whether the count is characters or bytes: not verified.
- **Size of the listing response.** Each comment carries about 1.5 KB of author and link fields besides its body. [memory] No documented limit on a response of 100 comments; not verified at full size.
- **Rate.** A create is content creation and "may result in secondary rate limiting". The update endpoint carries no such statement. [doc today] Whether an edit counts toward the 80 a minute and 500 an hour: not verified; assume it does. An edit costs 5 points either way.
- **Notifications.** Creating a comment: "This endpoint triggers notifications." The update endpoint says nothing. [doc today] An edit sends no notification to subscribers [memory, common experience; not verified]. An edit that adds a new @mention may notify the person mentioned [memory; not verified], so records name roles in plain words and never with "@".
- **Edit history.** GitHub keeps each earlier version of an edited comment, shown on the website. [memory] It is not in the repository and is not a file or a commit. Whether a comment has a limit on the number of edits, and whether history is reachable by the API: not verified.
- **No compare-and-swap.** REST writes take no `If-Match`. An `etag` works only for reads (`if-none-match`, and a 304 does not count against the primary limit). [doc today for reads; memory for the absence on writes] So the last write wins and an earlier one in the same instant is lost silently.
- **What one writer means.** If only one session ever writes a record, there is nothing to lose: it reads its own last write. All sessions act as the same GitHub account, so GitHub cannot tell writers apart; one-writer is held by the tool and by text, as part 6 section 1 already says of such rules.
- **Who can touch the comment.** Anyone with write access can edit any comment. [memory] On a public repository anyone on GitHub can add a comment to an open issue. Locking the issue stops people without write access; collaborators can still comment and, I believe, edit. [memory; not verified]

## 4. Alternatives

| Alternative | The facts that decide | Verdict |
|---|---|---|
| Issue body, all records in one text | One object for eight records and five writers: every write is read-change-write of the whole, with no compare-and-swap | Out |
| One issue for each record, body rewritten | Works the same as comments. Reading needs a list call with full bodies, and adds 12 to 20 issues to the product's issue list | In reserve, if comments fail |
| Repository variables | Session-writable on a personal repository [repo: `enforcement_levers.md` line 83]. One list call. Value limit about 48 KB and names are upper case only [memory; not verified]. Built for workflows; nobody can read them on a page | In reserve |
| A git ref moved without history | The only GitHub object with a true compare-and-swap (a non-fast-forward update is refused). But rewriting in place means overwriting history, which is forbidden; not overwriting means commits build up, which is Process3's fault again | Out |
| A gist | Belongs to an account, not the repository; "act on any other account or service" is forbidden in spirit, and it does not travel with the repository | Out |
| Labels | A name of about 50 characters and a description of about 100 [memory]. Too small for a record | Out for records; used once, to find the issue |
| A Projects field | Needs GraphQL and the `project` scope [repo: `levers` section 5.1]; a text field is small; several calls to read | Out |
| A file on the tranche branch | A commit and a merge for each write | Out by the design's own rule |
| A service on the hosting provider | A second tool with its own code and faults [repo: `levers` section 8.5] | Out |

## 5. The proposal

**Carrier.** One issue in the product's repository, titled "Process4 shared state", carrying the label `process4-state`. The issue's own body holds no record: only two fixed lines saying what the issue is and that the tool writes it. PROCESS's handover lives here too, so that one read gives ROOT everything. (Overruled since: the design and build text 5 keep PROCESS's handover in the process's own repository, and they rule.)

**Layout.** One comment for each record. Twelve comments at the start, more only when a lane is opened.

| Comment key | Record in part 4, section 4 | Writer |
|---|---|---|
| `roles` | Roles | ROOT |
| `lanes` | Lanes | The starter of the lane |
| `wakes` | Wakes | ROOT |
| `stop` | Stop | The coordinator |
| `standing-notes` | Standing notes | The coordinator |
| `round` | Round | The tool |
| `waiting-work` | Waiting work | The tool |
| `handover-root`, `handover-arch`, `handover-coordinator`, `handover-process`, `handover-lane-<name>` | Handover, one for each long-lived role | The holder of the role |

- **The mark.** The first line of each comment is `<!-- process4-record: <key> -->`. GitHub does not show it on the page. The rest is the record in plain words in a fixed order of lines, so the owner can read the issue as it stands. An empty record is the mark and the word "none".
- **How the tool finds it.** Once in each session: list open issues with the label `process4-state`, created by the sessions' account, and take the lowest number. It keeps the number in the session's working copy, outside git. If there is none, the tool run by ROOT creates the issue and all twelve comments, each empty, and locks the issue. Creation happens once for a product, so the notifications of creation happen once.
- **How the tool reads.** One call: list the issue's comments with `per_page=100`. It keeps only comments written by the sessions' account whose first line is a mark, and so ignores anything a stranger added. It keeps each comment's id beside its key. A missing key reads as an empty record.
- **How the tool writes.** One `PATCH` of that record's comment, by id, with the whole new body. Standing notes that have ended are removed in the same rewrite (part 4, section 4).
- **Size.** GitHub's ceiling is 65,536 characters [memory]. The design figure for a record is the single-text maximum of part 5, 24,000 bytes, since a successor must read a handover in full. The tool does not refuse a larger record; it prints each record's size when it writes, and GitHub's own 422 is the only refusal. Twenty records at the design figure are 480 KB in one response; real records should be a few hundred bytes each, except handovers and Waiting work.
- **Volume.** ROOT writes Wakes once an hour. A round writes Round and Waiting work perhaps a few times for each job. A day of eight slots is tens of edits, against 500 an hour. No session polls: a session reads the state when it starts, when a message wakes it, and at ROOT's wake.

**The two records the tool writes.** This is the one place the first candidate does not hold by itself. A job's tool run, at its merge, marks its module finished in Round and places notices in Waiting work; two jobs can do this in the same second, and one write can vanish. Three things together answer it, none of them a check or a stop:

1. The tool writes these two records by read, change, write with no pause between: it fetches the one comment fresh, changes it, and patches it. The gap is well under a second.
2. Round's "finished or blocked" half is worked out from GitHub's own record (merged pull requests on the tranche branch) each time the tool writes it. A lost write is put right by the next write, and by ARCH's tool run when it chooses the next job.
3. After its patch the tool reads the comment back once. If its own change is missing, it does the write again. This is the write finishing, not a gate: nothing waits on it and nothing is refused.

If the trial shows writes still lost, the fallback is to give Waiting work one comment for each module, so that two jobs never write the same comment. That costs more comments and is not proposed now.

## 6. A failed write

- `403` or `429` naming a rate limit: wait as GitHub says (`retry-after`, else `x-ratelimit-reset`, else one minute), then write again; double the wait each time, up to four tries. This is part 6, section 3: "obey GitHub's own rate-limit responses".
- `5xx` or a network failure: write again after a few seconds, up to four tries. A rewrite of a whole record is safe to repeat.
- `404` on the comment (someone deleted it): create the comment afresh with its mark and carry on.
- `422` (too long, or flagged as spam) or tries used up: the tool exits with the failure and GitHub's own text, and the record stays as it was. The session reports it as a process fault by part 6, section 6. The tool does not shorten the record, write it somewhere else, or carry on as if written.
- The tool never keeps a queue of pending writes. Process3's replay of pending writes is not rebuilt.

## 7. What the trial must show

In the trial repository, with the sessions' account, through the tool:

1. A record is rewritten by one request, with no commit, branch or pull request made, and the repository's commit count unchanged after 200 writes.
2. One listing call returns every record, with twenty comments present, and with every comment at 24,000 bytes.
3. A body of 65,536 characters is accepted and one of 65,537 refused; and whether the count is characters or bytes.
4. 200 edits to one comment at one a second: all accepted, no rate-limit response, the comment still loads on the website. This settles whether edits have a limit and gives the rate figure.
5. An edit sends the owner no notification, with him watching the repository; creating the issue and comments sends them once.
6. With the issue locked, the sessions' account can still edit and create comments, and a stranger's account cannot comment.
7. Two sessions write the same record at the same instant, 50 times: count the lost writes with and without the read-back of section 5. Then two jobs merge at once in a real round and both appear in Round and in Waiting work.
8. A fresh ROOT, given nothing else, finds the issue by its label and rebuilds from one read (this is item 4 of the trial in part 10).
9. The sessions' account is still in good standing at the end. Process3's suspension was never explained, so this cannot be shown in advance.

## 8. Proven and not proven

**Shown by GitHub's documentation, read today:** the edit and list endpoints exist as described; a page holds up to 100 comments; creating a comment notifies and is rate-limited as content; the limits in section 2; reads can use an `etag`.

**Shown by this repository's record:** what Process3 used and the counts of what went wrong.

**Not proven, nothing has run:** every line of section 5. In particular: the 65,536 ceiling and its unit; that edits send no notification; whether edits count as content creation; any limit on the number of edits to one comment; that a locked issue still takes the sessions' edits; that the read-back closes the lost-write gap for Round and Waiting work; how large Waiting work and a handover grow in a real round; and that the sessions' account stays usable. That the permission checker passes the tool's `PATCH` at a real rate is also unmeasured, as part 6 section 5 says of merges.

**A point for the design, not settled here:** the table in part 4 gives "the tool" as writer of two records, but the tool runs in many sessions. The design's sentence "each record has one role that writes it" is not literally true of those two. Either the proposal of section 5 stands, or the design says that only ARCH's session runs the tool's writes to them. That is PROCESS's and the owner's to settle, not this worker's.
