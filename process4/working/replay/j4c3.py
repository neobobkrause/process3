"""J4 c(3): the notices whose merge changed no file under the provider's source paths, and which
trigger wording fires on each; then which wording fires on every change holding an affected verdict."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
P = jload('parts.json'); R = jload('j4a_rows.json')
notices, tri, owed, ans, wd = load_notices()
def flags(p):
    n = p['names']; rq = p['reqs'] or {}
    return dict(
        source=bool(p['source']),
        names=bool(n['removed'] or n['added'] or n['changed']), value=bool(n['value_changed']),
        public_req=bool(rq.get('public_ids')), test_ids=bool(p['test_ids']), noncode=bool(p['noncode']),
        tests_any=bool(p['tests']), req_any=bool(p['req']))
T = {
 'A source file changed (Process3 from 4 Nov)': lambda f: f['source'],
 'B four parts only (names incl. value hash, public ids, test ids, non-code files)': lambda f: f['names'] or f['value'] or f['public_req'] or f['test_ids'] or f['noncode'],
 'C four parts without the value hash': lambda f: f['names'] or f['public_req'] or f['test_ids'] or f['noncode'],
 'D names or public ids only (what Process3 recorded)': lambda f: f['names'] or f['public_req'],
 'E four parts OR any source file changed': lambda f: f['source'] or f['names'] or f['value'] or f['public_req'] or f['test_ids'] or f['noncode'],
 'F public ids OR any source file changed': lambda f: f['source'] or f['public_req'],
 'G any file of the module changed: source, tests or requirement file': lambda f: f['source'] or f['tests_any'] or f['req_any'],
}
print('--- the notices with no source change')
ns = [k for k, p in P.items() if not p['source']]
for k in sorted(ns, key=lambda k: notices[k]['at']):
    p = P[k]; f = flags(p); r = R[k]
    aff = r['affected']
    rq = p['reqs'] or {}
    print(f"{k}  at {notices[k]['at'][:16]}  withdrawn={k in wd}  told={len(r['told'])}  affected={len(aff)} {aff}  not-affected={len(r['not_affected'])}")
    print('    files:', [x for x in r['files']][:6], 'kinds', r['file_kinds'])
    print('    public ids:', rq.get('public_ids'), {a: b for a, b in rq.items() if b and a != 'public_ids'}, ' test ids:', p['test_ids'], ' tests w/o id:', p['test_files_no_id'][:3])
    print('    fires:', ' '.join(name[0] for name, fn in T.items() if fn(f)), ' misses:', ' '.join(name[0] for name, fn in T.items() if not fn(f)))
print('--- every trigger wording against the 178 changes and the 241 affected verdicts')
tot_aff = sum(len(R[k]['affected']) for k in P)
for name, fn in T.items():
    fired = [k for k, p in P.items() if fn(flags(p))]
    missed = [k for k in P if k not in fired]
    ma = [(k, len(R[k]['affected'])) for k in missed if R[k]['affected']]
    print(f"{name}: fires on {len(fired)} of 178; misses {len(missed)} changes; affected verdicts reached {tot_aff - sum(x for _, x in ma)} of {tot_aff}; missed affected in: {ma}")
