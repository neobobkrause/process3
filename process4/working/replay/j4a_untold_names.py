"""J4 a, follow-up on the 167 declared users Process3 did not notify: does the user's code import
a name of the provider that the change removed or re-signed? (A static signal only.)"""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
nn = jload('j4a_not_notified.json'); R = jload('j4a_rows.json'); P = jload('parts.json')
resched = set()
for f in glob.glob(SCRATCH + '/layerflow/*/reschedule/*.json'):
    d = json.load(open(f)); resched.add((d['provider'], d.get('provider_pr'), d['user']))
IMP = re.compile(r'''\bimport\s*(?:([A-Za-z$_][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z$_][\w$]*))?\s*from\s*(['"])([^'"\n]+)\4''')
c = collections.Counter(); out = []
for key, user, why, in_dm in nn:
    r = R[key]; P1, M = r['p1'], r['merge']; prov = r['provider']; p = P[key]
    n = p['names']
    gone = set(n['removed']) | {d['name'] for d in n['changed']}
    cls = {g.split('.')[0] for g in gone if '.' in g}
    told_other = (prov, r['pr'], user) in resched
    tag = 'rescheduled by layer flow' if told_other else 'told by no route'
    c[tag + ': pairs'] += 1
    own = owner_map(P1); t = tree_oids(P1)
    imported = set(); whole = False; anyimp = False
    for f, to in import_edges(P1):
        if own(f)[0] != user or own(to)[0] != prov:
            continue
        anyimp = True
        text = read_at(P1, f) or ''
        for m in IMP.finditer(text):
            if resolve_spec(f, m.group(5), t) != to: continue
            if m.group(1) or m.group(3): whole = True
            for part in (m.group(2) or '').split(','):
                a = re.split(r'\s+as\s+', part.strip())[0].strip()
                if a: imported.add(a)
    direct = sorted(imported & gone); viacls = sorted(x for x in imported if x in cls)
    c[tag + ': user imports the provider at all'] += anyimp
    c[tag + ': the change removed or re-signed some name'] += bool(gone)
    c[tag + ': user imports a removed or re-signed name'] += bool(direct)
    c[tag + ': user imports a class or factory whose member was removed or re-signed'] += bool(viacls) and not direct
    if direct or viacls:
        out.append((key, user, tag, direct, viacls))
print(json.dumps(c, indent=1, sort_keys=True))
for o in out: print(o)
jdump(dict(c), 'j4a_untold_names_counts.json'); jdump(out, 'j4a_untold_names.json')
