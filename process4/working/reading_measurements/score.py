"""score.py WORK RECORDS OUT

Scores every reader run found in RECORDS (a folder of agent-*.jsonl worker records).
WORK is the working folder (keys/, texts/). OUT is a folder; one JSON per run is written
there, and a summary table is printed.

A run is recognised by the path readers/<run>/ in the worker's first message.
A run id is <series>-<size>-<arm><n>, for example p-100-h2: size 100, habit arm, run 2.
Arms: h = habit (reading set and a task), t = told (read whole, then questions),
n = no text at all.

Coverage is counted from what each tool call RETURNED, not from what it asked for:
a line of the text counts as received when its whole content appears in some tool result.
"""
import sys, os, json, re, glob

work, records, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)


def result_text(c):
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
    return ""


def right(answer, accept):
    a = answer.lower()
    for s in accept:
        s = s.lower()
        for m in re.finditer(re.escape(s), a):
            before = a[m.start() - 1] if m.start() > 0 else " "
            after = a[m.end()] if m.end() < len(a) else " "
            # a figure must stand alone: 45 is not right inside 145 or 4.5 or 45.2
            if s[0].isdigit() and (before.isdigit() or before in ".,"and m.start() > 1 and a[m.start() - 2].isdigit()):
                continue
            if s[-1].isdigit() and (after.isdigit() or (after in ".," and m.end() + 1 < len(a) and a[m.end() + 1].isdigit())):
                continue
            return True
    return False


def ranges(nums):
    r = []
    for n in sorted(nums):
        if r and n == r[-1][1] + 1:
            r[-1][1] = n
        else:
            r.append([n, n])
    return r


