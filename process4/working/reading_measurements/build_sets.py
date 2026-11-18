"""build_sets.py WORK EVIDENCE_DIR

Cuts real documents into pieces of at most 24,000 bytes, at a heading where one is near, and makes
nested sets of about 100, 175, 250, 400 and 700 KB. Writes WORK/sets/pieces/dNN.md and WORK/sets/sets.json.
A set is the first N pieces. "middle" names the pieces of 8,000 bytes or more nearest the middle of the set.
"""
import sys, os, json
work, ev = sys.argv[1], sys.argv[2]
ORDER = ["foundations.md", "DECISIONS.md", "roles_root_coordinator.md", "interface_and_cycle.md", "product_side.md",
         "permissions_inventory.md", "causal_forensics.md", "verify_numbers.md", "bob_naming.md", "no_layers_width.md",
         "audit_A.md", "change_sample.md", "levers_github_cloudflare_product.md", "canon_analysis.md",
         "foundations_tranche_9nov.md", "audit_C.md"]
MAX = 24000
pieces = []
for name in ORDER:
    lines = open(os.path.join(ev, name), encoding="utf-8").read().split("\n")
    if lines and lines[-1] == "": lines.pop()
    cur, size, part = [], 0, 0
    def flush():
        global cur, size, part
        if cur:
            part += 1
            pieces.append({"source": name, "part": part, "lines": cur})
            cur, size = [], 0
    for l in lines:
        n = len((l + "\n").encode())
        # start a new piece at a heading once the piece is two thirds full, or when the next line would not fit
        if cur and (size + n > MAX or (l.startswith("#") and size > MAX * 2 // 3)):
            flush()
        cur.append(l); size += n
    flush()
os.makedirs(f"{work}/sets/pieces", exist_ok=True)
meta, total = [], 0
for i, p in enumerate(pieces, 1):
    fn = f"d{i:02d}.md"
    body = "\n".join(p["lines"]) + "\n"
    open(f"{work}/sets/pieces/{fn}", "w", encoding="utf-8").write(body)
    b = len(body.encode()); total += b
    meta.append({"file": fn, "bytes": b, "lines": len(p["lines"]), "source": p["source"], "part": p["part"], "cumulative": total})
sets = {}
for kb in (100, 175, 250, 400, 700):
    n = max(i + 1 for i, m in enumerate(meta) if m["cumulative"] <= kb * 1000 * 1.03)
    files = [m["file"] for m in meta[:n]]
    # the middle: the pieces of 8,000 bytes or more that lie nearest the middle of the set (two, or one in a small set)
    big = sorted((abs(i - (n - 1) / 2), i) for i in range(1, n - 1) if meta[i]["bytes"] >= 8000)
    mid = sorted(files[i] for _, i in big[: (2 if n >= 6 else 1)])
    sets[f"{kb:03d}"] = {"files": files, "bytes": meta[n - 1]["cumulative"], "last": files[-1], "middle": mid}
    print(kb, n, "files", meta[n - 1]["cumulative"], "bytes; middle", mid, "last", files[-1])
json.dump({"pieces": meta, "sets": sets}, open(f"{work}/sets/sets.json", "w"), indent=1)
print("pieces", len(meta), "total", total, "largest", max(m["bytes"] for m in meta), "smallest", min(m["bytes"] for m in meta))
