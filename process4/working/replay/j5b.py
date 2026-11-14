"""J5 b, mechanical form: does each affected verdict's evidence sentence name a part the
extraction also names?"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
P = jload('parts.json')
notices, tri, owed, ans, wd = load_notices()
rows = []
c = collections.Counter()
def word(name, text):
    return re.search(r'(?<![\w$])' + re.escape(name) + r'(?![\w$])', text) is not None
for key in sorted(P):
    p = P[key]; n = p['names']; rq = p['reqs'] or {}
    names = set(n['removed']) | set(n['added']) | {d['name'] for d in n['changed']}
    vals = set(n['value_changed'])
    na = p['names_all_files']
    names_all = (set(na['removed']) | set(na['added']) | {d['name'] for d in na['changed']} | set(na['value_changed'])) - names - vals
    pub = set(rq.get('public_ids', [])); tids = set(p['test_ids'])
    nonc = {os.path.basename(f) for f in p['noncode']}
    anypart = bool(names or vals or pub or tids or nonc)
    for t in tri.get(key, []):
        if t['verdict'] != 'affected':
            continue
        ev = t.get('evidence') or ''
        hit_names = sorted(x for x in names if len(x.split('.')[-1]) >= 3 and (word(x, ev) or word(x.split('.')[-1], ev)))
        hit_vals = sorted(x for x in vals if len(x.split('.')[-1]) >= 3 and (word(x, ev) or word(x.split('.')[-1], ev)))
        hit_allfiles = sorted(x for x in names_all if len(x.split('.')[-1]) >= 3 and (word(x, ev) or word(x.split('.')[-1], ev)))
        ids = set(re.findall(r'(?<![\w.-])R\d+[a-z]?\b', ev))
        hit_pub = sorted(ids & pub); hit_t = sorted(ids & tids - pub)
        hit_nc = sorted(x for x in nonc if x in ev)
        if not anypart:
            cls = 'unattributed change (no part could be named)'
        elif hit_names:
            cls = 'evidence names a changed exported name'
        elif hit_vals:
            cls = 'evidence names an exported value whose hash changed'
        elif hit_pub:
            cls = 'evidence cites a changed public id'
        elif hit_t:
            cls = 'evidence cites an id whose tests changed'
        elif hit_nc:
            cls = 'evidence names a changed non-code file'
        else:
            cls = 'cannot be decided mechanically'
        c[cls] += 1
        a = [x for x in ans.get(key, []) if x['user'] == t['user']]
        rows.append(dict(key=key, user=t['user'], cls=cls, evidence=ev, hit=dict(names=hit_names, values=hit_vals, public=hit_pub, tests=hit_t, noncode=hit_nc, all_files_only=hit_allfiles),
                         answered=[dict(by=x.get('by', 'pull request'), pr=x.get('pr')) for x in a],
                         parts=dict(removed=n['removed'], added=n['added'], changed=n['changed'], value_changed=n['value_changed'],
                                    public={k: v for k, v in rq.items() if v and k.startswith('public_') and k != 'public_ids'},
                                    test_ids=p['test_ids'], noncode=p['noncode'])))
print(json.dumps(c, indent=1), sum(c.values()))
u = [r for r in rows if r['cls'] == 'cannot be decided mechanically']
print('undecided:', len(u), ' of which evidence names a name exported only by a non-entry file:', sum(bool(r['hit']['all_files_only']) for r in u))
print('answered records for the 241:', collections.Counter(tuple(sorted(a['by'] for a in r['answered'])) for r in rows))
jdump(rows, 'j5b_rows.json'); jdump(dict(c), 'j5b_counts.json')
