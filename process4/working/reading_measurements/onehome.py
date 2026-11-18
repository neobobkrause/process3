"""onehome.py SIZE -- for each item of keys/kSIZE.json, shows where each accept string occurs in the text,
so a person can judge whether the fact has one home. A figure counts only where it stands alone."""
import sys,json,re,os
size=sys.argv[1]
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines=open(f"{base}/texts/s{size}/text.md",encoding='utf-8').read().split("\n")
for it in json.load(open(f"{base}/keys/k{size}.json",encoding='utf-8')):
    for a in it["accept"]:
        pat=re.escape(a)
        if a[0].isdigit(): pat=r"(?<![\d.,])"+pat
        if a[-1].isdigit(): pat=pat+r"(?![\d]|[.,]\d)"
        hits=[i+1 for i,l in enumerate(lines) if re.search(pat,l,re.I)]
        print(it["id"],it["zone"],repr(a),"occurs on",len(hits),"line(s):",hits[:8])
