"""J4 c(1): dependence that is not declared, at the tranche tip and at each change's own commit.

Routes read mechanically:
  import   a relative import/export-from/import() between code files (static specifiers)
  path     a string literal that names a file of another module (read as text, a URL, a spawn)
  sql      SQL naming a table that another module's source creates (pattern match, noisy)
  binding  a wrangler service / durable-object binding naming another module's class or script
Not read: instances handed in at run time, word keys, wire routes, copied constants.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *

TIP = git('rev-parse', TRANCHE).strip()

# --- per-blob caches -----------------------------------------------------------------
_PATHS = {}
PATH_LIT = re.compile(r'''(['"`])((?:\.{1,2}/)?(?:[\w@.-]+/)+[\w@.-]+\.[A-Za-z0-9]{1,6}|(?:\.{1,2}/)+[\w@.-]+)\1''')
def path_lits(oid):
    if oid in _PATHS:
        return _PATHS[oid]
    t = blob_text(oid)
    out = set()
    if t is not None and len(t) <= MAX_SCAN:
        imp = set(specs_of(oid))
        for m in PATH_LIT.finditer(t):
            s = m.group(2)
            if s in imp:
                continue
            out.add(s)
    _PATHS[oid] = tuple(sorted(out))
    return _PATHS[oid]

_SQLC = {}; _SQLU = {}
CREATE = re.compile(r'CREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-z_][a-z0-9_]{2,})', re.I)
USE = re.compile(r'\b(?:FROM|JOIN|INTO|UPDATE)\s+["`]?([a-z_][a-z0-9_]{2,})\b')
def sql_created(oid):
    if oid not in _SQLC:
        t = blob_text(oid)
        _SQLC[oid] = tuple(sorted(set(CREATE.findall(t)))) if t is not None and len(t) <= MAX_SCAN else ()
    return _SQLC[oid]
def sql_used(oid):
    if oid not in _SQLU:
        t = blob_text(oid)
        _SQLU[oid] = tuple(sorted(set(USE.findall(t)))) if t is not None and len(t) <= MAX_SCAN else ()
    return _SQLU[oid]


def deps_at(rev, routes=('import', 'path', 'sql')):
    """route -> {(user module, provider module): [(from file, kind of from file, to file or table)]}"""
    t = tree_oids(rev)
    own = owner_map(rev)
    out = {r: collections.defaultdict(list) for r in routes}
    unowned = collections.Counter()
    if 'import' in routes:
        for f, to in import_edges(rev):
            a, ka = own(f); b, kb = own(to)
            if a is None and b is not None:
                unowned[f] += 1
            if a and b and a != b:
                out['import'][(a, b)].append((f, ka, to))
    if 'path' in routes:
        for f, oid in t.items():
            if not CODE.search(f):
                continue
            a, ka = own(f)
            if not a:
                continue
            for s in path_lits(oid):
                cands = []
                if s.startswith('./') or s.startswith('../'):
                    cands.append(posixpath.normpath(posixpath.join(posixpath.dirname(f), s)))
                else:
                    cands.append(posixpath.normpath(s))
                for p in cands:
                    if p in t:
                        b, kb = own(p)
                        if b and b != a:
                            out['path'][(a, b)].append((f, ka, p))
    if 'sql' in routes:
        table_owner = {}
        for f, oid in t.items():
            if not CODE.search(f):
                continue
            a, ka = own(f)
            if a and ka == 'source':
                for tb in sql_created(oid):
                    table_owner.setdefault(tb, set()).add(a)
        for f, oid in t.items():
            if not CODE.search(f):
                continue
            a, ka = own(f)
            if not a or ka != 'source':
                continue
            for tb in sql_used(oid):
                owners = table_owner.get(tb)
                if owners and a not in owners and len(owners) == 1:
                    b = next(iter(owners))
                    out['sql'][(a, b)].append((f, ka, tb))
    return out, unowned


def summarise(rev):
    mods = modules_at(rev)
    pos = {m['id']: i for i, m in enumerate(mods)}
    uses = {m['id']: set(m.get('uses', [])) for m in mods}
    deps, unowned = deps_at(rev)
    S = {}
    und_pairs = {}
    for route, d in deps.items():
        c = collections.Counter()
        for (a, b), refs in d.items():
            declared = b in uses[a]
            later = pos[b] > pos[a]
            kinds = {k for f, k, to in refs}
            for kind in ('source', 'test'):
                n = sum(1 for f, k, to in refs if k == kind)
                if not n:
                    continue
                c[f'{kind}: statements'] += n
                c[f'{kind}: pairs'] += 1
                if not declared:
                    c[f'{kind}: statements to an undeclared module'] += n
                    c[f'{kind}: undeclared pairs'] += 1
                    if later:
                        c[f'{kind}: undeclared pairs to a later module'] += 1
                        c[f'{kind}: undeclared statements to a later module'] += n
                if later:
                    c[f'{kind}: statements to a later module'] += n
                    c[f'{kind}: pairs to a later module'] += 1
                    if declared:
                        c[f'{kind}: declared pairs to a later module'] += 1
            if not declared:
                c['undeclared pairs (any file kind)'] += 1
                und_pairs.setdefault((a, b), {}).setdefault(route, []).extend(refs[:3])
        S[route] = dict(c)
    return S, und_pairs, unowned, deps


if __name__ == '__main__':
    S, und, unowned, deps = summarise(TIP)
    print('tip', TIP)
    print(json.dumps(S, indent=1, sort_keys=True))
    print('undeclared pairs, union of routes:', len(und))
    print('code files with no owner that import a module file:', len(unowned), 'imports:', sum(unowned.values()))
    by_route = collections.Counter(tuple(sorted(v)) for v in und.values())
    print('undeclared pairs by route combination:', dict((' + '.join(k), v) for k, v in by_route.items()))
    jdump(dict(tip=TIP, summary=S,
               undeclared=[dict(user=a, provider=b, routes={r: v for r, v in rv.items()}) for (a, b), rv in sorted(und.items())],
               unowned=dict(unowned)), 'undeclared_tip.json')

    # --- at each change's own commit: undeclared dependents of the provider that were not told
    notices, tri, owed, ans, wd = load_notices()
    res = resolve(notices, load_merges())
    rows = []
    c = collections.Counter()
    for key, n in sorted(notices.items()):
        r = res[key]; P1, M = r['p1'], r['merge']
        prov = n['provider']
        mods = modules_at(P1)
        uses = {m['id']: set(m.get('uses', [])) for m in mods}
        told = set(n['users'])
        deps, _ = deps_at(P1)
        changed = {p for s, p in diff_names(P1, M)}
        for route, d in deps.items():
            for (a, b), refs in d.items():
                if b != prov or b in uses.get(a, ()) or a in told:
                    continue
                hit = [x for x in refs if x[2] in changed]
                kinds = sorted({k for f, k, to in refs})
                rows.append(dict(key=key, user=a, provider=b, route=route, file_kinds=kinds,
                                 refs=[list(x) for x in refs[:4]], changed_file_referenced=[list(x) for x in hit[:4]]))
                c[f'{route}: (change, undeclared user) pairs not told'] += 1
                c[f'{route}: of those, the referenced file itself changed in the merge'] += bool(hit)
                for k in kinds:
                    c[f'{route}: pairs with a reference from the user\'s {k} files'] += 1
    # union over routes
    u = {(x['key'], x['user']) for x in rows}
    uh = {(x['key'], x['user']) for x in rows if x['changed_file_referenced']}
    ui = {(x['key'], x['user']) for x in rows if x['route'] == 'import'}
    uih = {(x['key'], x['user']) for x in rows if x['route'] == 'import' and x['changed_file_referenced']}
    uis = {(x['key'], x['user']) for x in rows if x['route'] == 'import' and 'source' in x['file_kinds']}
    c['union: (change, undeclared user) pairs not told'] = len(u)
    c['union: changes with at least one'] = len({k for k, _ in u})
    c['union: with the referenced file changed'] = len(uh)
    c['union: changes with at least one (referenced file changed)'] = len({k for k, _ in uh})
    c['import: changes with at least one'] = len({k for k, _ in ui})
    c['import: changes with at least one (imported file changed)'] = len({k for k, _ in uih})
    c['import: pairs where the user\'s SOURCE imports'] = len(uis)
    print(json.dumps(c, indent=1, sort_keys=True))
    jdump(rows, 'undeclared_at_changes.json')
    jdump(dict(c), 'undeclared_at_changes_counts.json')
