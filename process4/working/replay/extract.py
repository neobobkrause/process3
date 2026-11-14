"""Mechanical extraction of the four interface parts between two commits.

Part 1  exported names: functions with parameter lists, class public members, a hash of the
        initializer text of exported data ("value hash").  Static reading, a Python port of the
        approach in Process3's tool/lib/exports.mjs (entry files = provider source files that a
        file outside the module imports, else its index files; re-exports followed inside the
        module), plus the value hash that Process3 did not have.
Part 2  public requirements: ids under `## Public` of build/requirements/<module>.md, changed,
        added, removed, retired, newly met.
Part 3  requirements whose tests changed: ids in titles of tests added, removed or changed in
        files under the module's tests.
Part 4  published non-code files: non-code, non-doc files under the module's source paths.
"""
import sys, os, re, hashlib, functools, posixpath, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import lib

CODE = re.compile(r'\.(m|c)?(j|t)sx?$')
EXTS = ['.mjs', '.js', '.cjs', '.ts', '.mts', '.jsx', '.tsx']

# ---------- trees and blobs by object id ---------------------------------------

@functools.lru_cache(maxsize=4096)
def tree_oids(rev):
    out = {}
    for line in git('ls-tree', '-r', rev).split('\n'):
        if not line:
            continue
        meta, path = line.split('\t', 1)
        mode, typ, oid = meta.split(' ')
        if typ == 'blob':
            out[path] = oid
    return out


_OB = None
_TEXT = {}
def blob_text(oid):
    global _OB
    if oid in _TEXT:
        return _TEXT[oid]
    if _OB is None:
        _OB = lib.Batch()
    b = _OB.get(oid)
    _OB.cache.pop(oid, None)
    t = None if b is None else b.decode('utf8', 'replace')
    if t is not None and len(t) < 600000:
        _TEXT[oid] = t
    return t


def read_at(rev, path):
    oid = tree_oids(rev).get(path)
    return None if oid is None else blob_text(oid)

# ---------- import specifiers ----------------------------------------------------

SPEC_RES = [
    re.compile(r'''\bimport\s+(?:[^'"`;()]*?\s*from\s*)?(['"])([^'"\n]+)\1'''),
    re.compile(r'''\bexport\s+[^'"`;()]*?\s*from\s*(['"])([^'"\n]+)\1'''),
    re.compile(r'''\bimport\s*\(\s*(['"`])([^'"`\n]+)\1\s*\)'''),
    re.compile(r'''\brequire\s*\(\s*(['"])([^'"\n]+)\1\s*\)'''),
    # dynamic import through a URL object: import(new URL('./x.mjs', import.meta.url))
    re.compile(r'''\bimport\s*\(\s*new\s+URL\s*\(\s*(['"`])([^'"`\n]+)\1'''),
]
_SPECS = {}
MAX_SCAN = 3_000_000   # bundled build outputs above this size are not scanned for imports

def specs_of(oid):
    if oid in _SPECS:
        return _SPECS[oid]
    t = blob_text(oid)
    out = []
    if t is not None and len(t) <= MAX_SCAN:
        seen = set()
        for rx in SPEC_RES:
            for m in rx.finditer(t):
                # skip a statement that sits in a line comment
                ls = t.rfind('\n', 0, m.start()) + 1
                pre = t[ls:m.start()]
                if '//' in pre or pre.lstrip().startswith('*'):
                    continue
                if (m.start(), m.group(2)) not in seen:
                    seen.add((m.start(), m.group(2)))
                    out.append(m.group(2))
    _SPECS[oid] = tuple(dict.fromkeys(out))
    return _SPECS[oid]


_NORM = {}
def resolve_spec(frm, spec, has):
    if not (spec.startswith('./') or spec.startswith('../')):
        return None
    k = (frm, spec)
    p = _NORM.get(k)
    if p is None:
        p = posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))
        _NORM[k] = p
    if p in has:
        return p
    for e in EXTS:
        if p + e in has:
            return p + e
    for e in EXTS:
        if f'{p}/index{e}' in has:
            return f'{p}/index{e}'
    return None


@functools.lru_cache(maxsize=64)
def import_edges(rev):
    """[(from_file, to_file)] for every relative import between code files at rev."""
    t = tree_oids(rev)
    out = []
    for f, oid in t.items():
        if not CODE.search(f):
            continue
        for s in specs_of(oid):
            to = resolve_spec(f, s, t)
            if to:
                out.append((f, to))
    return out

# ---------- blanking -------------------------------------------------------------

