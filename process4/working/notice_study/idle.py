"""Users with work of their own against users with none, at the moment of each provider change.
has_work = the user's requirement file held a "not yet met" mark at the provider's first parent, or the
user had a job open when the provider merged (jobopen.py). Idle = neither.
Under Process4 a module with work gets a job anyway, and that job's module tests run against the tranche
as it then stands. The notice starts a job of its own only for an idle user."""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
S = load('signals.json'); F = load('followup.json'); JO = load('jobopen.json')
J = [l.split() for l in open(os.path.join(HERE, 'judged241.txt')) if l.strip() and not l.startswith('#')]
cls = {(F[int(i)]['key'], F[int(i)]['user']): o for i, k, o in J}
g1 = lambda s: s['imp_gone'] or s['imp_class'] or s['call_member'] or s['cite_req_src'] or s['imp_fixture'] or s['ref_noncode'] or s['imp_value'] or s['vanished']
c = collections.Counter(); idle_b = []
for s in S:
    k = (s['key'], s['user']); jo = JO[f"{s['key']}|{s['user']}"]
    work = s['user_unmet'] or jo['open']
    w = 'has work' if work else 'idle'
    c[('pairs', w)] += 1
    c[('pairs job open', jo['open'])] += 1
    if s['verdict']: c[('judged', w)] += 1
    if s['verdict'] == 'affected':
        o = cls[k]; c[(o, w)] += 1; c[(o, 'job open')] += jo['open']
        if o == 'B' and not work: idle_b.append(k)
    if g1(s):
        c[('g1', w)] += 1
        if s['verdict'] == 'affected': c[('g1 ' + cls[k], w)] += 1
for k in sorted(c, key=str): print(k, c[k])
print('broken idle users:', idle_b)
print('of them reached by g1:', [k for k in idle_b if g1({(s['key'], s['user']): s for s in S}[k])])
dump({f'{a}|{b}': v for (a, b), v in c.items()}, 'idle.json')
