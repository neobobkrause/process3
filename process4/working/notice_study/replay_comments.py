"""Replay the eight recorded changes to ai-runs against interface comments that a helper wrote for the
module as it stood before the first of them (trial_ai_runs/blocks/, comment text only, each block keyed
to the line of code it sits above).

For each change the same comments are placed on the code just before and just after the change, with
nobody updating them. Then, on each side: (1) the tool's complaints about the module's files, (2) the
interface as the tool writes it out. What is new after the change is what the change did.

Read-only against the product clone (`git archive` into scratch only).
Run: python3 -I replay_comments.py <path to tsc> <scratch dir>     Writes data/replay_comments.json.
"""
import sys, os, re, json, glob, subprocess, shutil, collections
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/user/repos/civicsmith-copy'
TSC, SCRATCH = sys.argv[1], sys.argv[2]
MOD = 'bio-plane/src/ai-runs/'
OPTS = ['--allowJs', '--skipLibCheck', '--target', 'es2022', '--module', 'nodenext']


def parse(path):
    blocks, cur = [], None
    for l in open(path).read().split('\n'):
        if l.startswith('### ANCHOR: '):
            cur = [l[len('### ANCHOR: '):], []]; blocks.append(cur)
        elif cur is not None:
            cur[1].append(l)
    for b in blocks:
        while b[1] and b[1][-1] == '':
            b[1].pop()
    return blocks

BLOCKS = {'index.mjs': [b for f in sorted(glob.glob(os.path.join(HERE, 'trial_ai_runs/blocks/0*.txt'))) for b in parse(f)],
          'schema.mjs': parse(os.path.join(HERE, 'trial_ai_runs/blocks/schema.txt'))}


def place(path, blocks):
    """Insert each block above the one line that starts with its anchor. Return anchors not placed."""
    lines = open(path).read().split('\n'); ins = {}; lost = []
    for anchor, body in blocks:
        hits = [i for i, l in enumerate(lines) if l.startswith(anchor)]
        if len(hits) != 1:
            lost.append(anchor.strip()[:70]); continue
        ins.setdefault(hits[0], []).extend(body)
    out = []
    for i, l in enumerate(lines):
        if i in ins:
            out.extend(ins[i])
        out.append(l)
    open(path, 'w').write('\n'.join(out))
    return lost


def strip_comments(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return [l.rstrip() for l in text.split('\n') if l.strip()]


def side(commit, tag, comments=True):
    work = os.path.join(SCRATCH, tag); shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
    ar = subprocess.Popen(['git', '-C', REPO, 'archive', commit, '--', 'bio-plane/src'], stdout=subprocess.PIPE)
    subprocess.run(['tar', '-x', '-C', work], stdin=ar.stdout, check=True); ar.wait()
    files = sorted(os.path.relpath(p, work) for p in glob.glob(os.path.join(work, MOD, '**/*.mjs'), recursive=True))
    lost = []
    if comments:
        for name, blocks in BLOCKS.items():
            p = os.path.join(work, MOD, name)
            if os.path.exists(p):
                lost += place(p, blocks)
            else:
                lost += [f'(file {name} is gone)']
    chk = subprocess.run([TSC, *OPTS, '--checkJs', '--noEmit', *files], cwd=work, capture_output=True).stdout.decode()
    complaints = collections.Counter(re.sub(r'\(\d+,\d+\)', '', l) for l in chk.split('\n')
                                     if l.startswith(MOD) and 'error TS' in l)
    subprocess.run([TSC, *OPTS, '--declaration', '--emitDeclarationOnly', '--outDir', 'out', *files], cwd=work, capture_output=True)
    listing, bounds = [], []
    for f in files:
        p = os.path.join(work, 'out', os.path.relpath(f, 'bio-plane/src')[:-4] + '.d.mts')
        if os.path.exists(p):
            t = open(p).read()
            listing += [f'{os.path.basename(f)}: {l}' for l in strip_comments(t)]
            bounds += re.findall(r'\[bound [^\]]*\]', t)
    shutil.rmtree(work, ignore_errors=True)
    return {'files': files, 'lost': lost, 'complaints': complaints, 'listing': listing, 'bounds': bounds}


def changes():
    out = []
    for line in open(os.path.join(HERE, '..', 'replay', 'appendix_commits.md')):
        m = re.match(r'\| `(ai-runs:\d+)` \| (\w+) \| `([0-9a-f]{40})` \| `([0-9a-f]{40})` \| (\d+) \| \d+ \| (\d+) \|', line)
        if m:
            out.append({'change': m[1], 'merge': m[3], 'first': m[4], 'told': int(m[5]), 'affected': int(m[6])})
    return out


def when(c):
    return int(subprocess.run(['git', '-C', REPO, 'show', '-s', '--format=%ct', c['merge']], capture_output=True).stdout)

rows = []
for c in sorted(changes(), key=when):
    r = dict(c)
    for comments in (True, False):
        a = side(c['first'], 'a', comments); b = side(c['merge'], 'b', comments)
        new = b['complaints'] - a['complaints']; gone = a['complaints'] - b['complaints']
        la, lb = collections.Counter(a['listing']), collections.Counter(b['listing'])
        key = 'with_comments' if comments else 'no_comments'
        r[key] = {'anchors_lost_before': len(a['lost']), 'anchors_lost_after': len(b['lost']),
                  'anchors_lost_by_change': sorted(set(b['lost']) - set(a['lost'])),
                  'complaints_before': sum(a['complaints'].values()), 'complaints_after': sum(b['complaints'].values()),
                  'new_complaints': sorted(new.elements()), 'gone_complaints': len(list(gone.elements())),
                  'listing_lines_removed_or_altered': sorted((la - lb).elements()),
                  'listing_lines_added': sorted((lb - la).elements()),
                  'files_before': a['files'], 'files_after': b['files']}
    rows.append(r)
    w, n = r['with_comments'], r['no_comments']
    print(c['change'], '| told', c['told'], 'affected', c['affected'],
          '| comments: new complaints', len(w['new_complaints']), 'listing -', len(w['listing_lines_removed_or_altered']),
          '+', len(w['listing_lines_added']), 'anchors lost by change', len(w['anchors_lost_by_change']),
          '(lost before', w['anchors_lost_before'], ')',
          '| no comments: new complaints', len(n['new_complaints']), 'listing -', len(n['listing_lines_removed_or_altered']),
          '+', len(n['listing_lines_added']), flush=True)
json.dump(rows, open(os.path.join(HERE, 'data', 'replay_comments.json'), 'w'), indent=1)
