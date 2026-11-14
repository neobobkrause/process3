"""Mechanical outcome of each affected verdict's follow-up (no judgment here).
  said_no_change   the user's job wrote, in a line that names this notice or in the header of its
                   notice test, that no code/source change was needed ("confirmed", "no code change", ...)
  near             a source hunk of the follow-up window lies within 25 lines of the line the verdict cited
Classes, first match wins:
  none             no follow-up merge exists (the process stopped) 
  records only     only ledger/metrics/notes files changed
  said no change   said_no_change
  source at the cited place   near, in a source file
  tests at the cited place    near, in a test file
  source elsewhere source files changed in the window, not at the cited place (cannot be attributed)
  tests only       only test files (and records) changed
Output data/outcome.json; prints counts; writes scratch/near_hunks.txt for reading."""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
F = load('followup.json'); J = load('jobsaid.json')
NO = re.compile(r'no (code|source) change|no change (here|is needed|needed|is owed|owed)|needs? no (code )?change|with no (code )?change|\bconfirmed\b|nothing (more )?(changes|to change)|so no source change is owed', re.I)
out = []; txt = []
for i, o in enumerate(F):
    said = J[f"{o['key']}|{o['user']}"]
    t = ' '.join(b for a, b in said if a != 'merge-note')
    said_no = bool(NO.search(t))
    ev_is_test = bool(o['ev_file'] and o['ev_file'] in o['test'])
    if not o['window']:
        c = 'none'
    elif not (o['source'] or o['test'] or o['req']):
        c = 'records only'
    elif said_no:
        c = 'said no change'
    elif o['ev_near'] and not ev_is_test:
        c = 'source at the cited place'
    elif o['ev_near']:
        c = 'tests at the cited place'
    elif o['source']:
        c = 'source elsewhere'
    else:
        c = 'tests only'
    out.append(dict(i=i, key=o['key'], user=o['user'], outcome=c, said_no=said_no, near=o['ev_near'],
                    has_source=bool(o['source']), has_test=bool(o['test']), notice_test=bool(o['notice_test'])))
    if o['ev_near'] and c != 'said no change':
        txt.append(f"\n[{i}] {o['user']}<{o['key']} {o['ev_file']}:{o['ev_line']}")
        n = 0
        for w in o['window']:
            m = R.git('rev-parse', w['merge']).strip()
            d = R.git('diff', '-U0', m + '^1', m, '--', o['ev_file'])
            keep = False
            for l in d.splitlines():
                mm = re.match(r'@@ -(\d+)(?:,(\d+))?', l)
                if mm:
                    a = int(mm.group(1)); b = a + max(int(mm.group(2) or 1), 1) - 1
                    keep = a - 25 <= o['ev_line'] <= b + 25
                    continue
                if keep and l[:1] in '+-' and not l.startswith(('+++', '---')) and n < 4 and len(l.strip()) > 12:
                    txt.append('   ' + l[:170]); n += 1
dump(out, 'outcome.json')
open(os.path.join(SCRATCH, 'near_hunks.txt'), 'w').write('\n'.join(txt))
c = collections.Counter(o['outcome'] for o in out)
for k, v in c.most_common(): print(v, k)
