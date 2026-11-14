"""J4 d: uses of a later module on the module list at the tranche tip (and at origin/main)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
for ref in (TRANCHE, 'origin/main'):
    rev = git('rev-parse', ref).strip()
    mods = modules_at(rev); pos = {m['id']: i + 1 for i, m in enumerate(mods)}
    back = [(m['id'], pos[m['id']], u, pos[u]) for m in mods for u in m.get('uses', []) if u in pos and pos[u] > pos[m['id']]]
    unknown = [(m['id'], u) for m in mods for u in m.get('uses', []) if u not in pos]
    selfuse = [m['id'] for m in mods if m['id'] in m.get('uses', [])]
    print(ref, rev[:10], 'modules', len(mods), 'declared uses', sum(len(m.get('uses', [])) for m in mods))
    print('  declared uses of a later module:', len(back), back)
    print('  uses of an unknown id:', unknown, ' self-use:', selfuse)
    # cycles among declared uses
    g = {m['id']: [u for u in m.get('uses', []) if u in pos] for m in mods}
    # mutual pairs
    mutual = sorted({tuple(sorted((a, b))) for a in g for b in g[a] if a in g.get(b, [])})
    print('  mutual declared pairs:', mutual)
und = jload('undeclared_tip.json')
imp = [(x['user'], x['provider']) for x in und['undeclared'] if 'import' in x['routes']]
mods = modules_at(git('rev-parse', TRANCHE).strip()); pos = {m['id']: i + 1 for i, m in enumerate(mods)}
later = [(a, pos[a], b, pos[b]) for a, b in imp if pos[b] > pos[a]]
print('undeclared test-import pairs to a later module at the tip:', len(later))
for x in later: print('   ', x)
