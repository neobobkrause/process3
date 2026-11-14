"""Per (change, user) signals for every pair Process3 notified (2,707) on the 178 recorded changes.
Everything is read at the change's own commits: the provider before (first parent) and after (merge),
the user's files as they stood before (first parent). Static text reading; no code is run.

Signals (all mechanical):
  imp            the user's files import some file of the provider
  imp_gone       ... import, by name, a name that the change removed or whose signature changed, or a deleted file
  imp_class      ... import a class whose public member was removed or re-signed
  call_member    the user's code calls `.m(` where m is a removed or re-signed member of a provider class
  imp_value      ... import, by name, exported data whose value hash changed
  imp_whole_chg  ... import a changed provider file whole (namespace, default or dynamic import) while a name or value of it changed
  imp_fixture    the user's files import a file under the provider's tests that the change touched
  ref_noncode    the user's files name the path of a non-code file of the provider's source that the change touched
  cite_req       the user's requirement file or tests cite `<provider> R<n>` for a public id the change touched
  cite_req_src   same, also reading the user's source comments
  cite_req_hard  cite_req restricted to ids reworded, removed, retired or marked unmet (not ids newly met or added)
  vanished       the user's files use, as a quoted string, an object key or a property, a word (8+ characters)
                 that the provider's code (comments left out) used before the change and uses nowhere after it
  user_unmet     the user's requirement file holds a "not yet met" mark (the module has work of its own)
  user_unmet_prov ... on a line that names the provider
Output: data/signals.json (list of rows)."""
import sys, os, re, json, collections, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
from extract import *   # replay extractor names
import lib

N, T, O, A, W = notices()
ROWS = rload("j4a_rows.json"); P = rload("parts.json")
IMP = re.compile(r'''\bimport\s*(?:([A-Za-z$_][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z$_][\w$]*))?\s*from\s*(['"])([^'"\n]+)\4''')
WORD = re.compile(r'[A-Za-z_$][\w$]{7,}')

_files_by_mod = {}
def files_by_module(rev):
    if rev not in _files_by_mod:
        own = lib.owner_map(rev); d = collections.defaultdict(lambda: dict(source=[], test=[]))
        for f in tree_oids(rev):
            if '/dist/' in f or f.endswith('.bundled.mjs') or '/node_modules/' in f:
                continue
            m, k = own(f)
            if m:
                d[m][k].append(f)
        _files_by_mod.clear(); _files_by_mod[rev] = d
    return _files_by_mod[rev]

def expand_ids(s):
    """'R19, R29 and R30', 'R87–R90', 'R87 to R90' -> set of ids"""
    out = set()
    toks = re.findall(r'R(\d+)[a-z]?|(–|—|-|\bto\b)', s)
    prev = None; rng = False
    for num, sep in toks:
        if num:
            n = int(num)
            if rng and prev is not None and 0 < n - prev <= 200:
                out.update(f'R{k}' for k in range(prev, n + 1))
            out.add(f'R{n}'); prev = n; rng = False
        elif sep:
            rng = True
    return out

def cites(text, prov):
    out = set()
    for m in re.finditer(r'(?<![\w-])`?' + re.escape(prov) + r"`?(?:'s|’s)?(?![\w-])[ \t]*(?:PR \d+[;,:]?[ \t]*)?((?:R\d+[a-z]?(?:[ \t]*(?:,|and|to|–|—|-|/|;)[ \t]*)?)+)", text):
        out |= expand_ids(m.group(1))
    for m in re.finditer(r'(?<![\w-])' + re.escape(prov) + r':(R\d+)', text):
        out.add(m.group(1))
    return out

