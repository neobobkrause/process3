import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
P = parts(); F = load('followup.json')
out = []
last = None
for i, o in enumerate(F):
    p = P[o['key']]
    if o['key'] != last:
        last = o['key']
        n = p['names']; na = p.get('names_all_files') or {}
        rq = p['reqs'] or {}
        s = f"\n## {o['key']}  src={len(p['source'])} "
        if n['removed']: s += f"REMOVED={n['removed'][:8]} "
        if n['changed']: s += "RESIGNED=" + '; '.join(f"{c['name']}: {c['before'][:60]} -> {c['after'][:60]}" for c in n['changed'][:5]) + ' '
        if n['added']: s += f"added({len(n['added'])})={n['added'][:6]} "
        if n['value_changed']: s += f"value={n['value_changed'][:6]} "
        extra = sorted(set(na.get('value_changed', [])) - set(n['value_changed']))
        if extra: s += f"inner_value={extra[:5]} "
        for k in ('public_added', 'public_removed', 'public_changed', 'public_newly_met', 'public_retired', 'public_marked_unmet', 'found_ids'):
            if rq.get(k): s += f"{k.replace('public_','pub_')}={rq[k][:8]} "
        if p['noncode']: s += f"noncode={p['noncode']} "
        fx = [f for f in p['tests'] if not re.search(r'\.test\.[a-z]+$', f)]
        if fx: s += f"fixtures={[os.path.basename(f) for f in fx][:5]} "
        if p['test_ids']: s += f"test_ids={len(p['test_ids'])} "
        out.append(s)
    fu = 'SRC' if o['source'] else 'TEST' if o['test'] else 'REC' if o['record'] else 'NONE'
    fl = ('+near' if o['ev_near'] else '+evfile' if o['ev_changed'] else '') + ('+ntest' if o['notice_test'] else '')
    out.append(f"[{i}] {o['user']} <{fu}{fl} w={[w['pr'] for w in o['window']]}> {o['evidence']}")
open(os.path.join(SCRATCH, 'dump241.txt'), 'w').write('\n'.join(out))
print(len(out))
