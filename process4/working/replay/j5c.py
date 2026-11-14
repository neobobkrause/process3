"""J5 a/c: counts of named parts and of what the four parts do not see, across the 178 changes."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
P = jload('parts.json'); R = jload('j4a_rows.json'); J = jload('j5b_rows.json')
CODE = re.compile(r'\.(m|c)?(j|t)sx?$')
c = collections.Counter(); lists = collections.defaultdict(list)
aff = {k: len(R[k]['affected']) for k in P}
def add(name, k):
    c[name] += 1; c[name + ' :: affected verdicts in them'] += aff[k]; lists[name].append(k)
for k, p in sorted(P.items()):
    n = p['names']; na = p['names_all_files']; rq = p['reqs'] or {}
    names = bool(n['removed'] or n['added'] or n['changed']); val = bool(n['value_changed'])
    pub = bool(rq.get('public_ids')); tid = bool(p['test_ids']); nonc = bool(p['noncode'])
    code = [f for f in p['source'] if CODE.search(f)]
    anyp = names or val or pub or tid or nonc
    add('A1 at least one named part', k) if anyp else add('A2 no named part (unattributed)', k)
    if names: add('P1 exported names added/removed/signature changed', k)
    if n['removed'] or n['changed']: add('P1b a name removed or its signature changed', k)
    if names and not (n['removed'] or n['changed']): add('P1c names added only', k)
    if val: add('P1v value hash of exported data changed', k)
    if pub: add('P2 public requirement ids changed', k)
    for kind in ('public_added', 'public_removed', 'public_changed', 'public_newly_met', 'public_retired', 'public_marked_unmet'):
        if rq.get(kind): add('P2 ' + kind, k)
    if tid: add('P3 ids whose tests changed', k)
    if nonc: add('P4 published non-code file changed', k)
    # --- not seen
    if val and not names: add('N1 value changed under an unchanged name, no name added/removed/re-signed (seen only by the value hash)', k)
    if val and not (names or pub or tid or nonc): add('N1a ... and no other part at all (unattributed without the value hash)', k)
    allv = bool(na['removed'] or na['added'] or na['changed'] or na['value_changed'])
    if code and not (names or val) and allv: add('N2 an export of a non-entry source file changed, nothing at the entry files (indirect value or inner file)', k)
    if code and not (names or val): add('N3 source code changed, no exported name, signature or value hash changed (body-only at the entry files)', k)
    if code and not (names or val) and not pub: add('N3a ... and no public id changed either', k)
    if code and not (names or val) and not pub and not tid: add('N3b ... and no test id either', k)
    if p['req'] and not pub:
        add('N4 requirement file changed, no public R id changed', k)
        if rq.get('found_ids') and not rq.get('private_ids') and not rq.get('public_other_text') and not rq.get('other_text'):
            add('N4a ... changed only in found marks (F ids)', k)
        elif rq.get('found_ids'): add('N4b ... found marks plus other non-public text', k)
        else: add('N4c ... private ids or other text only', k)
    if rq.get('found_ids'): add('N4x requirement file changed a found mark (any)', k)
    if rq.get('public_other_text'): add('N5 Public text outside any id line changed (Purpose, Terms)', k)
    if p['tests'] and not tid: add('N6 test files changed, none bearing a requirement id', k)
    if p['test_files_no_id']: add('N6a at least one changed test file with no id-titled test changed (fixture, helper, untitled)', k)
    fx = [f for f in p['tests'] if not re.search(r'\.test\.[a-z]+$', f)]
    if fx: add('N6b a non-test file under the tests changed (fixture or helper other modules may import)', k)
    if not p['source']: add('N7 no source file changed', k)
out = {}
for name in sorted(c):
    if ' :: ' in name: continue
    out[name] = dict(changes=c[name], affected=c[name + ' :: affected verdicts in them'])
    print(f"{c[name]:4d} changes, {c[name + ' :: affected verdicts in them']:3d} affected verdicts | {name}")
print('unattributed:', lists['A2 no named part (unattributed)'])
print('N2:', lists['N2 an export of a non-entry source file changed, nothing at the entry files (indirect value or inner file)'])
print('N4a:', lists['N4 requirement file changed, no public R id changed' if False else 'N4a ... changed only in found marks (F ids)'])
# scoring of the 241 under variants of the part list
def cls_variant(r, use_val=True, use_tests=True, use_nonc=True):
    p = P[r['key']]; n = p['names']; rq = p['reqs'] or {}
    anyp = bool(n['removed'] or n['added'] or n['changed'] or (use_val and n['value_changed']) or rq.get('public_ids') or (use_tests and p['test_ids']) or (use_nonc and p['noncode']))
    if not anyp: return 'unattributed'
    h = r['hit']
    if h['names'] or (use_val and h['values']) or h['public'] or (use_tests and h['tests']) or (use_nonc and h['noncode']): return 'evidence names a part'
    return 'undecided'
for label, kw in [('all four parts with value hash', {}), ('without value hash', dict(use_val=False)), ('without test ids', dict(use_tests=False)),
                  ('names and public ids only', dict(use_val=False, use_tests=False, use_nonc=False))]:
    print(label, dict(collections.Counter(cls_variant(r, **kw) for r in J)))
jdump(dict(counts=out, lists=lists), 'j5c_counts.json')
