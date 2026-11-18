"""verify_set.py SIZE -- checks keys/setSIZE.json against the set's files, then writes the readers' task.

A set key is a list of exactly twenty items:
  {"id": "q01", "kind": "last|middle|spread|two", "question": "...", "answer": "...", "accept": ["..."],
   "evidence": [{"file": "d05.md", "quote": "exact quote"}]}
Four of kind last (evidence in the set's last file), four of kind middle (in its middle files), two of
kind two (two quotes, in two different files, both needed for the answer), ten of kind spread (in other
files, over as many of them as there are, up to eight). Each quote occurs exactly once in the whole set.
"""
import sys, json, os
size = sys.argv[1]
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = json.load(open(f"{base}/sets/sets.json"))["sets"][size]
text = {f: open(f"{base}/sets/pieces/{f}", encoding="utf-8").read() for f in S["files"]}
key = json.load(open(f"{base}/keys/set{size}.json", encoding="utf-8"))
errs = []
if not isinstance(key, list) or len(key) != 20: errs.append("key must be a list of exactly 20 items")
kinds = {"last": 0, "middle": 0, "spread": 0, "two": 0}; ids = set(); spread_files = set()
others = [f for f in S["files"] if f != S["last"] and f not in S["middle"]]
for it in (key if isinstance(key, list) else []):
    i = it.get("id")
    miss = [f for f in ("id", "kind", "question", "answer", "accept", "evidence") if f not in it]
    if miss: errs.append(f"{i}: missing {miss}"); continue
    if i in ids: errs.append(f"{i}: duplicate id")
    ids.add(i)
    k = it["kind"]
    if k not in kinds: errs.append(f"{i}: kind must be last, middle, spread or two"); continue
    kinds[k] += 1
    ev = it["evidence"]
    if not isinstance(ev, list) or len(ev) != (2 if k == "two" else 1): errs.append(f"{i}: kind {k} needs {2 if k=='two' else 1} evidence item(s)"); continue
    files = []
    for e in ev:
        f, q = e.get("file"), e.get("quote", "")
        if f not in text: errs.append(f"{i}: {f} is not a file of this set"); continue
        files.append(f)
        if len(q) < 25: errs.append(f"{i}: quote too short (25+ characters)")
        n = sum(t.count(q) for t in text.values())
        if n != 1 or text[f].count(q) != 1: errs.append(f"{i}: quote must occur exactly once in the whole set and in {f}; occurs {n} times in the set, {text[f].count(q)} in {f}")
    if k == "last" and files != [S["last"]]: errs.append(f"{i}: kind last must quote {S['last']}")
    if k == "middle" and (not files or files[0] not in S["middle"]): errs.append(f"{i}: kind middle must quote one of {S['middle']}")
    if k == "spread":
        if not files or files[0] not in others: errs.append(f"{i}: kind spread must quote a file other than the last and middle files")
        else: spread_files.add(files[0])
    if k == "two" and len(set(files)) != 2: errs.append(f"{i}: kind two needs quotes from two different files")
    acc = it["accept"]
    if not isinstance(acc, list) or not acc: errs.append(f"{i}: accept must be a non-empty list"); continue
    allq = " ".join(e.get("quote", "") for e in ev).lower()
    if not any(a.lower() in allq for a in acc): errs.append(f"{i}: at least one accept string must appear inside the evidence")
    for a in acc:
        if len(a.strip()) < 2: errs.append(f"{i}: accept string too short: {a!r}")
        if a.lower() in it["question"].lower(): errs.append(f"{i}: the question contains the answer string {a!r}")
    if len(it["question"]) > 300: errs.append(f"{i}: question longer than 300 characters")
for k, want in (("last", 4), ("middle", 4), ("spread", 10), ("two", 2)):
    if kinds[k] != want: errs.append(f"need exactly {want} of kind {k}, found {kinds[k]}")
need = min(len(others), 8)
if len(spread_files) < need: errs.append(f"kind spread must draw on at least {need} different files, draws on {len(spread_files)}")
if errs:
    print("FAIL"); [print(" -", e) for e in errs]; sys.exit(1)
# mixed order, so a question's place in the list says nothing of where its answer is
order = sorted(key, key=lambda it: (int(it["id"][1:]) * 7) % 20)
q = "\n".join(f"{n+1}. [{it['id']}] {it['question']}" for n, it in enumerate(order))
d = f"{base}/sets/s{size}"; os.makedirs(d, exist_ok=True)
open(f"{d}/task.md", "w", encoding="utf-8").write("# Task\n\nThe coordinator is preparing a short summary for the owner and needs the facts below, taken from the documents in your reading set. Give each as a short answer. If the documents do not say, answer \"unknown\".\n\n" + q + "\n")
open(f"{d}/questions.md", "w", encoding="utf-8").write("# Questions\n\nAnswer each from the documents you read. Give a short answer. If you do not know, answer \"unknown\".\n\n" + q + "\n")
print("OK set", size, len(S["files"]), "files", S["bytes"], "bytes")
