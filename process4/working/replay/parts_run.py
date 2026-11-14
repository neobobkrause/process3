"""J5 a: the four parts for each of the 178 recorded changes, at the change's own commit."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from extract import *
notices, tri, owed, ans, wd = load_notices()
res = resolve(notices, load_merges())
out = {}
for key, n in sorted(notices.items()):
    r = res[key]
    p = parts(r['p1'], r['merge'], n['provider'], mode='entry')
    pa = parts(r['p1'], r['merge'], n['provider'], mode='all')
    p['names_all_files'] = pa['names']
    p['p1'] = r['p1']; p['merge'] = r['merge']; p['kind'] = r['kind']
    p['notice_ids'] = n.get('ids', []); p['notice_exports'] = n.get('exports')
    out[key] = p
jdump(out, 'parts.json')
c = collections.Counter()
for key, p in out.items():
    n = p['names']; rq = p['reqs'] or {}
    f = dict(names=bool(n['removed'] or n['added'] or n['changed']), value=bool(n['value_changed']),
             req=bool(rq.get('public_ids')), tests=bool(p['test_ids']), noncode=bool(p['noncode']))
    c['notices'] += 1
    for k, v in f.items():
        c['has_' + k] += v
    c['any_part (names+value+req+tests+noncode)'] += any(f.values())
    c['none'] += not any(f.values())
    c['any_without_value_hash'] += f['names'] or f['req'] or f['tests'] or f['noncode']
    c['any_without_noncode'] += f['names'] or f['value'] or f['req'] or f['tests']
    c['any_names_req_only (what Process3 recorded: ids or export difference)'] += f['names'] or f['req']
    c['any_three_parts_no_value_no_noncode'] += f['names'] or f['req'] or f['tests']
    na = p['names_all_files']
    c['all-files mode: names'] += bool(na['removed'] or na['added'] or na['changed'])
    c['all-files mode: any part'] += bool(na['removed'] or na['added'] or na['changed'] or na['value_changed']) or f['req'] or f['tests'] or f['noncode']
    c['p3_record: no ids and no exports'] += (not p['notice_ids']) and not p['notice_exports']
print(json.dumps(c, indent=1))
