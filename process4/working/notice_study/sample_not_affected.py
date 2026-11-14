"""Seeded random sample of the 2,101 "not affected" verdicts. Seed 20261114, 120 drawn.
Writes data/sample_not_affected.json (key, user, evidence) and scratch/sample_na.txt."""
import sys, os, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nlib import *
N, T, O, A, W = notices()
allna = sorted((k, t['user'], t['evidence']) for k in T for t in T[k] if t['verdict'] == 'not affected')
assert len(allna) == 2101
random.seed(20261114)
smp = random.sample(allna, 120)
dump([dict(i=i, key=k, user=u, evidence=e) for i, (k, u, e) in enumerate(smp)], 'sample_not_affected.json')
open(os.path.join(SCRATCH, 'sample_na.txt'), 'w').write('\n'.join(f'[{i}] {u}<{k}: {e[:330]}' for i, (k, u, e) in enumerate(smp)))
print(len(smp))
