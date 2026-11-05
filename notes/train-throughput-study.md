# Merge-train throughput study (5 Nov 2026, measured 05:20-05:30 UTC; read-only, no build)

Asked by the coordinator (session_01RAN5emGGSGfSPCvNY5yUpv) under Bob's standing approvals. Nothing in code or config was changed. Sources: the copy's process-gate runs (GitHub API, 1,000 runs, 14:33 on 4 Nov to 05:20 on 5 Nov; jobs and steps of the 706 that completed and were not cancelled), the job log of plane's gate run 41964261627, `metrics/train.jsonl` on the copy's `process-state` branch, the copy's PR list into `tranche`, `build/modules.json` and `process/ledger/plane.json` at the tranche tip, and process3's `tool/lib/{gate,merge,train,suite}.mjs` at `origin/tranche` (86a12f1).

## Bottom line

- **The serial train cannot keep up, and no reordering will fix that.** Serial capacity is 60 / (mean gate + about 1 min overhead) = 60 / (6.2 + 1) ≈ **8 PRs/h**. Job PRs are arriving at **11-15/h** today. The queue grows by 4-7 PRs an hour. It was 15 at 05:20 and is 21 at 05:27.
- **Most gates are short. The long ones are a few large modules.** The median full gate (suite ran) is **3.9 min**, the p90 12.7, the mean 7.4. Plane takes 42 min, control-plane 40, and screens-inquiry 20 (p90 36). One plane gate stops the train for 42 min while about 12 small PRs could have merged.
- **Recommend F = C + B + E-for-plane:** speculative parallel gates 4 deep (C), the window filled shortest-expected-gate first with a 45-min aging cap (B), and plane's gate cut (E, the plane-only levers below). Simulated at 12 PRs/h, steady state: **11 PRs/h (it keeps up), green->merged median 6.8 / p90 11.8 min**, against the baseline of 8.7 / 33.7. Gate strength is **the same as today's per-PR gate**. Each PR is gated on exactly the tree it lands as.
- **Batching (D) is worse than serial here and is not recommended.** Option E as worded (scope to the changed modules and their dependants) **is already how the gate works, and narrower**: a job PR's gate runs only its own module's suite. The time is inside plane's own suite, not in its scope.

## 1. Measurements

### Gate minutes (process-gate, job "gate", 706 completed runs, 4-5 Nov)

