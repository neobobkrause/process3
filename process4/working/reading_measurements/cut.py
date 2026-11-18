import sys,os,json
src=open('src/log.md',encoding='utf-8').read().split("\n")
sizes=[12,24,48,70,100,140,280,540]
info={}
for kb in sizes:
    target=kb*1000
    out=[];b=0
    for l in src:
        n=len((l+"\n").encode())
        if b+n>target and out: break
        out.append(l); b+=n
    d=f"texts/s{kb:03d}"; os.makedirs(d,exist_ok=True)
    open(f"{d}/text.md","w",encoding='utf-8').write("\n".join(out)+"\n")
    nl=len(out)
    # zones by line number (1-based, inclusive)
    z={"first":[1,max(1,round(nl*0.10))],"middle":[round(nl*0.40)+1,round(nl*0.60)],"last":[round(nl*0.90)+1,nl]}
    info[f"{kb:03d}"]={"bytes":b,"lines":nl,"zones":z}
    print(kb,b,nl,z)
json.dump(info,open("keys/info.json","w"),indent=1)