rows = []
for f in sorted(glob.glob(os.path.join(records, "agent-*.jsonl"))):
    ev = [json.loads(l) for l in open(f, encoding="utf-8")]
    first = next((e for e in ev if e.get("type") == "user"), None)
    if not first:
        continue
    prompt = result_text(first["message"]["content"])
    m = re.search(r"readers/([a-z0-9]+-(\d{3})-([htn])(\d+))/", prompt)
    if not m:
        continue
    run, size, arm = m.group(1), m.group(2), m.group(3)
    key = json.load(open(f"{work}/keys/k{size}.json", encoding="utf-8"))
    text_lines = open(f"{work}/texts/s{size}/text.md", encoding="utf-8").read().split("\n")
    if text_lines and text_lines[-1] == "":
        text_lines.pop()
    total = len(text_lines)
    got = set(i + 1 for i, l in enumerate(text_lines) if not l.strip())  # blank lines carry nothing
    calls, uses = [], {}
    final, model, last_usage = None, None, None
    opened_questions_at = None
    after_questions = []  # tool calls made after the questions (or task) were opened
    notices = []
    for e in ev:
        att = e.get("attachment") or {}
        if att.get("type") == "read_truncation_notice":
            # the harness tells the reader of a cut in a separate note, after the read's result
            mm = re.search(r"showing lines (\d+)-(\d+) of (\d+) total \((\d+) tokens, cap (\d+)\)", json.dumps(e))
            notices.append({"after_call": len(calls), "shown": [int(mm.group(1)), int(mm.group(2))], "file_tokens": int(mm.group(4)), "cap": int(mm.group(5))} if mm else {"after_call": len(calls)})
        msg = e.get("message") or {}
        c = msg.get("content")
        if e.get("type") == "assistant":
            model = msg.get("model") or model
            u = msg.get("usage") or {}
            if u:
                last_usage = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        if not isinstance(c, list):
            continue
        for b in c:
            if b.get("type") == "tool_use":
                inp = b.get("input") or {}
                if b["name"] == "SubagentHandback":
                    final = inp.get("message", "")
                    continue
                target = inp.get("file_path") or inp.get("path") or inp.get("command") or inp.get("pattern") or ""
                call = {"n": len(calls) + 1, "tool": b["name"],
                        "target": os.path.basename(target) if b["name"] == "Read" else str(target)[-160:],
                        "offset": inp.get("offset"), "limit": inp.get("limit"), "allow_large": inp.get("allow_large")}
                on_text = "text.md" in json.dumps(inp)
                on_q = ("questions.md" in json.dumps(inp)) or ("task.md" in json.dumps(inp))
                call["on"] = "text" if on_text else ("questions" if on_q else "other")
                if opened_questions_at is not None:
                    after_questions.append(call["n"])
                if on_q and opened_questions_at is None:
                    opened_questions_at = call["n"]
                calls.append(call)
                uses[b["id"]] = call
            elif b.get("type") == "tool_result":
                call = uses.get(b.get("tool_use_id"))
                if not call:
                    continue
                s = result_text(b.get("content"))
                call["returned_chars"] = len(s)
                if call["on"] == "text":
                    here = set()
                    for i, l in enumerate(text_lines):
                        if l.strip() and l in s:
                            here.add(i + 1)
                    call["returned_lines"] = ranges(here)
                    got |= here
                    # anything the tool said that is not the text itself (a notice, an error)
                    tail = s[-400:]
                    if not (text_lines[-1] in s) and here:
                        call["tail"] = tail[-240:]
                    if not here:
                        call["said"] = s[:300]
    if final is None:
        # a worker that ended with plain text
        for e in reversed(ev):
            if e.get("type") == "assistant":
                c = (e.get("message") or {}).get("content")
                if isinstance(c, list):
                    t = "\n".join(b.get("text", "") for b in c if b.get("type") == "text")
                    if t.strip():
                        final = t
                        break
    final = final or ""
    answers = {}
    for line in final.split("\n"):
        mm = re.search(r"\[(q\d\d)\]\s*(.*)", line)
        if mm:
            answers[mm.group(1)] = mm.group(2).strip()
    zone = {"first": 0, "middle": 0, "last": 0}
    marks = {}
    for it in key:
        ok = right(answers.get(it["id"], ""), it["accept"])
        marks[it["id"]] = ok
        zone[it["zone"]] += 1 if ok else 0
    n_right = sum(zone.values())
    missing = ranges(set(range(1, total + 1)) - got)
    covered = not missing
    text_calls = [c for c in calls if c["on"] == "text"]
    first_text = text_calls[0]["n"] if text_calls else None
    text_after_q = [c["n"] for c in text_calls if opened_questions_at and c["n"] > opened_questions_at]
    res = {
        "run": run, "size": size, "arm": arm, "agent": os.path.basename(f)[6:-6], "model": model,
        "context_tokens_at_end": last_usage, "text_lines": total,
        "prompt_exact": (open(f"{work}/prompts/{run}.txt", encoding="utf-8").read() == prompt) if os.path.exists(f"{work}/prompts/{run}.txt") else None,
        "cut_notices": notices,
        "calls": calls, "lines_received": total - sum(b - a + 1 for a, b in missing), "lines_missing": missing,
        "covered": covered, "questions_opened_at_call": opened_questions_at, "first_text_call": first_text,
        "text_calls_after_questions": text_after_q, "calls_after_questions": after_questions,
        "search_on_text": [c["n"] for c in text_calls if c["tool"] != "Read"],
        "answers_raw": final, "answers": answers, "marks": marks, "right": n_right, "right_by_zone": zone,
    }
    if arm == "t":
        res["set_aside"] = bool(after_questions) or (first_text is not None and opened_questions_at is not None and opened_questions_at < first_text)
    res["pass"] = bool(covered and n_right >= 11 and zone["last"] == 4) if arm != "n" else None
    json.dump(res, open(os.path.join(out, run + ".json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    rows.append(res)

print("run        model             reads  received   covered  right f/m/l  qopen firsttext  after-q  ctx-end  pass   large cuts prompt")
for r in sorted(rows, key=lambda r: r["run"]):
    z = r["right_by_zone"]
    print(f'{r["run"]:10s} {str(r["model"]):17s} {len([c for c in r["calls"] if c["on"]=="text"]):5d}  {r["lines_received"]:4d}/{r["text_lines"]:<4d}  {str(r["covered"]):7s}  {r["right"]:2d}   {z["first"]}/{z["middle"]}/{z["last"]}   {str(r["questions_opened_at_call"]):5s} {str(r["first_text_call"]):9s}  {len(r["calls_after_questions"]):3d}     {str(r["context_tokens_at_end"]):7s}  {str(r["pass"]):5s}  {sum(1 for c in r["calls"] if c.get("allow_large")):2d}    {len(r["cut_notices"]):2d}   {r["prompt_exact"]}' + ("  SET ASIDE" if r.get("set_aside") else ""))
