"""What the user's own job wrote about each notice it was judged affected by: added lines in the
follow-up window (see followup.py) that mention the notice, taken from tests' header comments,
requirement files, requirement notes and source comments. Text only; output data/jobsaid.json and
scratch/jobsaid.txt for reading."""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
F = load('followup.json')
out = {}
txt = []
for i, o in enumerate(F):
    prov, pr = o['key'].split(':')
    pats = [re.compile(rf'{re.escape(prov)}[:\s#-]+(?:PR\s*|pr\s*|#)?{pr}\b'), re.compile(rf'\bPR\s*#?{pr}\b')]
    said = []
    for w in o['window']:
        x = [r for r in rload('no_notice_rows.json') if r['merge'].startswith(w['merge']) and r['module'] == o['user']][0] if False else None
    for w in o['window']:
        m = R.git('rev-parse', w['merge']).strip()
        d = R.git('diff', '-U0', m + '^1', m)
        cur = None
        for l in d.splitlines():
            if l.startswith('+++ '):
                cur = l[6:]; continue
            if not l.startswith('+') or cur is None or cur.startswith('process/metrics') or cur.startswith('process/ledger'):
                continue
            if any(p.search(l) for p in pats):
                said.append((cur, l[1:].strip()[:700]))
        # header comment of a notice test
        for f in o['notice_test']:
            t = R.show(m, f)
            if t:
                mm = re.match(r'\s*/\*(.*?)\*/', t, re.S)
                if mm:
                    said.append((f, 'HEADER: ' + re.sub(r'\s+', ' ', mm.group(1))[:900]))
    # merge row review note in metrics
    mt = R.show(R.TRANCHE, f'process/metrics/{o["user"]}.jsonl') or ''
    for line in mt.splitlines():
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get('row') == 'merge' and d.get('pr') in [w['pr'] for w in o['window']]:
            said.append(('merge-note', f"PR {d.get('pr')}: {d.get('review')}"[:500]))
    seen = set(); s2 = []
    for a, b in said:
        if (a, b) not in seen:
            seen.add((a, b)); s2.append((a, b))
    out[f"{o['key']}|{o['user']}"] = s2
    txt.append(f"\n[{i}] {o['key']} -> {o['user']}  src={len(o['source'])} near={o['ev_near']} ntest={bool(o['notice_test'])}")
    for a, b in s2[:6]:
        txt.append(f"   {os.path.basename(a)}: {b[:600]}")
dump(out, 'jobsaid.json')
open(os.path.join(SCRATCH, 'jobsaid.txt'), 'w').write('\n'.join(txt))
print(sum(1 for v in out.values() if v), 'of', len(out), 'have text')
