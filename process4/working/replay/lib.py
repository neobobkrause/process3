"""Shared helpers for the J4/J5 offline replay. Read-only against the local clone.

Run every script with `python3 -I`. Nothing here writes to the repository: only
`git cat-file`, `git diff`, `git log`, `git ls-tree`, `git archive` are used.
"""
import sys, os, re, json, subprocess, collections, functools, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # -I drops the script dir; lib lives next to the scripts
REPO = '/home/user/repos/civicsmith-copy'
SCRATCH = os.path.join(HERE, 'scratch')
DATA = os.path.join(HERE, 'data')
STATE = 'origin/process-state'
TRANCHE = 'origin/tranche'


def git(*a, check=False):
    r = subprocess.run(['git', '-C', REPO, *a], capture_output=True)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr.decode('utf8', 'replace'))
    return r.stdout.decode('utf8', 'replace')


class Batch:
    """One long-lived `git cat-file --batch` process."""
    def __init__(self):
        self.p = subprocess.Popen(['git', '-C', REPO, 'cat-file', '--batch'],
                                  stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        self.cache = {}

    def get(self, spec):
        if spec in self.cache:
            return self.cache[spec]
        self.p.stdin.write(spec.encode() + b'\n'); self.p.stdin.flush()
        head = self.p.stdout.readline().decode().rstrip('\n')
        if head.endswith('missing') or ' ' not in head:
            out = None
        else:
            parts = head.split(' ')
            size = int(parts[-1])
            data = self.p.stdout.read(size); self.p.stdout.read(1)
            out = data if parts[-2] == 'blob' else None
        self.cache[spec] = out
        return out


_B = None
def show_bytes(rev, path):
    global _B
    if _B is None:
        _B = Batch()
    return _B.get(f'{rev}:{path}')


def show(rev, path):
    b = show_bytes(rev, path)
    return None if b is None else b.decode('utf8', 'replace')


@functools.lru_cache(maxsize=None)
def tree(rev):
    """All file paths at rev."""
    return tuple(git('ls-tree', '-r', '--name-only', rev).splitlines())


@functools.lru_cache(maxsize=None)
def diff_names(a, b):
    """[(status, path)] with renames off, a..b tree diff."""
    out = []
    for l in git('diff', '--name-status', '--no-renames', a, b).splitlines():
        s, p = l.split('\t', 1)
        out.append((s, p))
    return tuple(out)


@functools.lru_cache(maxsize=None)
def modules_at(rev):
    t = show(rev, 'build/modules.json')
    return json.loads(t)['modules'] if t else []


def under(f, p):
    return f == p or (p.endswith('/') and f.startswith(p)) or f.startswith(p.rstrip('/') + '/')


def declared_users(rev, provider):
    return sorted(m['id'] for m in modules_at(rev)
                  if m['id'] != provider and provider in m.get('uses', []))


def entry(rev, mid):
    for i, m in enumerate(modules_at(rev)):
        if m['id'] == mid:
            return dict(m, pos=i)
    return None


def is_doc(f):
    return bool(re.search(r'\.(md|markdown)$', f, re.I) or re.search(r'(^|/)docs/', f))


def req_file(mid):
    return f'build/requirements/{mid}.md'


def classify(e, f):
    """source | test | req | None for file f against module entry e (Process3's isSource rule)."""
    if f == req_file(e['id']):
        return 'req'
    if any(under(f, p) for p in e.get('tests', [])):
        return 'test'
    if any(under(f, p) for p in e.get('paths', [])):
        if is_doc(f):
            return 'doc'
        return 'source'
    return None


def owner_map(rev):
    """Return function file -> (module id, kind) by longest matching path at rev.
    kind is 'test' when the longest match is a tests path, else 'source'."""
    pre = []
    for m in modules_at(rev):
        for p in m.get('paths', []):
            pre.append((p, m['id'], 'source'))
        for p in m.get('tests', []):
            pre.append((p, m['id'], 'test'))
    pre.sort(key=lambda x: -len(x[0]))
    cache = {}
    def own(f):
        if f in cache:
            return cache[f]
        r = (None, None)
        for p, mid, k in pre:
            if under(f, p):
                r = (mid, k); break
        cache[f] = r
        return r
    return own


# ---- notices -----------------------------------------------------------------

def export_records():
    """Export notices/ and layerflow/ from the state branch into scratch (idempotent)."""
    for d in ('notices', 'layerflow'):
        if not os.path.isdir(os.path.join(SCRATCH, d)):
            os.makedirs(SCRATCH, exist_ok=True)
            p1 = subprocess.Popen(['git', '-C', REPO, 'archive', STATE, d], stdout=subprocess.PIPE)
            subprocess.run(['tar', '-x', '-C', SCRATCH], stdin=p1.stdout, check=True)


def load_notices():
    export_records()
    nd = os.path.join(SCRATCH, 'notices')
    notices = {}
    for f in sorted(os.listdir(nd)):
        if f.endswith('.json'):
            d = json.load(open(os.path.join(nd, f)))
            notices[d['key']] = d
    tri = collections.defaultdict(list)
    for f in sorted(os.listdir(os.path.join(nd, 'triage'))):
        if f.endswith('.json'):
            d = json.load(open(os.path.join(nd, 'triage', f)))
            tri[d['key']].append(d)
    owed = collections.defaultdict(list)
    od = os.path.join(nd, 'triage', 'owed')
    for f in sorted(os.listdir(od)):
        d = json.load(open(os.path.join(od, f)))
        owed[d['key']].append(d)
    ans = collections.defaultdict(list)
    for f in sorted(os.listdir(os.path.join(nd, 'answered'))):
        if f.endswith('.json'):
            d = json.load(open(os.path.join(nd, 'answered', f)))
            ans[d['key']].append(d)
    wd = {}
    for f in sorted(os.listdir(os.path.join(nd, 'withdrawn'))):
        d = json.load(open(os.path.join(nd, 'withdrawn', f)))
        wd[d['key']] = d
    return notices, tri, owed, ans, wd


def load_merges():
    """PR number -> [(merge, [parents], subject, kind)] from every ref (`git log --all --merges`)."""
    p = os.path.join(DATA, 'merges_all.txt')
    if not os.path.exists(p):
        os.makedirs(DATA, exist_ok=True)
        open(p, 'w').write(git('log', '--all', '--merges', '--format=%H %P|%ct|%s'))
    merges = collections.defaultdict(list)
    for line in open(p):
        h, rest = line.rstrip('\n').split(' ', 1)
        parents, ct, subj = rest.split('|', 2)
        m = re.match(r'Merge (job|layer) PR\s*(\d+)\b', subj)
        if m:
            merges[int(m.group(2))].append((h, parents.split(), subj, m.group(1), int(ct)))
    return merges


def resolve(notices, merges):
    """key -> dict(merge, p1, p2, kind). Raises if a notice does not resolve to exactly one merge."""
    out = {}
    for key, n in notices.items():
        c = merges.get(n['pr'], [])
        if len(c) != 1:
            raise RuntimeError(f'{key}: {len(c)} merge commits')
        h, ps, subj, kind, ct = c[0]
        out[key] = dict(merge=h, p1=ps[0], p2=ps[1], kind=kind, ct=ct)
    return out


def jdump(obj, name):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, name), 'w') as f:
        json.dump(obj, f, indent=1, sort_keys=True)


def jload(name):
    return json.load(open(os.path.join(DATA, name)))
