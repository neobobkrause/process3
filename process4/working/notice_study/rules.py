"""Candidate rules scored over the 178 recorded changes and the pairs Process3 notified.
Inputs: data/signals.json (signals.py), judged241.txt (judged classes), replay data.
Each rule is a function of (change parts, pair signals) -> bool "this user is told".
Prints the score table and writes data/rules.json and data/rules_pairs.json."""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
S = load('signals.json'); F = load('followup.json')
P = rload('parts.json'); ROWS = rload('j4a_rows.json')
J = [l.split() for l in open(os.path.join(HERE, 'judged241.txt')) if l.strip() and not l.startswith('#')]
cls = {(F[int(i)]['key'], F[int(i)]['user']): (k, o) for i, k, o in J}
BROKEN = {k for k, v in cls.items() if v[1] == 'B'}
ADOPT = {k for k, v in cls.items() if v[1] == 'A'}
REST = {k for k, v in cls.items() if v[1] in ('C', 'Nc', '?')}
assert len(cls) == 241

def chg(key):
    p = P[key]; n = p['names']; rq = p['reqs'] or {}
    return dict(source=bool(p['source']), pub=bool(rq.get('public_ids')), pub_test=bool(p['test_ids_public']),
                any_test_id=bool(p['test_ids']),
                pub_hard=bool(set(rq.get('public_changed', [])) | set(rq.get('public_removed', [])) | set(rq.get('public_retired', [])) | set(rq.get('public_marked_unmet', []))),
                pub_new=bool(rq.get('public_newly_met') or rq.get('public_added')),
                gone=bool(n['removed'] or n['changed']), value=bool(n['value_changed']), added=bool(n['added']),
                noncode=bool(p['noncode']), req=bool(p['req']),
                fixture=any(not re.search(r'\.test\.[a-z]+$', f) for f in p['tests']))
C = {k: chg(k) for k in P}

b_strict = lambda c, s: s['imp_gone']
b_wide = lambda c, s: s['imp_gone'] or s['imp_class'] or s['call_member']
RULES = collections.OrderedDict([
 ('a  every declared user, any source file changed', lambda c, s: c['source']),
 ('a2 every declared user, source changed or a public requirement changed (replay wording F)', lambda c, s: c['source'] or c['pub']),
 ('b  imports a removed or re-signed name', b_strict),
 ('b+ ... or imports the class, or calls a method of that name', b_wide),
 ('c  b + cites a changed public requirement (own requirements or tests)', lambda c, s: b_strict(c, s) or s['cite_req']),
 ('c+ b+ + cites a changed public requirement (also in source comments)', lambda c, s: b_wide(c, s) or s['cite_req_src']),
 ('d  c + imports a changed fixture/helper, or names a changed non-code file', lambda c, s: b_strict(c, s) or s['cite_req'] or s['imp_fixture'] or s['ref_noncode']),
 ('d+ c+ + same', lambda c, s: b_wide(c, s) or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode']),
 ('f  all users, only if a public requirement or a test naming one changed', lambda c, s: c['pub'] or c['pub_test']),
 ('f2 all users, only if a public requirement changed (tests not counted)', lambda c, s: c['pub']),
 ('f3 all users, only if a public requirement was reworded, removed, retired or un-met', lambda c, s: c['pub_hard']),
 ('g1 d+ + imports changed data by name + uses a word the provider dropped', lambda c, s: b_wide(c, s) or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished']),
 ('g2 g1 + imports a changed file whole', lambda c, s: b_wide(c, s) or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished'] or s['imp_whole_chg']),
 ('g3 g1 without citations (breakage signals only)', lambda c, s: b_wide(c, s) or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished']),
 ('g4 only users that import the provider at all, any source change', lambda c, s: c['source'] and s['imp']),
 ('h1 all users, only if a name was removed or re-signed, a public requirement reworded/removed/retired, or a fixture or non-code file touched', lambda c, s: c['gone'] or c['pub_hard'] or c['fixture'] or c['noncode']),
 ('h2 rule f, sent only to users that import the provider at all', lambda c, s: (c['pub'] or c['pub_test']) and s['imp']),
 ('h3 g1, plus all importing users when a public requirement was reworded, removed or retired', lambda c, s: b_wide(c, s) or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished'] or (c['pub_hard'] and s['imp'])),
 ('k1 taken away or changed under the user: b+, changed data imported by name, changed fixture, dropped word, or a cited requirement reworded/removed/retired', lambda c, s: b_wide(c, s) or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished'] or s['cite_req_hard']),
 ('o  (not a notice) user has its own not-yet-met mark naming the provider', lambda c, s: s['user_unmet_prov']),
 ('o2 (not a notice) user has any not-yet-met mark of its own', lambda c, s: s['user_unmet']),
 ('g1 or o', lambda c, s: b_wide(c, s) or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished'] or s['user_unmet_prov']),
])
res = []; pairs = {}
for name, fn in RULES.items():
    sent = judged = aff = br = ad = rest = 0; hit = set(); fires = set()
    for s in S:
        k = (s['key'], s['user'])
        if fn(C[s['key']], s):
            sent += 1; fires.add(s['key'])
            if s['verdict']: judged += 1
            if s['verdict'] == 'affected':
                aff += 1; hit.add(k)
                br += k in BROKEN; ad += k in ADOPT; rest += k in REST
    res.append(dict(rule=name, changes=len(fires), sent=sent, judged=judged, affected=aff, broken=br, adopted=ad,
                    no_change=rest, needless_judged=judged - aff,
                    missed_broken=sorted(f'{a}>{b}' for a, b in BROKEN - hit)))
    pairs[name] = sorted(f'{a}>{b}' for a, b in hit)
dump(res, 'rules.json'); dump(pairs, 'rules_pairs.json')
print(f"{'rule':86s} chg  sent  judg  aff/241 brk/{len(BROKEN)} adp/{len(ADOPT)} rest/{len(REST)} needless")
for r in res:
    print(f"{r['rule'][:86]:86s} {r['changes']:3d} {r['sent']:5d} {r['judged']:5d}  {r['affected']:4d}    {r['broken']:3d}     {r['adopted']:3d}     {r['no_change']:3d}    {r['needless_judged']:5d}")
print()
for r in res:
    if 0 < len(r['missed_broken']) <= 16 and r['rule'][0] in 'gdfh':
        print(r['rule'][:40], 'misses broken:', r['missed_broken'])
# universe of rule a over declared users
tot = sum(len(ROWS[k]['declared_p1']) for k in ROWS if C[k]['source'])
print('declared-user pairs at the first parent on changes with a source change:', tot, 'of', sum(len(ROWS[k]['declared_p1']) for k in ROWS))
# how often the user already had work of its own
c = collections.Counter()
for s in S:
    k = (s['key'], s['user'])
    c['pairs'] += 1; c['user_unmet'] += s['user_unmet']; c['user_unmet_prov'] += s['user_unmet_prov']
    if s['verdict'] == 'affected':
        o = cls[k][1]
        c[f'aff {o}'] += 1; c[f'aff {o} user_unmet'] += s['user_unmet']; c[f'aff {o} user_unmet_prov'] += s['user_unmet_prov']
    elif s['verdict']:
        c['not affected'] += 1; c['not affected user_unmet'] += s['user_unmet']
print(json.dumps(c, indent=0, sort_keys=True))
dump(dict(c), 'user_work.json')