_TOK = re.compile(r'//|/\*|["\'`]|/')
_REGEX_AFTER = set('(,=:[!&|?{};+-*%<>~^')
_REGEX_WORDS = re.compile(r'(?:^|[^\w$.])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|instanceof|yield|await)$')

def _regex_starts(tail):
    t = tail.rstrip()
    if not t:
        return True
    if t.endswith('++') or t.endswith('--') or re.search(r'[\w$)\]]!$', t):
        return False
    return t[-1] in _REGEX_AFTER or bool(_REGEX_WORDS.search(t))


def blank(text):
    """Return (b, nc): b has comments, string and regex contents blanked; nc has comments blanked
    only. Lengths and line breaks are kept."""
    n = len(text)
    b = []; nc = []
    i = 0
    tail = ''
    sp = lambda s: re.sub(r'[^\n]', ' ', s)
    while i < n:
        m = _TOK.search(text, i)
        if not m:
            b.append(text[i:]); nc.append(text[i:]); break
        if m.start() > i:
            seg = text[i:m.start()]
            b.append(seg); nc.append(seg)
            tail = (tail + seg)[-24:]
        i = m.start(); tok = m.group(0)
        if tok == '/*':
            e = text.find('*/', i + 2); j = n if e < 0 else e + 2
            s = sp(text[i:j]); b.append(s); nc.append(s); i = j; continue
        if tok == '//':
            e = text.find('\n', i); j = n if e < 0 else e
            s = ' ' * (j - i); b.append(s); nc.append(s); i = j; continue
        if tok == '/':
            if _regex_starts(tail):
                j = i + 1; cls = False
                while j < n and text[j] != '\n':
                    c = text[j]
                    if c == '\\': j += 2; continue
                    if c == '[': cls = True
                    elif c == ']': cls = False
                    elif c == '/' and not cls: break
                    j += 1
                if j < n and text[j] == '/':
                    b.append('/' + ' ' * (j - i - 1) + '/'); nc.append(text[i:j + 1])
                    tail = (tail + '/x/')[-24:]; i = j + 1; continue
            b.append('/'); nc.append('/'); tail = (tail + '/')[-24:]; i += 1; continue
        # a string
        c = tok; j = i + 1
        while j < n and text[j] != c:
            if text[j] == '\\': j += 1
            elif c != '`' and text[j] == '\n': break
            j += 1
        j = min(j, n)
        closed = j < n and text[j] == c
        inner = text[i + 1:j]
        b.append(c + sp(inner) + (c if closed else '')); nc.append(text[i:j + 1] if closed else text[i:j])
        tail = (tail + c + 'x' + c)[-24:]
        i = j + 1 if closed else j
    return ''.join(b), ''.join(nc)


_BR = re.compile(r'[(){}\[\]]')
def match_close(b, i):
    """Index of the bracket matching the one at i."""
    depth = 0
    for m in _BR.finditer(b, i):
        c = m.group(0)
        if c in '({[': depth += 1
        else:
            depth -= 1
            if depth == 0:
                return m.start()
    return len(b)


def mask_nested(b, start, end):
    """b[start:end] with the contents of every bracket pair blanked to spaces (brackets kept),
    newlines kept only at depth 0. Same length."""
    out = []; pos = start; depth = 0
    for m in _BR.finditer(b, start, end):
        c = m.group(0); k = m.start()
        seg = b[pos:k]
        out.append(seg if depth == 0 else ' ' * len(seg))
        if c in '({[':
            out.append(c if depth == 0 else ' '); depth += 1
        else:
            depth -= 1
            out.append(c if depth <= 0 else ' ')
            if depth < 0: depth = 0
        pos = k + 1
    seg = b[pos:end]
    out.append(seg if depth == 0 else ' ' * len(seg))
    return ''.join(out)


def _ws(s):
    return re.sub(r'\s+', ' ', s).strip()


def sig_at(nc, b, i):
    e = match_close(b, i)
    return '(' + _ws(nc[i + 1:e]) + ')'


_METH = re.compile(r'(?:(?<=[\s;}])|^)(?=[A-Za-z$_*])((?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?\*?\s*)([A-Za-z$_][\w$]*)\s*\((\s*)\)\s*\{')
_NOT_METHOD = {'constructor', 'if', 'for', 'while', 'switch', 'catch', 'function', 'return'}

