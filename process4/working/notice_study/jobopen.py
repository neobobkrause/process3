"""For each notified pair: did the user module have a job open when the provider's change merged,
and did it have work of its own (a "not yet met" mark)? Job spans are read from the receipts in
process/metrics/<module>.jsonl at origin/tranche: an attempt's `start` row to the `merge` row that
follows it (or its `complete` row when no merge row follows).
Output data/jobopen.json {"key|user": {"open": bool, "started_within_2h_after": bool}}."""
import sys, os, json, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
import lib
ROWS = rload('j4a_rows.json')
def ts(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
spans = {}
def spans_of(mod):
    if mod in spans: return spans[mod]
    out = []; start = None; last = None
    for line in (lib.show(lib.TRANCHE, f'process/metrics/{mod}.jsonl') or '').splitlines():
        try: d = json.loads(line)
        except Exception: continue
        at = d.get('at')
        if not at: continue
        if d.get('row') == 'attempt' and d.get('event') == 'start':
            if start is not None and last is not None: out.append((start, last))
            start = ts(at); last = None
        elif d.get('row') == 'attempt' and d.get('event') == 'complete':
            last = ts(at)
        elif d.get('row') == 'merge':
            if start is not None:
                out.append((start, ts(at))); start = None; last = None
    if start is not None:
        out.append((start, last or start + 3600))
    spans[mod] = out
    return out
out = {}; c = collections.Counter()
for key, r in ROWS.items():
    t = int(lib.git('log', '-1', '--format=%ct', r['merge']).strip())
    for u in r['told']:
        sp = spans_of(u)
        op = any(a <= t <= b for a, b in sp)
        soon = any(t < a <= t + 7200 for a, b in sp)
        out[f'{key}|{u}'] = dict(open=op, started_within_2h_after=soon)
        c['pairs'] += 1; c['open'] += op; c['started within 2h after'] += (soon and not op)
dump(out, 'jobopen.json'); print(dict(c))
