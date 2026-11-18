#!/usr/bin/env python3
"""Fact questions (a second score only).

  facts.py parts TRIAL        write the parts a writer and a checker are handed, under /home/user/r2/facts/TRIAL/
  facts.py merge TRIAL        check /home/user/r2/facts/TRIAL/questions.json by script and put it in the key

Single text: three parts, the first tenth, the band from 45 to 55 percent, the last tenth (each at
most 12,000 bytes, whole lines). Set: four files, the first, two middle ones and the last.
Placed passages are cut out of the parts, so no question can be about them.
"""
import json, os, re, sys
PRIV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUND = "/home/user/process3-probes"
OUT = "/home/user/r2/facts"


def clean(lines, key, rel):
    drop = set()
    for it in key["placed"]:
        if it.get("file") == rel and it.get("line"):
            for k in range(it["line"] - 3, it["line"] + 3):
                drop.add(k)
    return [l for i, l in enumerate(lines, 1) if i not in drop]


def parts(tid):
    key = json.load(open(f"{PRIV}/keys/{tid}.json"))
    d = f"{OUT}/{tid}"
    os.makedirs(d, exist_ok=True)
    out = []
    if key["ladder"] == "single":
        rel = key["files"][0]
        lines = open(f"{GROUND}/{rel}", encoding="utf-8").read().split("\n")
        n = len(lines)
        for zone, a, b in (("first", 0, 0.10), ("middle", 0.45, 0.55), ("last", 0.90, 1.0)):
            seg = lines[int(a * n):max(int(b * n), int(a * n) + 1)]
            seg = clean(seg, {"placed": [dict(it, line=(it["line"] or 0) - int(a * n)) for it in key["placed"]]}, None) if False else seg
            keep, size = [], 0
            placed_lines = {it["line"] for it in key["placed"] if it.get("line")}
            for i, l in enumerate(seg, int(a * n) + 1):
                if any(abs(i - p) <= 2 for p in placed_lines):
                    continue
                if size + len(l.encode()) > 12000:
                    break
                keep.append(l)
                size += len(l.encode())
            open(f"{d}/{zone}.txt", "w").write("\n".join(keep) + "\n")
            out.append((zone, len(keep)))
    else:
        nf = len(key["files"])
        picks = sorted(set([0, nf // 3, (2 * nf) // 3, nf - 1])) if nf >= 4 else list(range(nf))
        for j, fi in enumerate(picks):
            rel = key["files"][fi]
            lines = open(f"{GROUND}/{rel}", encoding="utf-8").read().split("\n")
            placed_lines = {it["line"] for it in key["placed"] if it.get("file") == rel and it.get("line")}
            keep, size = [], 0
            for i, l in enumerate(lines, 1):
                if any(abs(i - p) <= 2 for p in placed_lines):
                    continue
                if size + len(l.encode()) > 12000:
                    break
                keep.append(l)
                size += len(l.encode())
            zone = f"file{fi + 1:02d}"
            open(f"{d}/{zone}.txt", "w").write("\n".join(keep) + "\n")
            out.append((zone, len(keep)))
    print(tid, out)


def merge(tid):
    key = json.load(open(f"{PRIV}/keys/{tid}.json"))
    qs = json.load(open(f"{OUT}/{tid}/questions.json"))
    whole = "\n".join(open(f"{GROUND}/{f}", encoding="utf-8").read() for f in key["files"]).lower()
    start = open(f"{PRIV}/start/{tid}.txt").read().lower()
    faults = []
    for i, q in enumerate(qs):
        q["id"] = f"Q{i + 2}"
        if not q.get("accept"):
            faults.append(f"{q['id']}: no accept string")
        for a in q.get("accept", []):
            if whole.count(a.lower()) != 1:
                faults.append(f"{q['id']}: accept string {a!r} occurs {whole.count(a.lower())} times in the text")
            if a.lower() in q["question"].lower() or a.lower() in start:
                faults.append(f"{q['id']}: accept string {a!r} is in the question or the starting text")
    if faults:
        print(tid, "FAULTS", faults)
        return
    key["facts"] = qs
    json.dump(key, open(f"{PRIV}/keys/{tid}.json", "w"), indent=1)
    print(tid, "merged", len(qs))


if __name__ == "__main__":
    {"parts": parts, "merge": merge}[sys.argv[1]](sys.argv[2])