out = []
t0 = time.time()
for n_i, key in enumerate(sorted(ROWS)):
    r = ROWS[key]; p = P[key]; P1, M = r['p1'], r['merge']; prov = r['provider']
    e = lib.entry(P1, prov) or lib.entry(M, prov)
    changed = {f for s, f in lib.diff_names(P1, M)}
    deleted = {f for s, f in lib.diff_names(P1, M) if s == 'D'}
    inmod = lambda f: lib.classify(e, f) in ('source', 'test')
    t1 = tree_oids(P1)
    own1 = lib.owner_map(P1)
    fbm = files_by_module(P1)
    # per-file name differences for every changed provider file (source or test)
    S1 = Surface(P1, inmod); S2 = Surface(M, inmod)
    fdiff = {}
    def diff_of(to):
        if to not in fdiff:
            a = S1.of(to); b = S2.of(to) if to in tree_oids(M) else {}
            fdiff[to] = names_diff(a, b)
        return fdiff[to]
    n = p['names']
    gone_all = set(n['removed']) | {d['name'] for d in n['changed']}
    members = {g.split('.', 1)[1].rstrip('=') for g in gone_all if '.' in g}
    classes = {g.split('.')[0] for g in gone_all if '.' in g}
    rq = p['reqs'] or {}
    pub_all = set(rq.get('public_ids', []))
    pub_hard = set(rq.get('public_changed', [])) | set(rq.get('public_removed', [])) | set(rq.get('public_retired', [])) | set(rq.get('public_marked_unmet', []))
    prov_tests_changed = {f for f in changed if lib.classify(e, f) == 'test'}
    noncode = set(p['noncode'])
    # vanished words
    van = set()
    src_changed = [f for f in changed if lib.classify(e, f) == 'source' and CODE.search(f)]
    if src_changed:
        before = set()
        for f in src_changed:
            tx = read_at(P1, f)
            if tx and len(tx) < 3_000_000:
                before |= set(WORD.findall(blank(tx)[1]))   # comments blanked, strings kept
        after = set()
        em = lib.entry(M, prov) or e
        for f in tree_oids(M):
            if lib.classify(em, f) == 'source' and CODE.search(f) and '/dist/' not in f:
                tx = read_at(M, f)
                if tx and len(tx) < 3_000_000:
                    after |= set(WORD.findall(blank(tx)[1]))
        van = before - after
    alt = '|'.join(sorted(map(re.escape, van), key=len, reverse=True))
    van_rx = re.compile(r'(?:["\'`.](' + alt + r')\b|\b(' + alt + r')(?:["\'`]|\s*:))') if van else None
    imports_to_prov = collections.defaultdict(list)
    for f, to in import_edges(P1):
        if own1(to)[0] == prov:
            u = own1(f)[0]
            if u and u != prov:
                imports_to_prov[u].append((f, to))
    judged = {t['user']: t['verdict'] for t in T[key]}
    for user in r['told']:
        s = dict(key=key, user=user, verdict=judged.get(user), imp=False, imp_gone=False, imp_class=False,
                 call_member=False, imp_value=False, imp_whole_chg=False, imp_fixture=False, ref_noncode=False,
                 cite_req=False, cite_req_src=False, cite_req_hard=False, vanished=False, user_unmet=False,
                 user_unmet_prov=False)
        uf = fbm.get(user, dict(source=[], test=[]))
        for f, to in imports_to_prov.get(user, []):
            s['imp'] = True
            if to in deleted:
                s['imp_gone'] = True
            if to in prov_tests_changed:
                s['imp_fixture'] = True
            nd = diff_of(to)   # read even when the imported file itself is unchanged: it may re-export a changed one
            gone = set(nd['removed']) | {d['name'] for d in nd['changed']}
            val = set(nd['value_changed'])
            cls = {g.split('.')[0] for g in gone if '.' in g}
            text = read_at(P1, f) or ''
            names = set(); whole = False
            for m in IMP.finditer(text):
                if resolve_spec(f, m.group(5), t1) != to:
                    continue
                if m.group(3) or m.group(1):
                    whole = True
                for part in (m.group(2) or '').split(','):
                    a = re.split(r'\s+as\s+', part.strip())[0].strip()
                    if a:
                        names.add(a)
            if not names and not whole:
                whole = True
            if names & gone: s['imp_gone'] = True
            if names & cls: s['imp_class'] = True
            if names & val: s['imp_value'] = True
            if whole and (gone or val): s['imp_whole_chg'] = True
        # text signals
        ureq = lib.show(P1, lib.req_file(user)) or ''
        if re.search(r'\*\(not yet met\b', ureq, re.I):
            s['user_unmet'] = True
            for l in ureq.splitlines():
                if re.search(r'\*\(not yet met\b', l, re.I) and re.search(r'(?<![\w-])' + re.escape(prov) + r'(?![\w-])', l):
                    s['user_unmet_prov'] = True; break
        need_text = bool(pub_all or members or noncode or van_rx)
        if need_text:
            c_rt = cites(ureq, prov) if pub_all else set()
            c_src = set()
            mem_rx = re.compile(r'\.(' + '|'.join(map(re.escape, sorted(members))) + r')\s*\(') if members else None
            nc_rx = re.compile('|'.join(re.escape(x) for x in sorted({os.path.basename(f) for f in noncode}))) if noncode else None
            for kind in ('test', 'source'):
                for f in uf[kind]:
                    if not (CODE.search(f) or f.endswith(('.json', '.jsonc', '.md'))):
                        continue
                    tx = read_at(P1, f)
                    if not tx or len(tx) > 3_000_000:
                        continue
                    if pub_all and prov in tx:
                        c = cites(tx, prov)
                        if kind == 'test': c_rt |= c
                        else: c_src |= c
                    if mem_rx and CODE.search(f) and mem_rx.search(tx): s['call_member'] = True
                    if nc_rx and nc_rx.search(tx) and any(nf in tx or os.path.basename(nf) in tx for nf in noncode):
                        # require the provider's directory name near the file name, or the full path
                        if any(nf in tx or (os.path.basename(os.path.dirname(nf)) + '/' + os.path.basename(nf)) in tx for nf in noncode):
                            s['ref_noncode'] = True
                    if van_rx and CODE.search(f) and not s['vanished']:
                        mm = van_rx.search(tx)
                        if mm:
                            s['vanished'] = True; s['vanished_word'] = mm.group(1) or mm.group(2)
            s['cite_req'] = bool(c_rt & pub_all)
            s['cite_req_hard'] = bool(c_rt & pub_hard)
            s['cite_req_src'] = bool((c_rt | c_src) & pub_all)
        out.append(s)
    if n_i % 20 == 0:
        print(n_i, key, round(time.time() - t0), 's', file=sys.stderr)
dump(out, 'signals.json')
c = collections.Counter()
for s in out:
    for k, v in s.items():
        if v is True: c[k] += 1
print(len(out), dict(c))
