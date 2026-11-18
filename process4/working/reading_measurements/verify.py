"""verify.py SIZE  -- checks keys/kSIZE.json against texts/sSIZE/text.md, then writes the reader files."""
import sys,json,re,os
size=sys.argv[1]
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
info=json.load(open(f"{base}/keys/info.json"))[size]
text=open(f"{base}/texts/s{size}/text.md",encoding='utf-8').read()
lines=text.split("\n")
key=json.load(open(f"{base}/keys/k{size}.json",encoding='utf-8'))
errs=[]
if not isinstance(key,list) or len(key)!=12: errs.append("key must be a list of exactly 12 items")
zc={"first":0,"middle":0,"last":0}
ids=set()
for it in (key if isinstance(key,list) else []):
    i=it.get("id")
    for f in ("id","zone","question","answer","accept","evidence"):
        if f not in it: errs.append(f"{i}: missing field {f}")
    if errs and any(e.startswith(f"{i}: missing") for e in errs): continue
    if i in ids: errs.append(f"{i}: duplicate id")
    ids.add(i)
    z=it["zone"]
    if z not in zc: errs.append(f"{i}: zone must be first, middle or last"); continue
    zc[z]+=1
    ev=it["evidence"]
    c=text.count(ev)
    if c!=1: errs.append(f"{i}: evidence must occur exactly once in the text, occurs {c} times"); continue
    if len(ev)<25: errs.append(f"{i}: evidence too short (need 25+ characters)")
    ln=text[:text.index(ev)].count("\n")+1
    lo,hi=info["zones"][z]
    if not (lo<=ln<=hi): errs.append(f"{i}: evidence is at line {ln}, outside the {z} zone (lines {lo} to {hi})")
    if not isinstance(it["accept"],list) or not it["accept"]: errs.append(f"{i}: accept must be a non-empty list of strings")
    else:
        for a in it["accept"]:
            if len(a.strip())<2: errs.append(f"{i}: accept string too short: {a!r}")
        if not any(a.lower() in ev.lower() for a in it["accept"]): errs.append(f"{i}: at least one accept string must appear inside the evidence")
        for a in it["accept"]:
            if a.lower() in it["question"].lower(): errs.append(f"{i}: the question contains the answer string {a!r}")
    if len(it["question"])>260: errs.append(f"{i}: question longer than 260 characters")
for z,n in zc.items():
    if n!=4: errs.append(f"need exactly 4 questions in zone {z}, found {n}")
if errs:
    print("FAIL"); [print(" -",e) for e in errs]; sys.exit(1)
# deterministic mixed order: interleave zones so position in the list gives nothing away
order=[]
byz={z:[it for it in key if it["zone"]==z] for z in ("middle","last","first")}
for k in range(4):
    for z in ("middle","last","first"): order.append(byz[z][k])
q="\n".join(f"{n+1}. [{it['id']}] {it['question']}" for n,it in enumerate(order))
d=f"{base}/texts/s{size}"
open(f"{d}/questions.md","w",encoding='utf-8').write("# Questions\n\nAnswer each from the text you read. Give a short answer. If you do not know, answer \"unknown\".\n\n"+q+"\n")
open(f"{d}/task.md","w",encoding='utf-8').write("# Task\n\nThe coordinator is preparing a short summary for the owner and needs the facts below, taken from the document in your reading set. Give each as a short answer. If the document does not say, answer \"unknown\".\n\n"+q+"\n")
print("OK", size, "lines", info["lines"], "bytes", info["bytes"])