def class_methods(nc, b, open_i):
    """Public members of the class whose body opens at open_i: name -> signature."""
    end = match_close(b, open_i)
    body = mask_nested(b, open_i + 1, end)
    # field initialisers are not members: drop from '=' to the end of the statement
    body2 = re.sub(r'(?<![=!<>])=(?![>=])[^;\n]*', lambda m: ' ' * len(m.group(0)), body)
    out = {}
    for m in _METH.finditer(body2):
        name = m.group(2)
        if name.startswith('_') or name in _NOT_METHOD:
            continue
        pre = m.group(1)
        kind = 'static ' if re.search(r'\bstatic\b', pre) else ''
        acc = re.search(r'\b(get|set)\s+$', pre)
        p = open_i + 1 + m.start(3) - 1  # position of '(' in the file
        key = name + '=' if acc and acc.group(1) == 'set' else name
        out[key] = kind + (acc.group(1) if acc else sig_at(nc, b, p))
    return out


_NEXT = re.compile(r'(?:[ \t]*\n)+')
def stmt_end(top, i):
    """End of the statement that starts at i in a depth-0 masked text: the first ';', or a line
    break at depth 0 followed by a line that starts at column 0 and is not a continuation."""
    n = len(top); j = i
    while True:
        k = top.find('\n', j); s = top.find(';', j)
        if s >= 0 and (k < 0 or s < k):
            return s
        if k < 0:
            return n
        m = _NEXT.match(top, k)
        nxt = m.end()
        if nxt >= n:
            return k
        c = top[nxt]
        prev = top[i:k].rstrip()
        if prev and c not in ' \t' and not re.match(r'[.?:+\-*/%&|^<>=,)\]}]', c) \
                and not re.search(r'[-+*/%&|^=<>?:,.(\[{]$', prev):
            return k
        j = k + 1


