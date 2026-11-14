"""ai-runs pull request 96: with each user module's comments saying what it was handed (written by a helper
that did not know the change), run the reader over the users' source and tests against ai-runs before the
change and after it (comments brought in line by a second helper). Complaints that are new after the change,
in a user's own files, are the reader pointing at that user.

Run: python3 -I users_after_change.py <tsc> <dir holding before/ and after/ trees>   Writes data/users_after_change.json
"""
import sys, os, re, json, glob, subprocess, collections, csv, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
TSC, BASE = sys.argv[1], sys.argv[2]
REPO = '/home/user/repos/civicsmith-copy'; FP = '2d52c515fae9c04c6f8ff5164660be226edb491a'
mods = {m['id']: m for m in json.loads(subprocess.run(['git', '-C', REPO, 'show', FP + ':build/modules.json'], capture_output=True).stdout)['modules']}
told = sorted(k.split('|')[1] for k in json.load(open(os.path.join(HERE, 'data/srcimp.json'))) if k.startswith('ai-runs:96|'))
verdict = {x['user']: (x['outcome (judged)'], x['broken in']) for x in csv.DictReader(open(os.path.join(HERE, 'data/classified241.tsv')), delimiter='\t') if x['change'] == 'ai-runs:96'}

def files_of(tree, paths):
    out = []
    for p in paths:
        full = os.path.join(tree, p)
        if os.path.isdir(full):
            out += [os.path.relpath(f, tree) for f in glob.glob(os.path.join(full, '**/*.mjs'), recursive=True)]
        elif full.endswith('.mjs') and os.path.exists(full):
            out.append(p)
    return sorted(f for f in out if '/node_modules/' not in f)

owner = {}
for u in told:
    m = mods[u]
    for kind, key in (('source', 'paths'), ('tests', 'tests')):
        for f in files_of(os.path.join(BASE, 'before'), m.get(key) or []):
            k = 'tests' if (kind == 'tests' or '/test/' in f or f.endswith('.test.mjs')) else 'source'
            owner[f] = (u, k)
files = sorted(owner)

TEXT = {}

def run(side):
    r = subprocess.run([TSC, '--allowJs', '--checkJs', '--noEmit', '--skipLibCheck', '--target', 'es2022', '--module', 'nodenext', *files],
                       cwd=os.path.join(BASE, side), capture_output=True).stdout.decode()
    c = collections.Counter()
    for l in r.split('\n'):
        # the users' files are the same on both sides, so a complaint is keyed by its place and its code;
        # the message text is kept beside it (it names kinds whose wording differs between the sides)
        m = re.match(r'([^(]+)\((\d+),(\d+)\): error (TS\d+): (.*)$', l)
        if m and m[1] in owner:
            c[(m[1], f'line {m[2]} {m[4]}')] += 1
            TEXT[(m[1], f'line {m[2]} {m[4]}')] = m[5][:300]
    return c

with cf.ThreadPoolExecutor(2) as ex:
    before, after = ex.map(run, ['before', 'after'])
new, gone = after - before, before - after
rows = {}
for u in told:
    rows[u] = {'verdict': verdict.get(u, ('not affected or not judged', '')), 'has_code': bool(mods[u].get('paths')),
               'files': sum(1 for f in files if owner[f][0] == u), 'new_source': [], 'new_tests': [], 'gone': 0}
for (f, msg), n in new.items():
    u, k = owner[f]; rows[u]['new_' + k] += [f'{f}: {msg}: {TEXT[(f, msg)]}'] * n
for (f, msg), n in gone.items():
    rows[owner[f][0]]['gone'] += n
json.dump(rows, open(os.path.join(HERE, 'data', 'users_after_change.json'), 'w'), indent=1)
print('files read', len(files), '| complaints before', sum(before.values()), 'after', sum(after.values()))
for u, r in rows.items():
    print(f"{u:22} verdict={r['verdict'][0]:28.28} {r['verdict'][1]:7} new in source {len(r['new_source']):3}  new in tests {len(r['new_tests']):3}  gone {r['gone']:3}  files {r['files']}")
