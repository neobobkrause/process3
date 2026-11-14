"""J4 c(2), summary of no_notice.py's rows."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
rows = jload('no_notice_rows.json'); meta = jload('no_notice_meta.json')
import datetime
fn = datetime.datetime.fromisoformat(meta['first_notice_at'].replace('Z', '+00:00')).timestamp()
print('merge commits read:', meta['merges'], ' (module, merge) rows:', len(rows), ' first notice at', meta['first_notice_at'])
mk = collections.Counter(); seen = set()
for r in rows:
    if r['merge'] not in seen:
        seen.add(r['merge']); mk[r['kind']] += 1
print('merges with at least one module file changed, by kind:', dict(mk))
def anyp(r): return r['part_names'] or r['part_req'] or r['part_tests'] or r['part_noncode']
def strict(r): return bool(r['names_removed'] or r['names_changed'] or r['public_ids'])
def p3voc(r): return bool(r['names_removed'] or r['names_changed'] or r['names_added'] or r['public_ids'])
def reason(r):
    if r['notice']: return '0 notice raised'
    if not r['own_job']:
        return '6 another module\'s file changed by a job (no route)' if r['kind'] != 'other' else '7 non-job merge (bob/, p3/, lane/, found/, owner patch): no route'
    if r['at'] < fn: return '1 job merged before the first notice was ever written (route not yet live)'
    if r['users'] == 0: return '2 module has no declared user'
    if r['kind'] == 'layer':
        if r['rescheduled']: return '3 layer flow: users rescheduled, no notice'
        return '4 layer flow: no notice and no reschedule' + (' (its own check said interface changed)' if r['land_changed'] else ' (its own check said unchanged)' if r['land'] else ' (no land row)')
    if r['source'] == 0: return '5 job merge with no source file changed (Process3 rule from 4 Nov: no notice)'
    return '8 job merge with source changed and declared users, yet no notice'
for label, pred in [('four parts (any)', anyp), ('a name removed/re-signed or a public id changed', strict), ('names or public ids (Process3 vocabulary)', p3voc)]:
    print('\n===', label)
    for scope, sel in [('own-module rows of job and layer merges', lambda r: r['own_job']), ('all rows', lambda r: True)]:
        S = [r for r in rows if sel(r) and pred(r)]
        c = collections.Counter(reason(r) for r in S)
        nn = sum(v for k, v in c.items() if not k.startswith('0'))
        print(f'  {scope}: interface-changing {len(S)}; with notice {c["0 notice raised"]}; without {nn} ({100*nn/len(S):.0f}%)')
        for k in sorted(c):
            print(f'      {c[k]:4d}  {k}')
        reach = [r for r in S if r['reachable']]
        cr = collections.Counter(reason(r).startswith('0') for r in reach)
        print(f'      reachable from origin/tranche only: {len(reach)} interface-changing; without notice {cr[False]} ({100*cr[False]/max(1,len(reach)):.0f}%)')
x = [r for r in rows if reason(r).startswith('8') and anyp(r)]
print('\ncategory 8 rows:')
for r in x: print('  ', r['module'], r['pr'], r['kind'], 'users', r['users'], 'src', r['source'], 'names-/~/+', r['names_removed'], r['names_changed'], r['names_added'], 'pub', r['public_ids'][:5], 'tests', r['test_ids'][:5], datetime.datetime.utcfromtimestamp(r['at']).isoformat())
x = [r for r in rows if reason(r).startswith('4') and anyp(r)]
print('category 4 rows:', len(x), collections.Counter((r['land_changed'], r['land_class']) for r in x))
for r in x[:40]: print('  ', r['module'], r['pr'], 'users', r['users'], 'src', r['source'], 'names-/~/+', r['names_removed'], r['names_changed'], r['names_added'], 'val', r['value_changed'], 'pub', r['public_ids'][:5], 'tests', r['test_ids'][:4], 'land', r['land_changed'], r['land_class'])
