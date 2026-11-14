"""Check the Python export reader against the 71 export records Process3 wrote into notices."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
import time
notices, tri, owed, ans, wd = load_notices()
res = resolve(notices, load_merges())
c = collections.Counter(); bad = []
t0 = time.time()
for key, n in sorted(notices.items()):
    if 'exports' not in n and 'exports_read' not in n:
        continue
    r = res[key]
    e = entry(r['p1'], n['provider'])
    fa, sa = surface_at(r['p1'], e); fb, sb = surface_at(r['merge'], entry(r['merge'], n['provider']) or e)
    nd = names_diff(sa, sb)
    x = n.get('exports') or dict(removed=[], added=[], changed=[])
    mine = (set(nd['removed']), set(nd['added']), {d['name'] for d in nd['changed']})
    theirs = (set(x['removed']), set(x['added']), {d['name'] for d in x['changed']})
    c['compared'] += 1
    c['with_exports_record'] += 'exports' in n
    if mine == theirs:
        c['identical'] += 1
    else:
        # value<->function kind differences are a known difference of the port
        bad.append((key, [sorted(a ^ b) for a, b in zip(mine, theirs)], [sorted(a - b) for a, b in zip(mine, theirs)]))
    c['value_changed_extra'] += bool(nd['value_changed'])
print(dict(c), round(time.time() - t0, 1), 's')
for b in bad:
    print(b[0], 'sym diff removed/added/changed:', b[1], '\n    mine only:', b[2])
