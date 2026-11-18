"""score_set.py WORK RECORDS OUT -- scores every reader of a set found in RECORDS (worker records).
Coverage is counted file by file from what each call returned. A run passes when every line of every
file was received and at least 18 of 20 answers are right, all four from the last file among them."""
import sys, os, json, re, glob
work, records, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SETS = json.load(open(f"{work}/sets/sets.json"))
def rt(c):
    if isinstance(c, str): return c
    if isinstance(c, list): return "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
    return ""
def right(answer, accept):
    a = answer.lower()
    for s in accept:
        s = s.lower()
        for m in re.finditer(re.escape(s), a):
            before = a[m.start() - 1] if m.start() > 0 else " "
            after = a[m.end()] if m.end() < len(a) else " "
            if s[0].isdigit() and (before.isdigit() or (before in ".," and m.start() > 1 and a[m.start() - 2].isdigit())): continue
            if s[-1].isdigit() and (after.isdigit() or (after in ".," and m.end() + 1 < len(a) and a[m.end() + 1].isdigit())): continue
            return True
    return False
rows = []
for f in sorted(glob.glob(os.path.join(records, "agent-*.jsonl"))):
    ev = [json.loads(l) for l in open(f, encoding="utf-8")]
    first = next((e for e in ev if e.get("type") == "user"), None)
    if not first: continue
    prompt = rt(first["message"]["content"])
    m = re.search(r"readers/([a-z0-9]+-set(\d{3})-h(\d+))/", prompt)
    if not m: continue
    run, size = m.group(1), m.group(2)
    S = SETS["sets"][size]; key = json.load(open(f"{work}/keys/set{size}.json", encoding="utf-8"))
    text = {}
    for fn in S["files"]:
        ls = open(f"{work}/sets/pieces/{fn}", encoding="utf-8").read().split("\n")
        if ls and ls[-1] == "": ls.pop()
        text[fn] = ls
    got = {fn: set(i for i, l in enumerate(ls) if len(l.strip()) < 8) for fn, ls in text.items()}  # near-empty lines carry nothing
    calls, uses, notices, final, model, ctx, opened_task = [], {}, 0, None, None, None, None
    for e in ev:
        if (e.get("attachment") or {}).get("type") == "read_truncation_notice": notices += 1
        msg = e.get("message") or {}
        if e.get("type") == "assistant":
            model = msg.get("model") or model
            u = msg.get("usage") or {}
            if u: ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        c = msg.get("content")
        if not isinstance(c, list): continue
        for b in c:
            if b.get("type") == "tool_use":
                inp = b.get("input") or {}
                if b["name"] == "SubagentHandback": final = inp.get("message", ""); continue
                j = json.dumps(inp)
                on = [fn for fn in S["files"] if fn in j]
                call = {"n": len(calls) + 1, "tool": b["name"], "files": on, "task": "task.md" in j,
                        "offset": inp.get("offset"), "limit": inp.get("limit"), "allow_large": inp.get("allow_large"),
                        "target": "" if b["name"] == "Read" else j[-200:]}
                if b["name"] != "Read" and not on and "*.md" in j or (b["name"] != "Read" and re.search(r"readers/[^/]+/?[\"' ]", j) and not on):
                    call["files"] = list(S["files"])  # a command over the whole folder
                call["other"] = not call["files"] and not call["task"]
                if call["task"] and opened_task is None: opened_task = call["n"]
                calls.append(call); uses[b["id"]] = call
            elif b.get("type") == "tool_result" and b.get("tool_use_id") in uses:
                call = uses[b["tool_use_id"]]; s = rt(b.get("content")); call["returned_chars"] = len(s)
                n = 0
                for fn in call["files"]:
                    for i, l in enumerate(text[fn]):
                        if i not in got[fn] and l in s: got[fn].add(i); n += 1
                call["new_lines"] = n
                if call["files"] and n == 0 and len(s) < 600: call["said"] = s[:300]
    final = final or ""
    answers = {mm.group(1): mm.group(2).strip() for mm in (re.search(r"\[(q\d\d)\]\s*(.*)", l) for l in final.split("\n")) if mm}
    kinds = {"last": 0, "middle": 0, "spread": 0, "two": 0}; marks = {}
    for it in key:
        ok = right(answers.get(it["id"], ""), it["accept"]); marks[it["id"]] = ok; kinds[it["kind"]] += 1 if ok else 0
    per = {fn: [len(got[fn]), len(text[fn])] for fn in S["files"]}
    whole = [fn for fn, (a, b) in per.items() if a == b]
    untouched = [fn for fn in S["files"] if not any(fn in c["files"] for c in calls)]
    res = {"run": run, "size": size, "agent": os.path.basename(f)[6:-6], "model": model, "context_tokens_at_end": ctx,
           "prompt_exact": (open(f"{work}/prompts/{run}.txt", encoding="utf-8").read() == prompt) if os.path.exists(f"{work}/prompts/{run}.txt") else None,
           "files": len(S["files"]), "files_whole": len(whole), "files_not_whole": {fn: per[fn] for fn in S["files"] if fn not in whole},
           "files_never_named_in_a_call": untouched, "lines_received": sum(a for a, b in per.values()), "lines_total": sum(b for a, b in per.values()),
           "cut_notices": notices, "task_opened_at_call": opened_task, "calls": calls, "calls_elsewhere": [c["n"] for c in calls if c["other"]],
           "answers_raw": final, "answers": answers, "marks": marks, "right": sum(kinds.values()), "right_by_kind": kinds}
    res["covered"] = len(whole) == len(S["files"])
    res["pass"] = bool(res["covered"] and res["right"] >= 18 and kinds["last"] == 4)
    json.dump(res, open(os.path.join(out, run + ".json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    rows.append(res)
print("run            files whole  lines        right l/m/s/t   calls reads large cuts elsewhere ctx-end  prompt pass")
for r in sorted(rows, key=lambda r: (r["size"], r["run"])):
    k = r["right_by_kind"]
    print(f'{r["run"]:14s} {r["files"]:4d} {r["files_whole"]:5d}  {r["lines_received"]:5d}/{r["lines_total"]:<5d}  {r["right"]:2d}   {k["last"]}/{k["middle"]}/{k["spread"]}/{k["two"]}    {len(r["calls"]):4d} {sum(1 for c in r["calls"] if c["tool"]=="Read" and c["files"]):5d} {sum(1 for c in r["calls"] if c.get("allow_large")):4d} {r["cut_notices"]:4d}   {len(r["calls_elsewhere"]):3d}     {str(r["context_tokens_at_end"]):7s}  {str(r["prompt_exact"]):5s}  {r["pass"]}')