class Surface:
    """Exports of the files of one module at one commit."""
    def __init__(self, rev, in_module):
        self.rev = rev; self.in_module = in_module; self.tree = tree_oids(rev)
        self.cache = {}

    def has(self, f):
        return f in self.tree and self.in_module(f)

    def of(self, file, seen=None):
        seen = set() if seen is None else seen
        if file in seen:
            return {}
        seen.add(file)
        raw = read_at(self.rev, file)
        if raw is None:
            return {}
        key = (self.tree[file], file)
        b, nc = blank(raw)
        top = mask_nested(b, 0, len(b))
        out = {}; local = {}; imports = {}
        res = lambda spec: resolve_spec(file, spec, _Has(self))
        for m in re.finditer(r'''\bimport\s*\{([^}]*)\}\s*from\s*(['"])([^'"\n]+)\2''', nc):
            to = res(m.group(3))
            if to:
                for part in m.group(1).split(','):
                    a = re.split(r'\s+as\s+', part.strip())
                    if a[0]:
                        imports[(a[1] if len(a) > 1 else a[0]).strip()] = (to, a[0].strip())
        visiting = set()

        def class_surface(name, open_i, ext):
            own = class_methods(nc, b, open_i)
            inh = {}
            if ext and name not in visiting:
                visiting.add(name)
                src = imports.get(ext)
                if not src and ext in local and local[ext].get('members'):
                    inh = local[ext]['members']()
                elif src:
                    base = self.of(src[0], set(seen))
                    inh = {k[len(src[1]) + 1:]: v for k, v in base.items() if k.startswith(src[1] + '.')}
                visiting.discard(name)
            d = dict(inh); d.update(own)
            return d

        for m in re.finditer(r'\b(export\s+(?:default\s+)?)?(async\s+)?function\s*\*?\s*([A-Za-z$_][\w$]*)\s*\(', top):
            local.setdefault(m.group(3), dict(sig='function' + sig_at(nc, b, m.end() - 1), exported=bool(m.group(1))))
        for m in re.finditer(r'\b(export\s+(?:default\s+)?)?class\s+([A-Za-z$_][\w$]*)\s*(?:extends\s+([A-Za-z$_][\w$.]*))?\s*\{', top):
            nm, oi, ext = m.group(2), m.end() - 1, m.group(3)
            local[nm] = dict(sig='class', exported=bool(m.group(1)),
                             members=(lambda nm=nm, oi=oi, ext=ext: class_surface(nm, oi, ext)))
        for m in re.finditer(r'\b(export\s+)?(?:const|let|var)\s+([A-Za-z$_][\w$]*)\s*=\s*', top):
            nm = m.group(2)
            if nm in local:
                continue
            rest = top[m.end():m.end() + 400]
            a = re.match(r'(?:async\s*)?\(\s*\)\s*=>', rest)
            a1 = re.match(r'(?:async\s+)?([A-Za-z$_][\w$]*)\s*=>', rest)
            fx = re.match(r'(?:async\s+)?function\s*\*?\s*[A-Za-z$_\w]*\s*\(', rest)
            if a:
                p = m.end() + rest.index('(')
                local[nm] = dict(sig='function' + sig_at(nc, b, p), exported=bool(m.group(1)))
            elif a1:
                local[nm] = dict(sig=f'function({a1.group(1)})', exported=bool(m.group(1)))
            elif fx:
                p = m.end() + fx.end() - 1
                local[nm] = dict(sig='function' + sig_at(nc, b, p), exported=bool(m.group(1)))
            else:
                e = stmt_end(top, m.end())
                h = hashlib.sha1(_ws(nc[m.end():e]).encode()).hexdigest()[:10]
                local[nm] = dict(sig='value#' + h, exported=bool(m.group(1)))
        for m in re.finditer(r'\bexport\s+(?:const|let|var)\s*([{\[])', top):
            oi = m.end() - 1; ci = match_close(b, oi)
            eq = top.find('=', ci)
            e = stmt_end(top, eq + 1) if eq >= 0 else ci
            h = hashlib.sha1(_ws(nc[eq + 1:e]).encode()).hexdigest()[:10] if eq >= 0 else 'x'
            for part in nc[oi + 1:ci].split(','):
                nm = part.split(':')[-1].split('=')[0].strip()
                if nm:
                    local[nm] = dict(sig='value#' + h, exported=True)

        def put(name, d):
            out[name] = d['sig']
            if d.get('members'):
                for k, v in d['members']().items():
                    out[f'{name}.{k}'] = v
        for name, d in local.items():
            if d['exported']:
                put(name, d)
        md = re.search(r'\bexport\s+default\b', top)
        if md and 'default' not in out:
            e = stmt_end(top, md.end())
            out['default'] = 'value#' + hashlib.sha1(_ws(nc[md.end():e]).encode()).hexdigest()[:10]
        for m in re.finditer(r'''\bexport\s*\{([^}]*)\}\s*(?:from\s*(['"])([^'"\n]+)\2)?''', nc):
            if b[m.start():m.start() + 6] != 'export':
                continue  # inside a string or comment
            spec = m.group(3)
            frm = res(spec) if spec else None
            parts = [re.split(r'\s+as\s+', p.strip()) for p in m.group(1).split(',')]
            if spec and not frm:
                # a re-export from another module: read the name's signature there, so a name that
                # only moved between modules does not read as changed
                ext = resolve_spec(file, spec, self.tree)
                far = Surface(self.rev, lambda f: True).of(ext) if ext and CODE.search(ext) else {}
                for a in parts:
                    if a[0]:
                        src = a[0].strip(); name = (a[1] if len(a) > 1 else a[0]).strip()
                        out[name] = far.get(src, 'external:' + spec)
                        for k, v in far.items():
                            if k.startswith(src + '.'):
                                out[f'{name}.{k[len(src) + 1:]}'] = v
                continue
            there = self.of(frm, seen) if frm else None
            for a in parts:
                if not a[0]:
                    continue
                src = a[0].strip(); name = (a[1] if len(a) > 1 else a[0]).strip()
                if there is not None:
                    out[name] = there.get(src, 'value')
                    for k, v in there.items():
                        if k.startswith(src + '.'):
                            out[f'{name}.{k[len(src) + 1:]}'] = v
                elif src in local:
                    put(name, local[src])
                elif src in imports:
                    to, nm = imports[src]
                    t = self.of(to, set(seen))
                    out[name] = t.get(nm, 'value')
                    for k, v in t.items():
                        if k.startswith(nm + '.'):
                            out[f'{name}.{k[len(nm) + 1:]}'] = v
                else:
                    out[name] = 'value'
        for m in re.finditer(r'''\bexport\s*\*\s*(?:as\s+([A-Za-z$_][\w$]*)\s*)?from\s*(['"])([^'"\n]+)\2''', nc):
            if b[m.start():m.start() + 6] != 'export':
                continue
            frm = res(m.group(3))
            if m.group(1):
                out[m.group(1)] = 'namespace'; continue
            if frm:
                for k, v in self.of(frm, seen).items():
                    if k != 'default' and k not in out:
                        out[k] = v
        return out


class _Has:
    def __init__(self, s): self.s = s
    def __contains__(self, f): return self.s.has(f)


def is_src(e, f):
    return classify(e, f) == 'source'


