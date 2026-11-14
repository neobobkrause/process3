"""J5 a, extra: unattributed counts under each reading of the part list, and how narrow the named
parts are (a proxy for 'read less')."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import public_ids
P = jload('parts.json'); R = jload('j4a_rows.json')
def f(p):
    n = p['names']; rq = p['reqs'] or {}
    return dict(names=bool(n['removed'] or n['added'] or n['changed']), value=bool(n['value_changed']),
                req=bool(rq.get('public_ids')), tests=bool(p['test_ids']), noncode=bool(p['noncode']))
V = {
 '1 Process3 record itself: no ids and no exports in the notice': None,
 '2 names + public ids (re-derived)': ('names', 'req'),
 '3 names + public ids + test ids (the three parts the definition lists for the notice)': ('names', 'req', 'tests'),
 '4 ... + published non-code files (the four parts)': ('names', 'req', 'tests', 'noncode'),
 '5 ... + value hash of exported data': ('names', 'req', 'tests', 'noncode', 'value'),
 '6 names + value hash + public ids + non-code (no test ids)': ('names', 'value', 'req', 'noncode'),
}
out = {}
for name, ks in V.items():
    if ks is None:
        none = [k for k, p in P.items() if not p['notice_ids'] and not p['notice_exports']]
    else:
        none = [k for k, p in P.items() if not any(f(p)[x] for x in ks)]
    a = sum(len(R[k]['affected']) for k in none)
    out[name] = dict(unattributed_changes=len(none), affected_in_them=a)
    print(f'{len(none):4d} of 178 name no part, holding {a:3d} of 241 affected | {name}')
# narrowness
fr = []; nid = []; big = 0
for k, p in P.items():
    ids = set((p['reqs'] or {}).get('public_ids', [])) | set(p['test_ids_public'])
    live = public_ids(show(p['merge'], req_file(p['module'])) or '')
    if live and ids:
        fr.append(len(ids & live) / len(live)); nid.append(len(ids))
        big += len(ids & live) / len(live) > 0.5
print('changes naming at least one public id (changed or with changed tests):', len(fr))
print('  ids named per change: median', statistics.median(nid), 'max', max(nid))
print('  share of the module\'s public ids named: median %.1f%%, 90th pct %.1f%%, changes naming over half: %d' % (100*statistics.median(fr), 100*sorted(fr)[int(.9*len(fr))], big))
nn = [len(p['names']['removed']) + len(p['names']['added']) + len(p['names']['changed']) + len(p['names']['value_changed']) for p in P.values()]
print('  exported names named per change (changes with any): median', statistics.median([x for x in nn if x]), 'max', max(nn))
out['narrowness'] = dict(changes_with_ids=len(fr), median_ids=statistics.median(nid), max_ids=max(nid), median_share=statistics.median(fr), over_half=big)
jdump(out, 'j5a_extra.json')
