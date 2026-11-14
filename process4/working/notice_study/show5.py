import sys; sys.path.insert(0,'/home/user/work/notice_study')
from nlib import *
N,T,O,A,W = notices()
rows_=rows(); P=parts()
for key in sys.argv[1:]:
    r=rows_[key]; p=P[key]
    print('=====',key, r['kind'], r['at'], 'p1',r['p1'][:10],'merge',r['merge'][:10])
    print('notice', json.dumps(N[key]))
    print('told',r['told'],'affected',r['affected'])
    print('files',r['files'])
    print('parts', json.dumps({k:p[k] for k in ('names','names_all_files','reqs','test_ids','noncode','test_files_no_id','entry_files') if k in p}))
    for t in T[key]:
        print(' T', t['user'], t['verdict'], '|', t['evidence'])
    for a in A[key]:
        if a['user'] in r['affected']: print(' A', json.dumps(a))