def entry_files(rev, e, mode='entry'):
    """mode 'entry': provider source code files that a code file outside the module imports, else
    its index files (Process3's rule). mode 'all': every code file of the provider's source."""
    t = tree_oids(rev)
    mine = [f for f in t if CODE.search(f) and is_src(e, f)]
    if mode == 'all' or not mine:
        return sorted(mine)
    ms = set(mine)
    inprov = lambda f: any(under(f, p) for p in e.get('paths', []) + e.get('tests', []))
    found = set()
    for f, to in import_edges(rev):
        if to in ms and not inprov(f):
            found.add(to)
    if found:
        return sorted(found)
    return sorted(f for f in mine if re.search(r'(^|/)index\.[^/]+$', f))


def surface_at(rev, e, mode='entry'):
    s = Surface(rev, lambda f: is_src(e, f))
    out = {}
    files = entry_files(rev, e, mode)
    for f in files:
        if len(read_at(rev, f) or '') > MAX_SCAN:
            continue
        for k, v in s.of(f).items():
            if mode == 'all' and k in out and out[k] != v:
                out[k] = out[k] + ' | ' + v if v not in out[k].split(' | ') else out[k]
            else:
                out[k] = v
    return files, out


def names_diff(a, b):
    """Split into names removed, added, signature changed, value changed (unchanged name)."""
    removed = sorted(k for k in a if k not in b)
    added = sorted(k for k in b if k not in a)
    sigc = []; valc = []
    for k in sorted(a):
        if k in b and a[k] != b[k]:
            va, vb = a[k], b[k]
            if va.startswith('value#') and vb.startswith('value#'):
                valc.append(k)
            else:
                sigc.append(dict(name=k, before=va, after=vb))
    return dict(removed=removed, added=added, changed=sigc, value_changed=valc)

# ---------- requirement files ------------------------------------------------------

ID_LINE = re.compile(r'^\s*(?:[-*]\s+)?(?:`[^`]*`\s*[—-]\s*)?\*\*([A-Z]{1,4}\d[\w.-]*)\*\*')
ANY_R = re.compile(r'\*\*(R[\w.-]+)\*\*')

def req_blocks(text):
    """[(section, id, text)] : an id line and its indented sub-lines; section is the `## ` heading."""
    out = []; cur = None; section = ''
    other = collections.defaultdict(list)
    for l in (text or '').splitlines():
        h = re.match(r'^##\s+(.*\S)\s*$', l)
        if h:
            section = h.group(1); cur = None; continue
        m = ID_LINE.match(l)
        if not m:
            m2 = ANY_R.search(l)
            if m2 and not re.match(r'^[ \t]+\S', l):
                m = m2
        if m and not (cur and re.match(r'^[ \t]+\S', l) and not ID_LINE.match(l)):
            cur = [section, m.group(1), l.strip()]; out.append(cur); continue
        if cur and re.match(r'^[ \t]+\S', l):
            cur[2] += '\n' + l.strip(); continue
        if cur and not l.strip():
            continue
        cur = None
        if l.strip():
            other[section].append(l.strip())
    return out, other


NOT_MET = re.compile(r'\*\(not yet met\b', re.I)
RETIRED = re.compile(r'\*\(retired\b', re.I)

def req_diff(before, after):
    ba, oa = req_blocks(before); bb, ob = req_blocks(after)
    pub = lambda s: s.lower().startswith('public')
    def table(bl):
        d = {}
        for sec, i, t in bl:
            d[(pub(sec), i)] = (d[(pub(sec), i)] + '\n' + t) if (pub(sec), i) in d else t
        return d
    a, b = table(ba), table(bb)
    res = dict(public_added=[], public_removed=[], public_changed=[], public_newly_met=[],
               public_retired=[], public_marked_unmet=[], private_ids=[], found_ids=[],
               public_other_text=False, other_text=False)
    for (p, i) in sorted(set(a) | set(b)):
        x, y = a.get((p, i)), b.get((p, i))
        if x == y:
            continue
        is_r = i.startswith('R')
        if p and is_r:
            if x is None: res['public_added'].append(i)
            elif y is None: res['public_removed'].append(i)
            else:
                if NOT_MET.search(x) and not NOT_MET.search(y): res['public_newly_met'].append(i)
                elif RETIRED.search(y) and not RETIRED.search(x): res['public_retired'].append(i)
                elif NOT_MET.search(y) and not NOT_MET.search(x): res['public_marked_unmet'].append(i)
                else: res['public_changed'].append(i)
        elif i.startswith('F'):
            res['found_ids'].append(i)
        else:
            res['private_ids'].append(('pub:' if p else '') + i)
    for sec in set(oa) | set(ob):
        if oa.get(sec) != ob.get(sec):
            if pub(sec): res['public_other_text'] = True
            else: res['other_text'] = True
    res['public_ids'] = sorted(set(res['public_added'] + res['public_removed'] + res['public_changed']
                                   + res['public_newly_met'] + res['public_retired'] + res['public_marked_unmet']))
    return res


