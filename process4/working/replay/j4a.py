"""J4 a: declared users at each change's own commit vs notified vs affected."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import collections, json
from lib import *

notices, tri, owed, ans, wd = load_notices()
merges = load_merges()
res = resolve(notices, merges)

reach_tranche = set(git('rev-list', TRANCHE).split())
c = collections.Counter()
rows = {}
not_notified = []
aff_outside = []
for key, n in sorted(notices.items()):
    r = res[key]
    P1, M = r['p1'], r['merge']
    prov = n['provider']
    d1 = set(declared_users(P1, prov))
    dm = set(declared_users(M, prov))
    told = set(n['users'])
    e = entry(P1, prov)
    files = [p for s, p in diff_names(P1, M)]
    kinds = collections.Counter(classify(e, f) for f in files) if e else collections.Counter()
    c['notices'] += 1
    c['kind_' + r['kind']] += 1
    c['reachable_from_tranche'] += M in reach_tranche
    c['notifications'] += len(told)
    c['declared_at_p1_pairs'] += len(d1)
    c['declared_at_merge_pairs'] += len(dm)
    c['told_not_declared_at_p1'] += len(told - d1)
    c['told_not_declared_at_merge'] += len(told - dm)
    c['told_not_declared_either'] += len(told - d1 - dm)
    miss1 = d1 - told
    c['declared_p1_not_told'] += len(miss1)
    c['declared_merge_not_told'] += len(dm - told)
    c['declared_union_not_told'] += len((d1 | dm) - told)
    lf = 'layer_flow' in n
    for u in sorted(miss1):
        why = 'layer-flow notice (only users in later layers were noticed)' if lf else \
              ('withdrawn notice' if key in wd else 'other')
        not_notified.append((key, u, why, u in dm))
        c['not_told_reason: ' + why] += 1
    c['no_source_change'] += kinds['source'] == 0
    v = {t['user']: t for t in tri.get(key, [])}
    o = {t['user'] for t in owed.get(key, [])}
    a = {t['user']: t for t in ans.get(key, [])}
    for u in told:
        if u in v:
            c['verdict_' + v[u]['verdict']] += 1
            if v[u]['verdict'] == 'affected':
                c['affected_declared_p1'] += u in d1
                c['affected_declared_merge'] += u in dm
                c['affected_in_told'] += 1
                if u not in d1:
                    aff_outside.append((key, u))
        if u in o:
            c['owed_row'] += 1
            c['owed_row_and_verdict'] += u in v
            c['owed_row_and_answered'] += u in a
            if u not in v and u not in a:
                c['owed_no_verdict_no_answer'] += 1
            elif u not in v:
                c['owed_no_verdict_answered_by_' + ('layer land' if a[u].get('by') == 'layer land' else 'pull request')] += 1
        if u not in v and u not in o:
            c['told_no_triage_row_at_all'] += 1
            c['told_no_triage_row_answered'] += u in a
        if u not in v and u not in a:
            c['told_no_verdict_no_answer'] += 1
        if u not in v:
            c['told_no_verdict'] += 1
    for u in v:
        if u not in told:
            c['verdict_for_user_not_in_notice'] += 1
            if v[u]['verdict'] == 'affected':
                c['affected_not_in_notice_users'] += 1
    rows[key] = dict(provider=prov, pr=n['pr'], merge=M, p1=P1, kind=r['kind'], at=n.get('at'),
                     layer_flow=lf, withdrawn=key in wd,
                     declared_p1=sorted(d1), declared_merge=sorted(dm), told=sorted(told),
                     affected=sorted(u for u in v if v[u]['verdict'] == 'affected'),
                     not_affected=sorted(u for u in v if v[u]['verdict'] != 'affected'),
                     file_kinds=dict((str(k), x) for k, x in kinds.items()), files=files[:400])

# layer-flow reschedule rows: were the not-notified same-layer users told by that other route?
resched = set()
lfdir = os.path.join(SCRATCH, 'layerflow')
for L in os.listdir(lfdir):
    d = os.path.join(lfdir, L, 'reschedule')
    if os.path.isdir(d):
        for f in os.listdir(d):
            x = json.load(open(os.path.join(d, f)))
            resched.add((x['provider'], x.get('provider_pr'), x['user']))
for key, u, why, in_dm in not_notified:
    n = notices[key]
    if (n['provider'], n['pr'], u) in resched:
        c['not_told_but_rescheduled_by_layer_flow'] += 1
    elif why.startswith('layer-flow'):
        c['not_told_layer_flow_and_not_rescheduled'] += 1

print(json.dumps(c, indent=1, sort_keys=True))
print('affected outside declared-at-p1:', aff_outside)
print('not notified, reason other:', [(k, u, d) for k, u, w, d in not_notified if w == 'other'])
jdump(rows, 'j4a_rows.json')
jdump(dict(c), 'j4a_counts.json')
jdump(not_notified, 'j4a_not_notified.json')
