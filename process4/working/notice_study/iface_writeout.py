"""For each of the 178 recorded changes, write out the provider's interface with TypeScript's reader
(plain JavaScript in, declaration text out) just before and just after the change, and compare.

Read-only against the product clone: only `git show`, `git ls-tree`, `git diff`, `git archive`.
Nothing is added to the code: this is what the tool sees with no structured comments beyond those there.

Run: python3 -I iface_writeout.py <path to tsc> <scratch dir>
Writes data/iface_writeout.json.
"""
import sys, os, re, json, subprocess, shutil, time, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/user/repos/civicsmith-copy'
APPENDIX = os.path.join(HERE, '..', 'replay', 'appendix_commits.md')
TSC, SCRATCH = sys.argv[1], sys.argv[2]
TIP = 'origin/tranche'


def git(*a):
    return subprocess.run(['git', '-C', REPO, *a], capture_output=True).stdout.decode('utf8', 'replace')


def changes():
    out = []
    for line in open(APPENDIX):
        m = re.match(r'\| `([^`:]+):(\d+)` \| (\w+) \| `([0-9a-f]{40})` \| `([0-9a-f]{40})` \|', line)
        if m:
            out.append({'change': f'{m[1]}:{m[2]}', 'module': m[1], 'merge': m[4], 'first': m[5]})
    return out


def module_paths(commit, module):
    try:
        d = json.loads(git('show', f'{commit}:build/modules.json'))
    except Exception:
        return None
    for m in d.get('modules', []):
        if m.get('id') == module:
            return m.get('paths') or []
    return None


def source_files(commit, paths):
    if not paths:
        return []
    names = git('ls-tree', '-r', '--name-only', commit, '--', *paths).split('\n')
    return sorted(n for n in names if n.endswith('.mjs') and '/test/' not in n and not n.endswith('.test.mjs'))


def writeout(commit, paths, tag):
    """Return {source file: declaration text} for the module's source at this commit."""
    files = source_files(commit, paths)
    if not files:
        return {}
    work = os.path.join(SCRATCH, tag)
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(os.path.join(work, 'src'))
    ar = subprocess.Popen(['git', '-C', REPO, 'archive', commit, '--', *files], stdout=subprocess.PIPE)
    subprocess.run(['tar', '-x', '-C', os.path.join(work, 'src')], stdin=ar.stdout, check=True)
    ar.wait()
    cfg = {'compilerOptions': {'allowJs': True, 'declaration': True, 'emitDeclarationOnly': True,
                               'skipLibCheck': True, 'noResolve': True, 'target': 'es2022',
                               'module': 'nodenext', 'rootDir': 'src', 'outDir': 'out'},
           'files': ['src/' + f for f in files]}
    json.dump(cfg, open(os.path.join(work, 'tsconfig.json'), 'w'))
    subprocess.run([TSC, '-p', work], capture_output=True)
    res = {}
    for f in files:
        p = os.path.join(work, 'out', f[:-4] + '.d.mts')
        res[f] = open(p).read() if os.path.exists(p) else None
    shutil.rmtree(work, ignore_errors=True)
    return res


def strip_comments(text):
    """The declaration without its comment blocks: names, fields and kinds only."""
    if text is None:
        return None
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return '\n'.join(l.rstrip() for l in text.split('\n') if l.strip())


def one(i, c):
    t0 = time.time()
    paths = module_paths(c['merge'], c['module']) or module_paths(c['first'], c['module'])
    row = dict(c)
    if paths is None:
        row['error'] = 'module not in list'
        return row
    a = writeout(c['first'], paths, f'{i}a')
    b = writeout(c['merge'], paths, f'{i}b')
    src_changed = [n for n in git('diff', '--name-only', c['first'], c['merge'], '--', *paths).split('\n')
                   if n.endswith('.mjs') and '/test/' not in n and not n.endswith('.test.mjs')]
    differ, differ_shape = [], []
    for f in sorted(set(a) | set(b)):
        if a.get(f) != b.get(f):
            differ.append(f)
        if strip_comments(a.get(f)) != strip_comments(b.get(f)):
            differ_shape.append(f)
    removed = added = 0
    for f in differ_shape:
        la = set((strip_comments(a.get(f)) or '').split('\n')); lb = set((strip_comments(b.get(f)) or '').split('\n'))
        removed += len(la - lb); added += len(lb - la)
    row.update(lines_removed_or_altered=removed, lines_added=added)
    row.update(paths=paths, files_before=len(a), files_after=len(b), source_changed=src_changed,
               writeout_differs=differ, writeout_differs_without_comments=differ_shape,
               failed=[f for f, t in b.items() if t is None], seconds=round(time.time() - t0, 1))
    return row


def tip_any():
    """At the latest code: how often the write-out says 'any' where it states a kind."""
    d = json.loads(git('show', f'{TIP}:build/modules.json'))
    tot = {'modules': 0, 'files': 0, 'kinds_stated': 0, 'kinds_any': 0, 'params': 0, 'params_any': 0}

    def mod(j, m):
        return writeout(TIP, m.get('paths') or [], f'tip{j}')
    with cf.ThreadPoolExecutor(6) as ex:
        for res in ex.map(lambda jm: mod(*jm), enumerate(d['modules'])):
            if not res:
                continue
            tot['modules'] += 1
            for f, t in res.items():
                if t is None:
                    continue
                tot['files'] += 1
                t = strip_comments(t)
                tot['kinds_stated'] += len(re.findall(r'[\w\]\}\)?]: ', t))
                tot['kinds_any'] += len(re.findall(r': any\b', t))
                for sig in re.findall(r'^export (?:declare )?function \w+\((.*)$', t, flags=re.M):
                    ps = re.findall(r'(\w+)\??: (\w+)', sig)
                    tot['params'] += len(ps)
                    tot['params_any'] += sum(1 for _, k in ps if k == 'any')
    return tot


if __name__ == '__main__':
    os.makedirs(SCRATCH, exist_ok=True)
    cs = changes()
    with cf.ThreadPoolExecutor(6) as ex:
        rows = list(ex.map(lambda ic: one(*ic), enumerate(cs)))
    out = {'changes': rows}
    if '--no-tip' not in sys.argv:
        out['tip'] = tip_any()
    else:
        try:
            out['tip'] = json.load(open(os.path.join(HERE, 'data', 'iface_writeout.json')))['tip']
        except Exception:
            pass
    json.dump(out, open(os.path.join(HERE, 'data', 'iface_writeout.json'), 'w'), indent=1)
    ok = [r for r in rows if 'error' not in r]
    print('changes', len(rows), 'resolved', len(ok))
    print('source file changed', sum(1 for r in ok if r['source_changed']))
    print('write-out differs (with comment text)', sum(1 for r in ok if r['writeout_differs']))
    print('write-out differs (names, fields, kinds only)', sum(1 for r in ok if r['writeout_differs_without_comments']))
    print('files the tool could not write out', sum(len(r['failed']) for r in ok))
    print('tip', out.get('tip'))