def public_ids(text):
    bl, _ = req_blocks(text)
    return {i for sec, i, t in bl if sec.lower().startswith('public') and i.startswith('R')}

# ---------- tests --------------------------------------------------------------------

TEST_CALL = re.compile(r'\b(?:test|it|describe)(?:\.(?:only|skip|todo))?\s*\(\s*(["\'`])')
RID = re.compile(r'(?<![\w`.-])R(\d+[a-z]?)\b')

def test_blocks(text):
    """title -> normalised body text of each test()/it()/describe() call with a literal title."""
    if text is None:
        return {}
    b, nc = blank(text)
    out = {}
    for m in TEST_CALL.finditer(b):
        q = m.group(1); s = m.end()
        e = b.find(q, s)
        if e < 0:
            continue
        title = text[s:e]
        op = b.rfind('(', m.start(), m.end())
        cl = match_close(b, op)
        body = _ws(nc[op:cl + 1])
        k = title
        n = 1
        while k in out:
            n += 1; k = f'{title} #{n}'
        out[k] = hashlib.sha1(body.encode()).hexdigest()[:12]
    return out


def test_diff(before, after):
    a, b = test_blocks(before), test_blocks(after)
    ch = sorted(t for t in set(a) | set(b) if a.get(t) != b.get(t))
    ids = sorted({'R' + x for t in ch for x in RID.findall(t)}, key=lambda s: (len(s), s))
    return ch, ids

# ---------- the whole change -----------------------------------------------------------

def parts(p1, m, mid, mode='entry', want_names=True):
    """All four parts for module `mid` between p1 and m. The module entry is read at p1 (at m when
    the module is new)."""
    e = entry(p1, mid) or entry(m, mid)
    if e is None:
        return None
    em = entry(m, mid) or e
    files = diff_names(p1, m)
    kinds = collections.defaultdict(list)
    for s, f in files:
        k = classify(e, f) or classify(em, f)
        if k:
            kinds[k].append((s, f))
    out = dict(module=mid, source=[f for s, f in kinds['source']], tests=[f for s, f in kinds['test']],
               req=bool(kinds['req']), docs=[f for s, f in kinds['doc']])
    # part 1
    nd = dict(removed=[], added=[], changed=[], value_changed=[])
    code_changed = [f for f in out['source'] if CODE.search(f)]
    if want_names and code_changed:
        fa, sa = surface_at(p1, e, mode)
        fb, sb = surface_at(m, em, mode)
        nd = names_diff(sa, sb)
        out['entry_files'] = sorted(set(fa) | set(fb))
    out['names'] = nd
    # part 2
    rq = None
    if out['req']:
        rq = req_diff(show(p1, req_file(mid)) or '', show(m, req_file(mid)) or '')
    out['reqs'] = rq
    # part 3
    tids = []; ttitles = []; tfiles_noid = []
    pub = public_ids(show(p1, req_file(mid)) or '') | public_ids(show(m, req_file(mid)) or '')
    for s, f in kinds['test']:
        if not CODE.search(f):
            tfiles_noid.append(f); continue
        ch, ids = test_diff(read_at(p1, f), read_at(m, f))
        ttitles += ch
        if ids:
            tids += ids
        else:
            tfiles_noid.append(f)
    out['test_ids'] = sorted(set(tids), key=lambda s: (len(s), s))
    out['test_ids_public'] = [i for i in out['test_ids'] if i in pub]
    out['test_titles_changed'] = len(ttitles)
    out['test_files_no_id'] = tfiles_noid
    # part 4
    out['noncode'] = [f for f in out['source'] if not CODE.search(f)]
    return out


def has_part(p, value_hash=True, noncode=True, tests=True):
    n = p['names']
    if n['removed'] or n['added'] or n['changed'] or (value_hash and n['value_changed']):
        return True
    if p['reqs'] and p['reqs']['public_ids']:
        return True
    if tests and p['test_ids']:
        return True
    if noncode and p['noncode']:
        return True
    return False
