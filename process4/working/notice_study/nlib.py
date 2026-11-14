"""Helpers for the notice study. Read-only against the local clone and against the replay
directory (/home/user/work/replay): this file imports the replay's lib.py and extract.py and never
calls their writers. Everything this study writes goes under /home/user/work/notice_study/.
Run every script with `python3 -I`."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
REPLAY = '/home/user/work/replay'
sys.path.insert(0, REPLAY)
sys.path.insert(0, HERE)
import lib as R          # replay helpers (git, show, modules_at, load_notices, ...)
import extract as X      # replay extractor (surface_at, req_diff, import_edges, ...)
DATA = os.path.join(HERE, 'data')
SCRATCH = os.path.join(HERE, 'scratch')

def rload(name):
    return json.load(open(os.path.join(REPLAY, 'data', name)))

def dump(obj, name):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, name), 'w') as f:
        json.dump(obj, f, indent=1, sort_keys=True)

def load(name):
    return json.load(open(os.path.join(DATA, name)))

def notices():
    """(notices, triage, owed, answered, withdrawn) from the replay's export of the state branch."""
    assert os.path.isdir(os.path.join(REPLAY, 'scratch', 'notices'))
    return R.load_notices()

def rows():
    return rload('j4a_rows.json')

def parts():
    return rload('parts.json')
