"""J4 c(1), binding route: service and cross-script durable-object bindings in wrangler files at
the tranche tip, against declared uses."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
TIP = git('rev-parse', TRANCHE).strip()
own = owner_map(TIP); mods = modules_at(TIP); uses = {m['id']: set(m['uses']) for m in mods}
t = tree_oids(TIP)
# script name -> module: the module owning <dir>/wrangler.jsonc whose "name" is the script
script = {}
wr = [f for f in t if re.search(r'(^|/)wrangler\.(jsonc|json|toml)$', f) and '/node_modules/' not in f]
for f in wr:
    tx = blob_text(t[f]) or ''
    m = re.search(r'^\s*"name"\s*:\s*"([^"]+)"', tx, re.M)
    if m: script[m.group(1)] = (own(f)[0], f)
print('wrangler files:', len(wr)); print('scripts:', script)
rows = []
for f in wr:
    a = own(f)[0]; tx = blob_text(t[f]) or ''
    tx2 = re.sub(r'^\s*//.*$', '', tx, flags=re.M)
    for m in re.finditer(r'\{[^{}]*?"(?:service|script_name)"\s*:\s*"([^"]+)"[^{}]*\}', tx2):
        target = m.group(1); b = script.get(target, (None, None))[0]
        rows.append((f, a, target, b, (b in uses.get(a, ())) if a and b else None, re.sub(r'\s+', ' ', m.group(0))[:110]))
c = collections.Counter()
for r in rows:
    print(r)
    if r[1] and r[3] and r[1] != r[3]:
        c['bindings to another module'] += 1; c['declared' if r[4] else 'NOT declared'] += 1
    elif r[1] and not r[3]: c['target script not resolved to a module'] += 1
print(dict(c)); jdump(dict(counts=dict(c), rows=rows), 'bindings_tip.json')
