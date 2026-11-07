# Builder handoff (session_018Bhcef7TXuVjVZ4eN1SCzE), 7 Nov ~05:40Z

Development in this account is shutting down (Bob, 7 Nov). Each item: branch, head, state, next step.
Rules this builder followed: push only with `p3 github push`, merge the tranche in (no rebase),
full suite (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 node --test 'tool/test/*.test.mjs'`)
before each push, one cold review per change, root cause and class prevention in each PR body.

| Item | Branch | Head | State | Next step |
|---|---|---|---|---|
| C5 follow-up: state line logs replay (github/use) | build/append-only-state | 2ad2a86b | PR 232 open; suite 1117/1117; cold review done, findings fixed | merge and pin |
| R17g / PD-6: only GitHub's published limits and refusals brake | build/limits-only-github | e55bcd4c | pushed; full suite was running at shutdown (pace, gh*, lane, cap, status, sweep, merge tests 175+ green); a cold audit was running (result not received); no PR | reassigned to builder ef1pxNY: run the suite, take the audit (sleeps, waits, hook 120 s cap, pushRetry, poll/MAX_WAIT), open the PR with the brake table below |
| C19: record check credits the owner's settings commits a merge carries in (copy layer/10, PR 759, gate run 42342325211) | build/settings-credit (this branch) | this note only | not started | in the record check, judge a merge's .claude/settings.json change against its other parents (what the merge introduces): a change that a parent's history already holds through the owner's website commit (or that comes from the tranche) is the owner's; still refuse a merge or commit that introduces its own change; reproduce on the copy's layer/10 (15 commits, e.g. carrying 314c284a2d from copy PR 755); tests for both cases |
| C20: setup check's deploy-token reads a Cloudflare 429/5xx as missing | (none) | — | not started | tool/lib/setup.mjs deploy-token (~line 250): only 401/403 or 200 with success false is missing; a 429, 5xx or no answer is "unknown (Cloudflare <status>, retry-after N)", printed, not a gap; find why the copy's Cloudflare account hits 1200 requests/5 min; if setup checks drive it, cache a present answer per clone for an hour; tests for each case |

## R17g brake table (as built at e55bcd4c)
| Brake | Basis | Action |
|---|---|---|
| reserve() pushes window (PD-3, 120/h) | none published | removed: pushes counted, held only by GitHub's pause or stop |
| budgetGate() pushes refusal | none published | removed |
| pacing.pushes_per_hour / jobs / lanes (copy sets jobs 8) | none published | retired: accepted, ignored, noted; job cap is jobCap's (P3_JOB_CAP, default 20) |
| gh_interval_ms floor on every call | GitHub guidance: 1 s between mutative requests | writes only (points >= 5, not notes); reads and pushes never spaced |
| poll back-off 30 s to 300 s | none published | fixed 30 s (poll_most_s = poll_first_s) |
| limitSignal bare 429 paused/stopped the account | not GitHub's own refusal | only GitHub's words, a 403/429 naming a rate limit or carrying its headers, or a 429 from api.github.com |
| primary at target, REST points/min, content/min and /h | published (GITHUB_LIMITS, target 85%) | kept |
| pause and stop | GitHub's refusals | kept |