| set | n | median | p90 | max | mean |
|---|---|---|---|---|---|
| all completed runs | 706 | 1.1 | 7.7 | 44.8 | 3.5 |
| job PRs, suite ran (gate step > 1.5 min) | 253 | **3.9** | **12.7** | 44.8 | **7.4** |
| median per module (71 modules) | 71 | 3.5 | | | |
| the PR mix of the last 24 h (145 job PRs, each module's full-gate median) | 145 | 3.6 | | | 5.2 |

Most runs take about 1 min. These are records-only or draft runs, which skip the suite.

Slowest modules (full gates):

| module | n | median | p90 |
|---|---|---|---|
| plane | 7 | **42.3** | 44.8 |
| control-plane | 1 | 39.8 | 39.8 |
| screens-inquiry | 10 | 19.7 | 36.1 |
| reading-pipeline | 6 | 11.5 | 38.1 |
| screens-settings | 11 | 10.6 | 11.6 |
| agent-worker | 8 | 9.6 | 18.0 |
| screens-daily | 5 | 9.0 | 29.1 |
| interface-shell | 12 | 8.7 | 9.1 |
| store-assembly | 11 | 8.4 | 10.4 |
| everything else | | 1-7 | |

Share of all gate minutes: plane 12%, screens-inquiry 9%, then about 4-5% each for the next four.

The 15 PRs queued at 05:20 add up to **about 102 serial gate minutes**. Plane (42) and agent-worker (9.6) are 51 of them; the other 13 take about 3-5 min each.

### Where plane's 41 min go (run 41964261627, PR 175, 03:52-04:33)

| phase | minutes | note |
|---|---|---|
| checkout, pin, record check, browser | 0.6 | browser cached (3 s) |
| npm ci and the generated files built before the suite | 1.6 | words-reads.json alone takes 59 s |
| **plane suite** | **34.3** | `node --import ./test/platform-sqlite.mjs --test` over 92 files on one 4-vCPU runner (node's default concurrency is 3) |
| base-red check | 3.2 | rebuilds the generated files at the base (1.3 min), then re-runs the 3 failing tests there |
| regenerate and verify | 1.0 | |
| **total** | **41.2** | "suite base-red; revert no code changed" |

The 3 tests that fail at the base are heavy load tests: G41, a 200,000-row xlsx, and G55 L, two tests of 25,000 rows each. They fail at the base and at the head alike, so on every PR they cost minutes (their share of the suite, plus the 3.2-min base-red re-run) and **give no per-PR signal**.

Can the gate be scoped to the changed module and its dependants? It already runs less than that. `gate.mjs` line 165: "A job's PR runs its module." Dependants run only through the tranche cover, at layer close and in the tranche into main. Plane has 0 dependants and uses 134 modules (187 counting their own uses). The 34 min are plane's own 92 test files. So the levers for plane are inside its suite (§3, E), not its scope.

### Runners and cost

- The peak was **10 concurrent gate jobs** (4 Nov, 15:37). The longest wait for a runner was **14 s**, and the median 3 s. Runners have never been the bottleneck.
- The copy is public, so standard GitHub-hosted runners bill no minutes. The only cost is concurrency. GitHub's documented cap for a personal account is 20 concurrent jobs on Free and 40 on Pro. I did not read Bob's plan, so 20 is the safe assumption. C at k=4 adds at most 4 runners to today's peak of 10.

### Arrivals today (job PRs into tranche, by creation hour, UTC)

00h 6, 01h 15, 02h 5, 03h 11, 04h 20, 05h (to 05:20) 9. That is **about 12/h over the last 6 h** and about 15/h over the last 3, in line with "one every 5 min". At 05:20, 43 job PRs were open, 15 of them drafts.

### The train so far (`metrics/train.jsonl`, 04:37-05:27)

- 2 merged in 50 min. PR 416 (case-disclosures): 1.8 min from start to merge, green->merged 2.3 min. PR 175 (plane): a 41.9-min gate, **green->merged 53.5 min**, queue 5 at its start and 4 at its end.
- PR 364 was refused at 05:27 because it fires the security review trigger. That is correct, and it goes to BOB.
- The queue was **21** at 05:27.
- Four early tries failed with `git merge-base ... failed`. On those rows **`disk_mb` is 0-4**, under DISK_MIN 512, yet the train kept going. Whatever the merge-base cause (shallow fetch or the disk), the merger session's disk allowance is nearly spent, and the disk check did not stop the train. This is a separate defect and needs a look before the next restart.

## 2. Options compared

Simulation: 200 seeds of 3 h each. Arrivals are Poisson. Each PR's module is drawn from the last 24 h's job-PR mix, and its gate time from that module's measured full gates. Each merge adds 1 min of overhead (measured 1.8 min for PR 416, gate included). A PR's re-gate on the moved tranche fails with probability 5%; 15% is shown as a sensitivity. The measured rate is 17 of 125 (14%) for a full gate following a green one on the same branch, but that includes the job's own new commits. "Backlog" starts the run with today's 15 queued; "steady" starts empty. The script is in the appendix.

### At today's arrival rate, 12/h, re-gate failure 5%

| option | PRs/h | green->merged median / p90, from today's backlog of 15 | the same, steady state | queue after 3 h (backlog) | gate-min per merged PR | runners | strength vs per-PR gate | build |
|---|---|---|---|---|---|---|---|---|
| **A** serial, as now | 7.5 | 105 / 130 | 30 / 50 | **26, growing** | 7.2 | 1 | the reference | none |
| **B** shortest-expected first, 45-min aging | 7.6 | 78 / 133 (pure SPT: 43 / 139, plane starves) | 22 / 52 | 26 | 7.1 | 1 | same | about 20 lines in train.mjs (the sort) |
| **C** speculative k=4 | 14.9 | 39 / 64 | 10.5 / 25 | 3.9 | 6.6 | 4 | **same**, see §3 | one build job (gate base, merge tree check, train window) plus a confirming review |
| C k=8 | 15.2 | 30 / 56 | 9.6 / 25 | 2.8 | 6.9 | 6-8 | same | same |
| **D** batch, one runner (bisect on red) | 5.6 | 104 / 133 | 33 / 55 | 27 | 53 | 1 | weaker (merges between the gated states are not gated; receipt and revert checks are not per PR) | the original batch design |
| D, each member's suite in its own job | 9.0 | 85 / 111 | 23 / 44 | 18 | 28 | up to 8 | weaker | larger (a workflow matrix) |
| **E** A with plane-class suites 4x faster | 10.1 | 79 / 96 | 21 / 35 | 18 | 4.9 | 1 | same if done by concurrency or sharding; slightly weaker if the load tests move to regression | see §3 E |
| C k=4 + E | 15.6 | 11.7 / 29.7 | 7.3 / 12.3 | 1.6 | 5.0 | 4 | same | C + E |
| **F = C k=4 + B + E** | **15.7** | **7.9 / 19.4** | **6.8 / 11.8** | **1.5** | 5.0 | 4 | **same** | C + E + B |

Sensitivity, all measured as green->merged median / p90 in minutes:

| case | A | C k=4 | F |
|---|---|---|---|
| re-gate failure 15%, backlog | 6.7 PRs/h, 105 / 130 | 12.9 PRs/h, 45 / 70 | 13.9 PRs/h, 8.8 / 24 |
| arrivals 16/h, steady | 8.5 PRs/h, 42 / 70, queue +20 | 13.4 PRs/h, 14 / 29 | 14.6 PRs/h, 7.0 / 12.5 |
| arrivals 8/h, steady | 6.5 PRs/h, 16 / 31 | 7.1 PRs/h, 8 / 21 | 7.3 PRs/h, 6.4 / 11.2 |

How to read the table:

- **A** is stable only below about 8/h. Today it fails the stop rule (median worse than 8.7 over 3 h) by a factor of 3-12.
- **B** saves 25-60 min on the median and nothing on throughput: it reorders the same serial work. Without aging, plane never merges while small PRs keep arriving. With aging, most of the gain goes. B is cheap and worth having inside F, but it fixes nothing on its own.
- **C** is the only option that raises throughput without weakening the gate. A plane PR at the head of the window still holds back the PRs behind it from landing, which is why C alone has a p90 of 64. E on plane plus B's ordering are what bring the p90 down.
- **D** loses because a job gate runs one module's suite. A batch gate has to run every member's suite, which is serial on one runner, and one red member sends the whole batch to bisection. It was designed for a gate whose cost does not grow with batch size, which this gate's does.
- **E**, as the levers in §3, roughly doubles plane-class speed. That alone is not enough at 12/h, but it is the cheapest thing to start today.

## 3. What each option would take

**B, ordering.** The sort in `train.mjs` (`out.sort(... green_at ...)`, line 154) would order by the module's median full-gate minutes, read from the gate rows. Anything older than 45 min goes first, and release-path PRs could be ordered ahead too. Strength is unchanged and the build is about 20 lines. It is a merge-tool change, so it needs one review plus a confirming one.

**C, speculative gates.** GitHub's merge queue is not offered on these user-owned repositories, as Bob checked at 02:33. Doing it with the existing workflow, unchanged:
1. For window position i, the train makes a branch `train/spec-<i>` = tranche + the PRs ahead (merged in order, by merge-tree) and opens a second draft PR from `job/<id>` into `train/spec-<i>`. `process-gate` runs on `pull_request` with that branch as its base, so GitHub's merge commit is exactly tranche + ahead + this PR. Ownership, imports and the receipt are judged against that base, so the files of the PRs ahead do not count against this job. The gate job, its permissions and its required-check name stay as they are.
2. `merge.mjs`: today it lands only when the tranche is an ancestor of the gated tip (line 217). It would also accept a green gate row from the spec PR whose gated tree equals the tree of tranche merged with the head, after the PRs ahead landed. That is a tree comparison in place of an ancestry check, and the strength is identical: the bytes that land are the bytes that were tested.
3. `train.mjs`: a window of k (start at 4). A red gate at position i sends i back to its job, as today. Every spec PR behind it is closed and rebuilt on the new base. Spec branches are kept, not deleted, because sessions may not delete branches, so they accumulate under `train/`. A prune would need Bob.

Cost: up to k extra runners, at no charge; about 0.3 discarded gate-min per merged PR at 5% failure. Build: one build job of about 300-450 lines with tests, in gate-adjacent and merge code, so rule 5's confirming review applies. No workflow-file change, no new permission and no new trigger, so it fits inside the standing approvals.

**E, faster gates for the plane class** (cheapest first):
1. **Move the three base-red load tests to the regression workflow** (G41, the 200k-row xlsx; G55 L, two tests of 25k rows). They fail at the base on every PR now and are tolerated, so per-PR strength does not change, and the release tier still runs them. This saves the 3.2-min base-red phase plus their share of the 34 min, which is not measured yet. It means a ledger and test-path change in a copy plain PR, which is BOB's to rule.
2. **`--test-concurrency`** in plane's ledger suite command (node defaults to 3 on the 4-vCPU runner). If plane's tests mostly wait on alarms, ticks and SQLite, a value of 6-8 may cut the suite by a third or more. This is one line of ledger config, measured on one gate run before it is kept.
3. **Cache the generated builds and the base-red base build by input hash** inside the gate run. This saves about 2.5-3 min on every bio-plane gate, and it changes gate.mjs, so it needs a confirming review.
4. **Shard plane's 92 files across 4 runners.** This would bring plane to about 12-14 min, but it needs a workflow matrix plus an aggregate `gate` job, and the gate row and receipt would have to merge across shards. It is the largest build. Do it only if steps 1 and 2 are not enough.

I rejected **dependency-scoped re-gate skipping**: reusing the job's own green gate when the tranche delta does not touch the module's closure. The median closure is 74 of 201 modules, and plane, control-plane, screens-inquiry and store-assembly reach 85-93%, so it would rarely skip exactly the slow gates, and it weakens the gate.

## 4. Recommendation: F

**Speculative depth 4 (C), the window filled shortest-expected-gate first with a 45-min aging cap (B), and plane's gate cut by E1 and E2.**

Sequence, the most gain per hour of work first:
1. **Now, no process build:** BOB rules on E1 (move the 3 base-red load tests to regression) and tries E2 (`--test-concurrency`) on one plane gate. B's sort is a small merge-tool PR that can land the same hour. This does not keep up at 12/h, but it cuts the medians while C is built.
2. **Next build:** C at k=4, then measure. Keep the trial's stop rules. Add "runners in use ≤ 16" and "discarded gate-min per merged PR" to the train's rows.
3. Keep batching off for good. At this gate's cost per member it loses to serial.

The balance struck:
- **Speed:** at today's rate, green->merged goes from a median of 105 min (and growing) to about 7-8 min, inside the baseline of 8.7 / 33.7, and the queue stays at 1-2.
- **Strength:** unchanged. Each PR is still gated alone, on exactly the tree it lands as, with its own receipt, revert and record checks. The one test-tier move (E1) removes only tests that are already red at the base and tolerated.
- **Cost:** up to 4 more concurrent runners (peak about 14 against a cap of 20, at no charge), about 0.3 wasted gate-min per PR, one build job with a confirming review, and spec branches that accumulate.

## What would make Bob's call easy

1. **One decision, framed as speed vs complexity, not speed vs strength.** C keeps the per-PR gate's strength exactly, which batching could not. The ask: "May the train gate up to 4 PRs in parallel on speculative bases (draft PRs into `train/spec-*` branches kept, never deleted), so it keeps up at 12+ PRs/h?"
2. **Bob's own trigger has fired.** Option F said to revisit batching with Bob when queue depth at merge stays at 3 or more. The train's rows read 5, 4, then 21. This study is that revisit, and it answers it with C instead of batching.
3. **The figures, live on the train's rows:** queue depth at merge, green->merged median and p90 per hour, and gate minutes per merged PR. With these, the stop rule (median worse than 8.7 over 3 h) reads directly, before and after.
4. **E1 is BOB's (technical), not Bob's,** under the ask-Bob test. The tests are red at the base and tolerated now, and the release tier runs them. Say so, so it does not reach Bob as a strength question.
5. **One thing first:** the merger's disk reads 0-4 MB on its rows. Fix that before the train is judged on speed.

## Appendix: the simulation

Rerun by fetching the process-gate runs, their jobs, and the PR list as in §1, then running this script under `python3 -I` on those two files. Its constants: `OVER` = 1.0 min per merge; E is modelled as `3 + (g-3)/4` for gates over 10 min; D runs members' suites in series on one runner, less 1.5 min of shared setup per extra member, or in parallel (`par`); C closes and restarts every PR behind a red one; B's aging is 45 min.

```python
import json,sys,random,statistics as st,collections,math
rows=[json.loads(l) for l in open(sys.argv[1])]          # one row per gate job: branch, job_min, steps{name: min}
prs=json.load(open(sys.argv[2]))                          # PRs into tranche: n, ref, created, merged
full=collections.defaultdict(list)
for r in rows:
    if r['branch'].startswith('job/') and (r['steps'].get('gate') or 0)>1.5: full[r['branch'][4:]].append(r['job_min'])
med={m:st.median(v) for m,v in full.items()}
mix=[p['ref'][4:] for p in prs if p['ref'].startswith('job/') and p['created']>='2026-11-04T05' and p['ref'][4:] in med]
QUEUE=['agent-worker','plane','skills','strength','docket','plan-work','affordances','agent-drafts','run-rules','store-assembly','ai-runs','screens-action','agent-harness','lines','local-facts']
OVER=1.0
def gtime(m,rng,fast=False):
    g=max(rng.choice(full[m]),1.0)
    if fast and g>10: g=3+(g-3)/4
    return g
def q(xs,p): xs=sorted(xs); return xs[min(len(xs)-1,math.ceil(p*len(xs))-1)] if xs else float('nan')
def arrivals(rng,lam,H):
    t=0; out=[(0.0,m) for m in QUEUE]
    while True:
        t+=rng.expovariate(lam/60)
        if t>H: return out
        out.append((t,rng.choice(mix)))
def run(policy,lam=12,H=180,pf=0.05,k=4,fast=False,seed=0,age=60,bmax=8,backlog=True,par=False):
    rng=random.Random(seed); arr=arrivals(rng,lam,H)
    if not backlog: arr=arr[len(QUEUE):]
    items=[dict(id=i,t=t,m=m,fail=rng.random()<pf,g=gtime(m,rng,fast)) for i,(t,m) in enumerate(arr)]
    waits=[];gm=0.0;now=0.0;merged=0;peak=1;pending=list(items);win=[]
    avail=lambda now:[x for x in pending if x['t']<=now]
    if policy in('A','B'):
        while now<H:
            a=avail(now)
            if not a:
                nxt=min((x['t'] for x in pending),default=None)
                if nxt is None or nxt>H: break
                now=nxt; continue
            if policy=='A': x=min(a,key=lambda x:x['t'])
            else:
                old=[y for y in a if now-y['t']>=age]
                x=min(old,key=lambda y:y['t']) if old else min(a,key=lambda y:med[y['m']])
            pending.remove(x); now+=x['g']+OVER; gm+=x['g']
            if not x['fail'] and now<=H: merged+=1; waits.append(now-x['t'])
    elif policy in('C','CB'):
        while now<H:
            a=sorted(avail(now),key=lambda x:x['t'])
            if policy=='CB':
                old=[y for y in a if now-y['t']>=age]; rest=[y for y in a if now-y['t']<age]
                a=old+sorted(rest,key=lambda y:med[y['m']])
            while len(win)<k and a:
                x=a.pop(0); pending.remove(x); x=dict(x); x['end']=now+x['g']+OVER; win.append(x)
            peak=max(peak,len(win))
            if not win:
                nxt=min((x['t'] for x in pending),default=None)
                if nxt is None or nxt>H: break
                now=nxt; continue
            head=win[0]; now=max(now,head['end'])
            if now>H: break
            gm+=head['g']; win.pop(0)
            if head['fail']:
                for y in win: gm+=max(0.0,min(y['g'],now-(y['end']-y['g']-OVER))); y['end']=now+y['g']+OVER
            else: merged+=1; waits.append(now-head['t'])
            nxt_arr=min((x['t'] for x in pending if x['t']>now),default=None)
            if win and nxt_arr is not None and nxt_arr<win[0]['end'] and len(win)<k: now=nxt_arr
    elif policy=='D':
        while now<H:
            a=sorted(avail(now),key=lambda x:x['t'])[:bmax]
            if not a:
                nxt=min((x['t'] for x in pending),default=None)
                if nxt is None or nxt>H: break
                now=nxt; continue
            for x in a: pending.remove(x)
            def gate(b):
                nonlocal now,gm
                g=(max(x['g'] for x in b)+1.0) if par else sum(x['g'] for x in b)-1.5*(len(b)-1)
                now+=g+OVER; gm+=g
                return not any(x['fail'] for x in b)
            def bis(b):
                nonlocal merged
                if gate(b):
                    for x in b:
                        if now<=H: merged+=1; waits.append(now-x['t'])
                    return
                if len(b)>1: h=len(b)//2; bis(b[:h]); bis(b[h:])
            bis(a)
    left=len([x for x in pending if x['t']<=H])+len(win)
    return dict(merged_h=merged/(H/60),med=st.median(waits) if waits else float('nan'),p90=q(waits,.9),left=left,gm=gm/max(merged,1),peak=peak)
```
