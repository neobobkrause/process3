# Restart speed: options for items 2 and 4 (build/restart-speed, 5 Nov)

## Item 2: a killed train cannot retake its own session's lease

Today the lease names the session and a per-process token; a new train in the same session is
refused as "another train in this session" until the lease lapses (15 min; 9 min lost 07:18-07:27).

- A. Record the train's process in the lease (pid, the container's boot id, and the process start
  time from /proc). A train in the same session takes the lease when that process is not alive on
  this machine: no such pid, another start time (pid reused), or another boot id (a new container).
  A live second train is still refused. Where /proc cannot be read, nothing changes (it waits).
- B. A lock file under .git held by the running train; the same session may take the lease when
  the file's lock is free. Misses a second clone in the same session and a file left by a kill
  (the same stale-lock problem item 5 names).
- C. A `--retake` flag the MERGER passes after it checks no train runs. Fast, but a session's word
  decides, and a wrong one runs two trains.

Chosen: A. It decides from the machine, not a session's word; a live train (same pid and start
time) is always refused; other sessions are judged by the lease time as now.

## Item 4: after a train merge, the next start of that module cannot push job/<id>

Found in job start: in a shallow clone (BOB's), whether the branch's last attempt merged is asked
of GitHub against the tranche's name, the tip now, while the new attempt is cut from the anchored
tip read earlier. When the train lands the module's pull request between the two (a provider's
merge then reopens it for its notice), GitHub says merged (ahead 0), the cut lacks that merge, and
the push of job/<id> is not a fast-forward. A full clone counts against the anchored tip and
refuses instead.

- A. Count against the anchored tip's sha (GitHub compare takes a sha), as the cut is; when the
  branch is behind the anchor only because its own merge landed after it, anchor again once and
  count again. A branch truly off the tranche goes on as today (an abandoned attempt: a fresh
  branch with its why recorded; an open pull request: refused with its route).
- B. Count against the anchored sha only. The race reads as an abandoned attempt and cuts a fresh
  branch job/<id>-<n> with a wrong why in the record, a branch per race.
- C. Cut from the tranche tip now instead of the anchored one. Skips the approvals and pin check
  of that tip, which the anchor's confirming review forbade.

Chosen: A. One tip decides both the count and the cut, the anchor's checks hold, and the race
costs one more anchor instead of a hand choice.

Question for the coordinator: if plane's branch held a merged result that never landed (the
killed train's push, its pull request closed), say so; A already starts that case on a fresh
branch by itself when it is a reopen.

## Built (after the 10 minutes, no answer)

Item 2 as A. Item 4 as A, and a second cause the test found: in a depth-1 clone the tranche tip
the start is cut from has no parents, so git itself cannot see origin's job/<id> below the new
commit and refuses the push as not a fast-forward even when it is one. Before the push, the
tranche is deepened (doubling, then whole) until origin's tip is provably below HEAD.
