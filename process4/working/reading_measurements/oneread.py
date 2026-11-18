"""oneread.py READERS RECORDS -- what one read returned, counted from each worker's record.
For every Read call a one-N worker made: the file, its real size and line count, the last line
number that came back, whether the file's last line came back, and anything the tool said."""
import sys, os, json, re, glob
readers, records = sys.argv[1], sys.argv[2]
def rt(c):
    if isinstance(c, str): return c
    if isinstance(c, list): return "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
    return ""
out = []
for f in sorted(glob.glob(os.path.join(records, "agent-*.jsonl"))):
    ev = [json.loads(l) for l in open(f, encoding="utf-8")]
    first = next((e for e in ev if e.get("type") == "user"), None)
    m = re.search(r"readers/(one-\d+)/", rt(first["message"]["content"])) if first else None
    if not m: continue
    run = m.group(1); uses = {}; model = None; ctx = None
    for e in ev:
        msg = e.get("message") or {}
        if e.get("type") == "assistant":
            model = msg.get("model") or model
            u = msg.get("usage") or {}
            if u: ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        c = msg.get("content")
        if not isinstance(c, list): continue
        for b in c:
            if b.get("type") == "tool_use" and b["name"] != "SubagentHandback":
                uses[b["id"]] = {"run": run, "tool": b["name"], "input": b.get("input"), "ctx_before": ctx}
            elif b.get("type") == "tool_result" and b.get("tool_use_id") in uses:
                u = uses[b["tool_use_id"]]; s = rt(b.get("content"))
                p = (u["input"] or {}).get("file_path", "")
                real = open(p, encoding="utf-8").read().split("\n") if os.path.exists(p) else []
                if real and real[-1] == "": real.pop()
                nums = [int(x) for x in re.findall(r"(?m)^\s*(\d+)\t", s)]
                got = sum(1 for l in real if l.strip() and l in s)
                u.update({"file": os.path.basename(p), "bytes": os.path.getsize(p) if os.path.exists(p) else None,
                          "lines": len(real), "returned_chars": len(s), "last_line_no": max(nums) if nums else None,
                          "whole_lines_received": got, "last_line_received": bool(real) and real[-1] in s,
                          "extra": (s[:300] if not nums else (s[-300:] if not (real and real[-1] in s) else "")),
                          "offset": (u["input"] or {}).get("offset"), "limit": (u["input"] or {}).get("limit")})
                out.append(u)
    print(run, "model", model, "context at end", ctx)
print("run    file            bytes   lines  last-no  whole-lines  end?   returned-chars  ctx-before")
for u in out:
    print(f'{u["run"]:6s} {u["file"]:15s} {u["bytes"]:7d} {u["lines"]:6d}  {str(u["last_line_no"]):7s} {u["whole_lines_received"]:6d}       {str(u["last_line_received"]):5s}  {u["returned_chars"]:8d}  {u["ctx_before"]}' + (f'  offset={u["offset"]} limit={u["limit"]}' if u["offset"] or u["limit"] else ""))
    if u["extra"]: print("        tool said:", u["extra"].replace("\n", " | ")[:400])
json.dump(out, open(os.path.join(readers, "..", "rm", "out-oneread.json"), "w"), indent=1)
