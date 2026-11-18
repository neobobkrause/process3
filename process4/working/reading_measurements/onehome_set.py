"""onehome_set.py SIZE -- shows in which files and lines of the set each accept string occurs."""
import sys, json, re, os
size = sys.argv[1]
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = json.load(open(f"{base}/sets/sets.json"))["sets"][size]
for it in json.load(open(f"{base}/keys/set{size}.json", encoding="utf-8")):
    for a in it["accept"]:
        pat = re.escape(a)
        if a[0].isdigit(): pat = r"(?<![\d.,])" + pat
        if a[-1].isdigit(): pat = pat + r"(?![\d]|[.,]\d)"
        hits = []
        for f in S["files"]:
            for n, l in enumerate(open(f"{base}/sets/pieces/{f}", encoding="utf-8").read().split("\n"), 1):
                if re.search(pat, l, re.I): hits.append(f"{f}:{n}")
        print(it["id"], it["kind"], repr(a), "occurs in", len(hits), "place(s):", hits[:8])
