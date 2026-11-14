"""What each user module's own job did after a notice it was judged "affected" by.

For each of the 241 affected verdicts: the user's own job or layer merges made after the provider's
merge, up to and including the merge named in the notice's `answered` record (the "window"); if no
answered record exists, the user's first own merge after the verdict. For the window, the files
changed are classified against the user's module entry: source, test, requirement file, records.
Attribution signals (none is proof that a change was caused by the notice):
  notice_test   a test file named notice-<provider>-<pr>* was added or changed in the window
  ev_file       the user file the verdict's evidence cites was changed in the window
  ev_near       ... and a changed hunk lies within 25 lines of the cited line
  receipt       a job receipt in process/metrics/<user>.jsonl lists a test against this notice
Output: data/followup.json
"""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *

N, T, O, A, W = notices()
ROWS = rows()
NN = rload('no_notice_rows.json')
own = collections.defaultdict(list)
for r in NN:
    if r['own_job']:
        own[r['module']].append(r)
for v in own.values():
    v.sort(key=lambda r: r['at'])
by_pr = collections.defaultdict(list)
for r in NN:
    if r['own_job']:
        by_pr[r['pr']].append(r)

def ctime(h):
    return int(R.git('log', '-1', '--format=%ct', h).strip())

def iso2ts(s):
    import datetime
    s = s.replace('Z', '+00:00')
    return int(datetime.datetime.fromisoformat(s).timestamp())

def hunks(p1, m, f):
    out = []
    for l in R.git('diff', '-U0', p1, m, '--', f).splitlines():
        mm = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', l)
        if mm:
            a = int(mm.group(1)); n = int(mm.group(2) or 1)
            out.append((a, a + max(n, 1) - 1))
    return out

RECORD = re.compile(r'^(process/|docs/requirements-notes/)')
out = []
for key in sorted(ROWS):
    r = ROWS[key]
    if not r['affected']:
        continue
    prov, pr = key.split(':')
    mt = ctime(r['merge'])
    for user in r['affected']:
        tri = [t for t in T[key] if t['user'] == user and t['verdict'] == 'affected'][0]
        ans = [a for a in A[key] if a['user'] == user]
        e = R.entry(r['merge'], user)
        mine = [x for x in own.get(user, []) if x['at'] > mt]
        end = None; ans_pr = None; ans_by = None
        if ans:
            ans_pr = ans[0].get('pr'); ans_by = ans[0].get('by', 'pull request')
            cand = [x for x in by_pr.get(ans_pr, []) if x['module'] == user]
            if cand:
                end = cand[0]['at']
        if end is not None:
            win = [x for x in mine if x['at'] <= end]
            basis = 'answered'
        else:
            vt = iso2ts(tri['at'])
            later = [x for x in mine if x['at'] >= vt]
            win = [x for x in mine if x['at'] < vt] + later[:1]
            # merges before the verdict are kept only if a later one exists (same window idea)
            win = later[:1] if later else []
            basis = 'next merge after verdict' if win else 'none found'
        def kinds_of(ms):
            k = collections.defaultdict(set)
            for x in ms:
                ee = R.entry(x['merge'], user) or e
                for s, f in R.diff_names(x['p1'], x['merge']):
                    c = R.classify(ee, f) if ee else None
                    if c is None:
                        c = 'record' if RECORD.match(f) else 'other'
                    k[c].add(f)
            return k
        k = kinds_of(win)
        last = win[-1:] if win else []
        kl = kinds_of(last)
        evm = re.match(r'\s*([\w./@-]+\.[A-Za-z]+):(\d+)', tri['evidence'])
        ev_file = evm.group(1) if evm else None
        ev_line = int(evm.group(2)) if evm else None
        allf = set().union(*k.values()) if k else set()
        ev_changed = ev_file in allf if ev_file else None
        ev_near = False
        if ev_changed:
            for x in win:
                for a, b in hunks(x['p1'], x['merge'], ev_file):
                    if a - 25 <= ev_line <= b + 25:
                        ev_near = True
        nt = [f for f in k.get('test', ()) if re.search(rf'notice-{re.escape(prov)}-{pr}\b', f)]
        # any file in the evidence text that the window changed
        ev_paths = set(re.findall(r'[\w./@-]+/[\w./@-]+\.(?:mjs|js|json|jsonc|md)', tri['evidence']))
        ev_any = sorted(p for p in ev_paths if p in allf)
        # receipts
        rc = []
        mtxt = R.show(R.TRANCHE, f'process/metrics/{user}.jsonl') or ''
        for line in mtxt.splitlines():
            if f'"{key}"' in line and '"receipt"' in line:
                try:
                    d = json.loads(line)
                except Exception:
                    continue
                for t in (d.get('receipt') or {}).get('tests', []) or []:
                    if t.get('notice') == key:
                        rc.append(dict(pr=d.get('pr'), file=t.get('file'), name=t.get('name')))
        out.append(dict(key=key, user=user, evidence=tri['evidence'], verdict_at=tri['at'],
                        answered=bool(ans), ans_pr=ans_pr, ans_by=ans_by, basis=basis,
                        window=[dict(pr=x['pr'], kind=x['kind'], merge=x['merge'][:12], at=x['at']) for x in win],
                        source=sorted(k.get('source', ())), test=sorted(k.get('test', ())),
                        req=sorted(k.get('req', ())), record=sorted(k.get('record', ())),
                        other=sorted(set(k.get('other', ())) | set(k.get('doc', ()))),
                        last_source=sorted(kl.get('source', ())), last_test=sorted(kl.get('test', ())),
                        last_req=sorted(kl.get('req', ())),
                        ev_file=ev_file, ev_line=ev_line, ev_changed=ev_changed, ev_near=ev_near, ev_any=ev_any,
                        notice_test=nt, receipts=rc))
dump(out, 'followup.json')
c = collections.Counter()
for o in out:
    c['all'] += 1
    c['basis:' + o['basis']] += 1
    w = 'source' if o['source'] else 'tests only' if o['test'] else 'req only' if o['req'] else 'records only' if (o['record'] or o['other']) else 'nothing found'
    c['window: ' + w] += 1
    l = 'source' if o['last_source'] else 'tests only' if o['last_test'] else 'req only' if o['last_req'] else 'records/none'
    c['answering merge: ' + l] += 1
    c['notice_test'] += bool(o['notice_test'])
    c['ev_changed'] += bool(o['ev_changed'])
    c['ev_near'] += bool(o['ev_near'])
    c['receipt'] += bool(o['receipts'])
    c['window size %d' % min(len(o['window']), 4)] += 1
for k in sorted(c): print(k, c[k])
