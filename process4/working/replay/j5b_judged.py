"""J5 b, judged form: the reader's judgment on the 67 affected verdicts the mechanical form could
not decide. The reader (this worker) read every evidence sentence and the text of the named parts
(scratch/parttext_<key>.txt, written by j5b_support.py), searched that text for the thing the
evidence says changed, and decided. All 67 were read; no sample, no seed.
Classes: led / led_noncode_only (only the diff of a named non-code file states it) /
led_wide (stated, but the named parts are 45 or more ids, most of the module) /
weak (a named part points at the area, its text does not state the changed thing) / not_led."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
J = jload('j5b_rows.json')
SPECIAL = {
 ('agent-worker:364', 'agent-drafts'): ('led_noncode_only', 'wrangler.jsonc diff: "no runner is bound", REMOTE binding removed, circuit-state object added'),
 ('agent-worker:364', 'signin-door'): ('led_noncode_only', 'same wrangler.jsonc diff'),
 ('agent-worker:364', 'store-assembly'): ('led_noncode_only', 'same wrangler.jsonc diff'),
 ('agent-worker:569', 'store-assembly'): ('led_noncode_only', 'wrangler.jsonc diff declares the RUNNER binding; the changed refusal itself is in a found mark (F5), not a part'),
 ('ai-runs:96', 'agent-steps'): ('led_wide', '62 ids and 17 names named'),
 ('ai-runs:96', 'agent-worker'): ('led_wide', '62 ids and 17 names named'),
 ('ai-runs:96', 'capture-requests'): ('led_wide', '62 ids and 17 names named'),
 ('ai-runs:96', 'screens-inquiry'): ('led_wide', '62 ids and 17 names named'),
 ('op-declarations:95', 'plane'): ('led_wide', '45 or more ids named'),
 ('op-declarations:95', 'screens-inquiry'): ('led_wide', '45 or more ids named'),
 ('op-declarations:95', 'store-assembly'): ('led_wide', '45 or more ids named'),
 ('signin-door:153', 'store-request'): ('weak', 'STORE_ROUTES value changed is named; no named text mentions the signintokenrefused route the user calls'),
 ('ai-runs:323', 'queue-producers'): ('not_led', 'the effect is a changed test fixture (world.mjs) the user\'s test imports; a fixture carries no requirement id and is not a named part'),
 ('registers:426', 'corpus-export'): ('not_led', 'the effect is a new declared table (register_segment_removed) in schema.mjs; DECLARED_OPS and ids R28, R30, R32, R55 are named, the table is not'),
}
out = []; c = collections.Counter()
for r in J:
    if r['cls'] != 'cannot be decided mechanically':
        continue
    cls, why = SPECIAL.get((r['key'], r['user']), ('led', 'the named ids\' requirement lines or changed tests, or a named signature, state the changed thing the evidence cites'))
    c[cls] += 1
    out.append(dict(key=r['key'], user=r['user'], judged=cls, why=why, evidence=r['evidence']))
print(dict(c), sum(c.values()))
jdump(out, 'j5b_judged.json'); jdump(dict(c), 'j5b_judged_counts.json')
