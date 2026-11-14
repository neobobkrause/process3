"""For each notified pair: does the user's non-test source import the provider, and do its tests?
Output data/srcimp.json {"key|user": [imp_src, imp_test]}."""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
from extract import import_edges
import lib
ROWS = rload('j4a_rows.json'); out = {}
for key in sorted(ROWS):
    r = ROWS[key]; own = lib.owner_map(r['p1']); prov = r['provider']
    src = set(); tst = set()
    for f, to in import_edges(r['p1']):
        if own(to)[0] == prov:
            u, k = own(f)
            if u and u != prov:
                (src if k == 'source' else tst).add(u)
    for u in r['told']:
        out[f'{key}|{u}'] = [u in src, u in tst]
dump(out, 'srcimp.json')
c = collections.Counter((a, b) for a, b in out.values()); print(c)
