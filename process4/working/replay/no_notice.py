"""J4 c(2): merges that changed a module's interface (four parts) but raised no notice.

Universe: every merge commit Process3 made of a pull request, found with `git log --all --merges`:
  "Merge job PR <n>"   a job merged into the tranche
  "Merge layer PR <n>" a job landed on a layer branch (layer flow, from 6 Nov)
  "Merge PR <n>: <branch> into tranche" and "Merge pull request #<n>" on the first-parent line of
  origin/tranche since Process3's set-up commit: non-job merges (bob/, p3/, lane/, found/ and the
  owner's own web commits).
For each merge and each module with a changed file, the four parts are derived between the first
parent and the merge.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
import glob, time

notices, tri, owed, ans, wd = load_notices()
SETUP = '8a80914dae'   # "Process3 setup on the tranche (#2)", 1 Nov
reach = set(git('rev-list', TRANCHE).split())
first_notice_at = min(n['at'] for n in notices.values())

lands = {}
for f in glob.glob(SCRATCH + '/layerflow/*/land/*.json'):
    d = json.load(open(f)); lands[(d['module'], d['pr'])] = d
resched = collections.Counter()
for f in glob.glob(SCRATCH + '/layerflow/*/reschedule/*.json'):
    d = json.load(open(f)); resched[(d['provider'], d.get('provider_pr'))] += 1

merges = []
for line in open(os.path.join(DATA, 'merges_all.txt')):
    h, rest = line.rstrip('\n').split(' ', 1)
    parents, ct, subj = rest.split('|', 2)
    ps = parents.split()
    m = re.match(r'Merge (job|layer) PR\s*(\d+)\b', subj)
    if m:
        body = git('log', '-1', '--format=%b', h)
        jm = re.search(r'^job:\s*(\S+)', body, re.M)
        merges.append(dict(h=h, p1=ps[0], pr=int(m.group(2)), kind=m.group(1), module=jm.group(1) if jm else None, ct=int(ct), subj=subj))
fp = []
for line in open(os.path.join(DATA, 'tranche_first_parent.txt')):
    h, rest = line.rstrip('\n').split(' ', 1)
    parents, ct, subj = rest.split('|', 2)
    fp.append((h, parents.split(), int(ct), subj))
setup_full = git('rev-parse', SETUP).strip()
idx = [i for i, x in enumerate(fp) if x[0] == setup_full][0]
for h, ps, ct, subj in fp[:idx]:
    if len(ps) < 2:
        continue
    m = re.match(r'Merge PR (\d+): (\S+)', subj) or re.match(r'Merge pull request #(\d+) from (\S+)', subj)
    if m:
        merges.append(dict(h=h, p1=ps[0], pr=int(m.group(1)), kind='other', module=None, ct=ct, subj=subj,
                           branch=m.group(2)))

rows = []
t0 = time.time()
for i, mg in enumerate(merges):
    P1, M = mg['p1'], mg['h']
    files = diff_names(P1, M)
    own1 = owner_map(P1); own2 = owner_map(M)
    mods = set()
    for s, f in files:
        for own in (own1, own2):
            a, k = own(f)
            if a:
                mods.add(a)
        m = re.match(r'build/requirements/([\w.-]+)\.md$', f)
        if m and (entry(P1, m.group(1)) or entry(M, m.group(1))):
            mods.add(m.group(1))
    if mg['module']:
        mods.add(mg['module'])
    for mid in sorted(mods):
        p = parts(P1, M, mid)
        if p is None:
            continue
        n = p['names']; rq = p['reqs'] or {}
        users = declared_users(M, mid)
        key = f"{mid}:{mg['pr']}"
        own_job = mg['module'] == mid
        land = lands.get((mid, mg['pr'])) if own_job else None
        rows.append(dict(
            merge=M, p1=P1, pr=mg['pr'], kind=mg['kind'], branch=mg.get('branch'), module=mid, own_job=own_job,
            at=mg['ct'], reachable=M in reach, notice=(key in notices) if own_job else False,
            withdrawn=key in wd, users=len(users),
            source=len(p['source']), tests=len(p['tests']), req=p['req'],
            names_removed=len(n['removed']), names_changed=len(n['changed']), names_added=len(n['added']),
            value_changed=len(n['value_changed']), public_ids=rq.get('public_ids', []),
            test_ids=p['test_ids_public'], noncode=p['noncode'],
            part_names=bool(n['removed'] or n['changed'] or n['added'] or n['value_changed']),
            part_req=bool(rq.get('public_ids')), part_tests=bool(p['test_ids']), part_noncode=bool(p['noncode']),
            land=bool(land), land_changed=(land or {}).get('interface', {}).get('changed'),
            land_class=(land or {}).get('interface', {}).get('class'),
            rescheduled=resched.get((mid, mg['pr']), 0) if own_job else 0,
        ))
    if i % 100 == 0:
        print(i, len(merges), round(time.time() - t0), 's', flush=True)
jdump(rows, 'no_notice_rows.json')
jdump(dict(first_notice_at=first_notice_at, merges=len(merges)), 'no_notice_meta.json')
print('done', len(rows))
