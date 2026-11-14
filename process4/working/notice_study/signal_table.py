"""Per-signal scores, the judged classification tables for the 241, and the sample of 120 crossed with rules."""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
S = load('signals.json'); F = load('followup.json'); OC = load('outcome.json'); P = rload('parts.json')
J = [l.split() for l in open(os.path.join(HERE, 'judged241.txt')) if l.strip() and not l.startswith('#')]
cls = {(F[int(i)]['key'], F[int(i)]['user']): (k, o) for i, k, o in J}
out = {}
print('signal: sent / judged / affected / broken / adopted')
tab = {}
for sig in ['imp', 'imp_gone', 'imp_class', 'call_member', 'imp_value', 'imp_whole_chg', 'imp_fixture', 'ref_noncode', 'cite_req', 'cite_req_src', 'cite_req_hard', 'vanished', 'user_unmet', 'user_unmet_prov']:
    rows = [s for s in S if s[sig]]
    aff = [s for s in rows if s['verdict'] == 'affected']
    b = sum(cls[(s['key'], s['user'])][1] == 'B' for s in aff); a = sum(cls[(s['key'], s['user'])][1] == 'A' for s in aff)
    tab[sig] = dict(sent=len(rows), judged=sum(1 for s in rows if s['verdict']), affected=len(aff), broken=b, adopted=a)
    print(f"{sig:16s} {len(rows):5d} {tab[sig]['judged']:5d} {len(aff):4d} {b:3d} {a:3d}")
out['signals'] = tab
# vanished examples
ex = collections.Counter(s.get('vanished_word') for s in S if s['vanished'])
print('vanished words (top):', ex.most_common(25))
out['vanished_words'] = ex.most_common(60)
# judged tables
kinds = collections.Counter(); ko = collections.Counter(); oc = collections.Counter(); mech = collections.Counter()
pubflag = collections.Counter()
for (i, k, o), m in zip(J, OC):
    f = F[int(i)]; p = P[f['key']]; rq = p['reqs'] or {}
    kinds[k] += 1; ko[(k, o)] += 1; oc[o] += 1; mech[(o, m['outcome'])] += 1
    if k in ('BEH', 'DATA'):
        pubflag[(k, 'public requirement changed in the same change' if rq.get('public_ids') else 'no public requirement changed', o)] += 1
out['kind'] = dict(kinds); out['outcome'] = dict(oc)
out['kind_outcome'] = {f'{a}|{b}': v for (a, b), v in ko.items()}
out['judged_vs_mechanical'] = {f'{a}|{b}': v for (a, b), v in mech.items()}
out['behaviour_by_requirement'] = {f'{a}|{b}|{c}': v for (a, b, c), v in pubflag.items()}
print(json.dumps(out['kind_outcome'], indent=0, sort_keys=True))
print(json.dumps(out['behaviour_by_requirement'], indent=0, sort_keys=True))
print(json.dumps(out['judged_vs_mechanical'], indent=0, sort_keys=True))
# follow-up mechanics
c = collections.Counter()
for f, m in zip(F, OC):
    c['window: ' + ('none' if not f['window'] else 'source' if f['source'] else 'tests only' if f['test'] else 'records only')] += 1
    c['answering merge: ' + ('none' if not f['window'] else 'source' if f['last_source'] else 'tests only' if f['last_test'] else 'records only')] += 1
    c['mechanical: ' + m['outcome']] += 1
    c['notice test added'] += bool(f['notice_test'])
out['followup'] = dict(c); print(json.dumps(dict(c), indent=0, sort_keys=True))
# broken: was the user's own existing test the thing that broke (evidence cites a user test file, or my judged list)
bt = [(f['key'], f['user']) for (i, k, o), f in zip(J, F) if o == 'B' and (f['ev_file'] or '') and re.search(r'/test/', f['ev_file'] or '')]
out['broken_evidence_cites_user_test'] = len(bt); print('broken whose evidence cites a user test file:', len(bt))
# sample
smp = load('sample_not_affected.json'); why = {}
for l in open(os.path.join(HERE, 'judged_sample.txt')):
    if l.startswith('N') and ':' in l:
        code, rest = l.split(':'); [why.__setitem__(int(x), code) for x in rest.split()]
assert len(why) == 120
sig = {(s['key'], s['user']): s for s in S}
sc = collections.Counter(why.values()); print('sample reasons', sc)
g1 = lambda s: s['imp_gone'] or s['imp_class'] or s['call_member'] or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished']
cross = collections.Counter()
for r in smp:
    s = sig[(r['key'], r['user'])]; w = why[r['i']]
    cross[(w, 'imports the provider' if s['imp'] else 'no import')] += 1
    cross[(w, 'g1 would send')] += bool(g1(s))
    rq = P[r['key']]['reqs'] or {}
    cross[(w, 'f would send')] += bool(rq.get('public_ids') or P[r['key']]['test_ids_public'])
out['sample'] = dict(reasons=dict(sc), cross={f'{a}|{b}': v for (a, b), v in cross.items()})
print(json.dumps(out['sample']['cross'], indent=0, sort_keys=True))
dump(out, 'tables.json')
