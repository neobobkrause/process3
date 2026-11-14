"""J5 b, support for the judged form: for each affected verdict the mechanical form could not
decide, gather the text a notified job would read if it read only the named parts (signatures
before/after, the requirement lines of the named ids, the changed tests that bear those ids, the
diff of a named non-code file) and list which code-like words of the evidence sentence occur there."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
P = jload('parts.json'); rows = jload('j5b_rows.json')

def test_texts(text):
    if text is None:
        return {}
    b, nc = blank(text); out = {}
    for m in TEST_CALL.finditer(b):
        q = m.group(1); s = m.end(); e = b.find(q, s)
        if e < 0: continue
        title = text[s:e]; op = b.rfind('(', m.start(), m.end()); cl = match_close(b, op)
        k = title; n = 1
        while k in out:
            n += 1; k = f'{title} #{n}'
        out[k] = text[op:cl + 1]
    return out

_cache = {}
def part_text(key):
    if key in _cache:
        return _cache[key]
    p = P[key]; mid = p['module']; P1, M = p['p1'], p['merge']
    T = []
    n = p['names']
    T += n['removed'] + n['added'] + n['value_changed']
    for d in n['changed']:
        T += [d['name'], d['before'], d['after']]
    ids = set((p['reqs'] or {}).get('public_ids', [])) | set(p['test_ids'])
    for rev in (P1, M):
        bl, _ = req_blocks(show(rev, req_file(mid)) or '')
        for sec, i, t in bl:
            if i in ids:
                T.append(t)
    for f in p['tests']:
        if not CODE.search(f): continue
        a, b = test_texts(read_at(P1, f)), test_texts(read_at(M, f))
        for t in set(a) | set(b):
            if a.get(t) != b.get(t) and RID.search(t):
                T += [a.get(t) or '', b.get(t) or '']
    for f in p['noncode']:
        T.append(git('diff', '-U3', P1, M, '--', f))
    _cache[key] = '\n'.join(T)
    return _cache[key]

STOP = set('''index import imports calls call returns return which whose their there these those through where before after still without unchanged changed change changes because being other every under tests test line lines also only from with that this into over what when then than have does not now its and the for are was were will would should could each both same such any all one two new old own use uses used user users reads read sends send takes take passes pass given gives make makes module modules provider answer answers refusal refuses refused'''.split())
def tokens(ev, user, prov):
    ev2 = re.sub(r'[\w./@-]+\.(?:mjs|jsonc|json|md|js)(?::[\d,:\-]+)?', ' ', ev)
    toks = []
    for t in re.findall(r'[A-Za-z_$#][\w$]*(?:\.[A-Za-z_$][\w$]*)*', ev2):
        for w in t.split('.'):
            w = w.lstrip('#')
            if len(w) < 4 or w.lower() in STOP: continue
            codey = re.search(r'[a-z][A-Z]', w) or '_' in w or (w.isupper() and len(w) >= 4) or re.search(r'\d', w)
            if codey and w not in toks:
                toks.append(w)
    return toks

out = []
for r in rows:
    if r['cls'] != 'cannot be decided mechanically':
        continue
    key = r['key']; prov = P[key]['module']
    pt = part_text(key)
    toks = tokens(r['evidence'], r['user'], prov)
    found = [w for w in toks if re.search(r'(?<![\w$])' + re.escape(w) + r'(?![\w$])', pt)]
    out.append(dict(key=key, user=r['user'], found=found, missing=[w for w in toks if w not in found], part_text_chars=len(pt)))
    open(os.path.join(SCRATCH, 'parttext_' + key.replace(':', '-') + '.txt'), 'w').write(pt)
jdump(out, 'j5b_support.json')
for i, o in enumerate(out):
    print(f"[{i}] {o['key']} {o['user']} chars={o['part_text_chars']} FOUND={o['found']} MISSING={o['missing']}")
