"""J4 c(1) refinement: for each (change, undeclared importing module) pair where the imported file
changed in the merge, does the user import a name whose export was removed or changed?"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
rows = jload('undeclared_at_changes.json')
notices, tri, owed, ans, wd = load_notices()
res = resolve(notices, load_merges())
IMP = re.compile(r'''\bimport\s*(?:([A-Za-z$_][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z$_][\w$]*))?\s*from\s*(['"])([^'"\n]+)\4''')
out = []; c = collections.Counter()
for r in rows:
    if r['route'] != 'import' or not r['changed_file_referenced']:
        continue
    key = r['key']; P1, M = res[key]['p1'], res[key]['merge']
    e = entry(P1, r['provider'])
    inmod = lambda f: classify(e, f) in ('source', 'test')
    t = tree_oids(P1)
    hits = []
    # every file of the user that imports a changed file of the provider
    changed = {p for s, p in diff_names(P1, M)}
    own = owner_map(P1)
    for f, to in import_edges(P1):
        if to not in changed or own(to)[0] != r['provider'] or own(f)[0] != r['user']:
            continue
        sa = Surface(P1, inmod).of(to); sb = Surface(M, inmod).of(to)
        nd = names_diff(sa, sb)
        gone = set(nd['removed']) | {d['name'] for d in nd['changed']}
        val = set(nd['value_changed'])
        deleted = to not in tree_oids(M)
        text = read_at(P1, f) or ''
        names = set(); whole = False
        for m in IMP.finditer(text):
            if resolve_spec(f, m.group(5), t) != to:
                continue
            if m.group(3) or m.group(1):
                whole = True
            for part in (m.group(2) or '').split(','):
                a = re.split(r'\s+as\s+', part.strip())[0].strip()
                if a:
                    names.add(a)
        if not names and not whole:
            whole = True  # dynamic import or export-from: treated as importing everything
        cls = {g.split('.')[0] for g in gone if '.' in g}
        h = dict(file=f, to=to, deleted=deleted, names_removed_or_resigned=sorted(names & gone),
                 class_member_changed_of_imported=sorted(n for n in names if n in cls),
                 value_changed=sorted(names & val), whole=whole and bool(gone or val))
        hits.append(h)
    strong = any(h['deleted'] or h['names_removed_or_resigned'] for h in hits)
    med = any(h['class_member_changed_of_imported'] or h['value_changed'] or h['whole'] for h in hits)
    c['pairs examined (undeclared importer, imported file changed)'] += 1
    c['imports a name that was removed or whose signature changed, or a deleted file'] += strong
    c['else imports a name whose value changed, a class with a changed member, or the whole file while a name changed'] += (not strong) and med
    c['else none of the imported names changed (body-only or other names)'] += not strong and not med
    out.append(dict(key=key, user=r['user'], provider=r['provider'], strong=strong, medium=med, hits=hits))
print(json.dumps(c, indent=1))
for o in out:
    if o['strong']:
        print(o['key'], o['user'], [(h['file'], h['to'], h['deleted'], h['names_removed_or_resigned']) for h in o['hits'] if h['deleted'] or h['names_removed_or_resigned']])
jdump(out, 'undeclared_names.json'); jdump(dict(c), 'undeclared_names_counts.json')
