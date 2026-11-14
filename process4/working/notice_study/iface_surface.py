"""At the latest code: how much of each module's interface is reached by other modules, and how much of
it the tool describes as 'any' today. Read-only against the product clone.

Run: python3 -I iface_surface.py <path to tsc> <scratch dir>   (imports iface_writeout.py beside it)
Writes data/iface_surface.json.
"""
import sys, os, re, json, posixpath, collections, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import iface_writeout as w

TIP = w.TIP
mods = json.loads(w.git('show', f'{TIP}:build/modules.json'))['modules']
allfiles = [n for n in w.git('ls-tree', '-r', '--name-only', TIP).split('\n') if n.endswith('.mjs')]
fileset = set(allfiles)

def owner_of(path):
    best = None
    for m in mods:
        for p in (m.get('paths') or []) + (m.get('tests') or []):
            if path == p or path.startswith(p if p.endswith('/') else p + '/'):
                if best is None or len(p) > best[1]:
                    best = (m['id'], len(p))
    return best[0] if best else None

# every import of a relative file, anywhere in the product's .mjs files
reached = collections.defaultdict(set)      # source file -> modules (other than its owner) that import it
out = w.git('grep', '-n', '-E', r'''(from|import)\s*\(?\s*["']\.{1,2}/[^"']+["']''', TIP, '--', '*.mjs')
for line in out.split('\n'):
    m = re.match(r'[^:]+:([^:]+):\d+:(.*)$', line)
    if not m:
        continue
    src, text = m[1], m[2]
    for spec in re.findall(r'''(?:from|import)\s*\(?\s*["'](\.{1,2}/[^"']+)["']''', text):
        target = posixpath.normpath(posixpath.join(posixpath.dirname(src), spec))
        if target in fileset:
            a, b = owner_of(src), owner_of(target)
            if b and a != b:
                reached[target].add(a or '(no module)')

TEXTS = {}

def surface(j, m):
    res = w.writeout(TIP, m.get('paths') or [], f'surf{j}')
    rows = {}
    for f, t in res.items():
        if t is None:
            continue
        t = w.strip_comments(t)
        fns = re.findall(r'^export (?:declare )?(?:async )?function (\w+)\((.*)$', t, flags=re.M)
        ps = [p for _, sig in fns for p in re.findall(r'(\w+)\??: (\w+)', sig)]
        # methods of classes and of objects handed back: an indented `name(args): kind;` line
        meths = re.findall(r'^\s+(?:static |async |get |set )*#?(\w+)\((.*)\): ', t, flags=re.M)
        mps = [p for _, sig in meths for p in re.findall(r'(\w+)\??: (\w+)', sig)]
        TEXTS[f] = t
        rows[f] = {'methods': len(meths), 'method_handed': len(mps),
                   'method_handed_any': sum(1 for _, k in mps if k == 'any'),
                   'functions': len(fns), 'names': len(re.findall(r'^export ', t, flags=re.M)),
                   'handed': len(ps), 'handed_any': sum(1 for _, k in ps if k == 'any'),
                   'any': len(re.findall(r': any\b', t)), 'lines': t.count('\n') + 1,
                   'reached_by': sorted(reached.get(f, []))}
    return m['id'], rows

with cf.ThreadPoolExecutor(6) as ex:
    data = dict(ex.map(lambda jm: surface(*jm), enumerate(mods)))
json.dump(data, open(os.path.join(HERE, 'data', 'iface_surface.json'), 'w'), indent=1)
files = [(m, f, r) for m, rows in data.items() for f, r in rows.items()]
entry = [x for x in files if x[2]['reached_by']]
print('source files', len(files), 'reached by another module', len(entry))
json.dump(TEXTS, open(os.path.join(sys.argv[2], 'tip_writeout_texts.json'), 'w'))
for k in ('functions', 'handed', 'handed_any', 'methods', 'method_handed', 'method_handed_any', 'names', 'any'):
    print(k, 'all files', sum(x[2][k] for x in files), '| files others reach', sum(x[2][k] for x in entry))
print('modules with at least one file others reach', len({x[0] for x in entry}))
