#!/usr/bin/env python3
"""Collect each run's record from the collectors' files, reduce it, and score it.

  score.py collect PROJECT_DIR OUT_DIR     read every collector's record under PROJECT_DIR
                                           (subagents/*.jsonl and tool-results/*), write one
                                           reduced record per run into OUT_DIR/<run>.json
  score.py score OUT_DIR SCORES.json       score every reduced record against its key

A reduced record keeps every call, the lines each read returned, and the raw output, and drops
the text the reads returned.
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tasks import TASKS, check_work  # noqa: E402

PRIV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = os.path.join(PRIV, "keys")
START = os.path.join(PRIV, "start")
GROUND = "/home/user/process3-probes"
REPO_IN_READER = "/home/user/process3-probes/"


def parse_ccr(text):
    i = text.find('{"ccr"')
    if i < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[i:])
        return obj["ccr"]
    except Exception:
        return None


def collector_results(project_dir):
    """Yield (tool name, input, ccr object) for every remote-session call a collector made."""
    files = glob.glob(os.path.join(project_dir, "subagents", "*.jsonl"))
    for f in files:
        uses = {}
        for line in open(f, encoding="utf-8", errors="replace"):
            try:
                d = json.loads(line)
            except Exception:
                continue
            msg = d.get("message")
            if not isinstance(msg, dict) or not isinstance(msg.get("content"), list):
                continue
            for b in msg["content"]:
                if b.get("type") == "tool_use" and "claude-code-remote" in b.get("name", ""):
                    uses[b["id"]] = (b["name"].split("__")[-1], b.get("input", {}))
                elif b.get("type") == "tool_result" and b.get("tool_use_id") in uses:
                    name, inp = uses[b["tool_use_id"]]
                    c = b.get("content")
                    text = c if isinstance(c, str) else "".join(x.get("text", "") for x in c or [] if isinstance(x, dict))
                    m = re.search(r"saved to (\S+\.txt)", text)
                    if m and os.path.exists(m.group(1)):
                        text = open(m.group(1), encoding="utf-8", errors="replace").read()
                    ccr = parse_ccr(text)
                    if ccr is not None:
                        yield name, inp, ccr


def gather(project_dir):
    sessions = {}   # session id -> {"title":..., "events": {uuid: ev}, "meta": last get_session}
    for name, inp, ccr in collector_results(project_dir):
        if name == "create_session":
            sid = ccr.get("id")
            s = sessions.setdefault(sid, {"events": {}, "meta": None})
            s["title"] = ccr.get("title")
            s["created"] = ccr
        elif name == "get_session":
            sid = ccr.get("id")
            s = sessions.setdefault(sid, {"events": {}, "meta": None})
            s["title"] = s.get("title") or ccr.get("title")
            if (ccr.get("external_metadata") or {}).get("usage") or s["meta"] is None:
                s["meta"] = ccr
        elif name == "list_events":
            sid = inp.get("session_id")
            s = sessions.setdefault(sid, {"events": {}, "meta": None})
            for ev in ccr.get("data", []):
                kind = [k for k in ev if k != "created_at"][0]
                body = ev[kind]
                s["events"][body.get("uuid")] = (ev.get("created_at"), kind, body)
    return sessions


def text_of(content):
    if isinstance(content, str):
        return content
    return "".join(x.get("text", "") for x in content or [] if isinstance(x, dict) and x.get("type") == "text")


def file_lines(rel):
    p = os.path.join(GROUND, rel)
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read().split("\n")


def reduce_session(s, key):
    """Turn a session's events into the reduced record of one run."""
    evs = sorted(s["events"].values(), key=lambda x: x[0])
    reading = {REPO_IN_READER + f: f for f in key["files"]}
    index = {}
    for f in key["files"]:
        m = {}
        for i, l in enumerate(file_lines(f)):
            t = l.strip()
            if len(t) >= 12:
                m.setdefault(t, []).append(i + 1)
        index[f] = m
    got = {f: set() for f in key["files"]}
    calls, users, texts, uses = [], [], [], {}
    ctx = []
    for created, kind, body in evs:
        c = body.get("internal_anthropic_catchall", {})
        if c.get("parent_tool_use_id"):
            sub = True
        else:
            sub = False
        msg = c.get("message", {})
        content = msg.get("content")
        if kind == "assistant":
            u = msg.get("usage") or {}
            if u and not sub:
                ctx.append((created, u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0)
                            + u.get("cache_creation_input_tokens", 0), msg.get("model")))
            for b in content or []:
                if b.get("type") == "tool_use":
                    call = {"n": len(calls) + 1, "at": created, "tool": b["name"], "input": b.get("input", {}),
                            "after_messages": len(users), "worker": sub}
                    uses[b["id"]] = call
                    calls.append(call)
                elif b.get("type") == "text" and b.get("text", "").strip():
                    texts.append({"at": created, "after_messages": len(users), "text": b["text"], "worker": sub})
        elif kind == "user":
            if isinstance(content, str) or (isinstance(content, list) and content and content[0].get("type") == "text"):
                if not sub:
                    users.append({"at": created, "text": text_of(content), "origin": c.get("inbound_origin")})
                continue
            for b in content or []:
                if b.get("type") != "tool_result":
                    continue
                call = uses.get(b.get("tool_use_id"))
                if call is None:
                    continue
                out = text_of(b.get("content"))
                call["error"] = bool(b.get("is_error"))
                tr = c.get("tool_use_result")
                call["returned_chars"] = len(out)
                if call["tool"] == "Read":
                    path = call["input"].get("file_path", "")
                    call["file"] = path
                    if isinstance(tr, dict) and isinstance(tr.get("file"), dict):
                        fl = tr["file"]
                        call["first_line"] = fl.get("startLine")
                        call["lines_returned"] = fl.get("numLines")
                        call["total_lines"] = fl.get("totalLines")
                        if path in reading and fl.get("startLine"):
                            a = fl["startLine"]
                            got[reading[path]].update(range(a, a + (fl.get("numLines") or 0)))
                    else:
                        call["lines_returned"] = 0
                        call["message"] = out[:300]
                else:
                    stdout = tr.get("stdout") if isinstance(tr, dict) and isinstance(tr.get("stdout"), str) else out
                    cmd = json.dumps(call["input"])
                    hit = {}
                    for f in key["files"]:
                        if f in cmd or os.path.dirname(f) in cmd:
                            m = index[f]
                            n = 0
                            for l in stdout.split("\n"):
                                t = re.sub(r"^\s*\d+[\t:|-]\s?", "", l).strip()
                                for ln in m.get(t, m.get(l.strip(), [])):
                                    got[f].add(ln)
                                    n += 1
                            hit[f] = n
                    if hit:
                        call["reading_lines_matched"] = hit
                    keep = "tail -n +1 /home/user/out" in cmd
                    call["output"] = stdout if keep else stdout[:1500]
    # coverage
    cover = {}
    for f in key["files"]:
        lines = file_lines(f)
        nonblank = [i + 1 for i, l in enumerate(lines) if l.strip()]
        missing = [i for i in nonblank if i not in got[f]]
        run = best = 0
        prev = None
        pos = {v: k for k, v in enumerate(nonblank)}
        first_gap = None
        for i in missing:
            if prev is not None and pos[i] == pos[prev] + 1:
                run += 1
            else:
                run = 1
            if run >= 3 and first_gap is None:
                first_gap = i - 2
            best = max(best, run)
            prev = i
        cover[f] = {"lines": len(nonblank), "received": len(nonblank) - len(missing),
                    "longest_missing_run": best, "first_gap_line": first_gap}
    meta = s.get("meta") or {}
    em = meta.get("external_metadata") or {}
    return {"session": meta.get("id") or (s.get("created") or {}).get("id"), "title": s.get("title"),
            "trial": key["id"], "model_configured": meta.get("configured_model"),
            "model_served": em.get("last_served_model"), "window": (em.get("context_usage") or {}).get("max_tokens"),
            "tokens_held_reported": (em.get("context_usage") or {}).get("used_tokens"),
            "usage": em.get("usage"), "status": meta.get("session_status"),
            "messages": users, "calls": calls, "texts": texts, "context_by_request": ctx, "coverage": cover}


def collect(project_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    sessions = gather(project_dir)
    n = 0
    for sid, s in sessions.items():
        title = s.get("title") or ""
        m = re.match(r"^([a-z0-9]{6})-[a-z]\d+$", title)
        if not m or not s["events"]:
            continue
        kp = os.path.join(KEYS, m.group(1) + ".json")
        if not os.path.exists(kp):
            continue
        key = json.load(open(kp))
        rec = reduce_session(s, key)
        rec["run"] = title
        json.dump(rec, open(os.path.join(out_dir, title + ".json"), "w"), indent=1)
        n += 1
    print("records written:", n, "of", len(sessions), "sessions seen")


# ---------- scoring ----------

SEARCH = re.compile(r"\b(grep|rg|ag|awk|ack)\b|sed\s+-n\s+'?/")


def parse_tail(out):
    files = {}
    cur = None
    for line in out.split("\n"):
        m = re.match(r"^==> (.+) <==$", line)
        if m:
            cur = m.group(1)
            files[cur] = []
        elif cur is not None:
            files[cur].append(line)
    res = {}
    for k, v in files.items():
        while v and v[-1] == "":
            v.pop()
        res[k] = "\n".join(v)
    return res


def score_run(rec, key):
    out = {"run": rec["run"], "trial": key["id"], "ladder": key["ladder"], "size": key["size"],
           "piece": key.get("piece"), "kind": key.get("kind"), "bytes": key["bytes"],
           "model": rec.get("model_served"), "window": rec.get("window"), "flags": []}
    calls = rec["calls"]
    msgs = rec["messages"]
    # the starting text as received
    want = open(os.path.join(START, key["id"] + ".txt"), encoding="utf-8").read()
    got = msgs[0]["text"] if msgs else ""
    out["start_text_exact"] = (got == want) or (got.strip() == want.strip())
    reading = set(REPO_IN_READER + f for f in key["files"])
    outdir = f"/home/user/out/{key['id']}"
    # calls outside the reading set
    outside, searched, used_worker = [], False, False
    for c in calls:
        js = json.dumps(c["input"])
        if c["tool"] in ("Agent", "Task"):
            used_worker = True
        if c["tool"] == "Read":
            p = c.get("file", "")
            if p not in reading and not p.startswith("/home/user/out/"):
                outside.append(p)
        elif c["tool"] in ("Bash", "Grep", "Glob"):
            paths = re.findall(r"reading2/([a-z0-9]{6})", js)
            if any(p != key["id"] for p in paths):
                outside.append(js[:200])
            if c["tool"] == "Bash" and re.search(r"\b(cat|head|tail|less|more|sed|awk)\b[^|;&]*\b(CLAUDE\.md|README\.md|physics/|src/probe|\.claude/|process/config)", js):
                outside.append(js[:200])
        elif c["tool"].startswith("mcp__") or c["tool"] in ("WebFetch", "WebSearch"):
            outside.append(c["tool"])
        if c["tool"] == "Grep" and any(f in js for f in key["files"] + [f"reading2/{key['id']}"]):
            searched = True
        if c["tool"] == "Bash" and SEARCH.search(c["input"].get("command", "")) and f"reading2/{key['id']}" in js:
            searched = True
    out["opened_outside"] = outside
    out["used_worker"] = used_worker
    # coverage
    if key["files"]:
        whole = all(v["longest_missing_run"] < 3 for v in rec["coverage"].values())
        out["coverage"] = "read whole" if whole else ("searched" if searched else "read in part")
        out["searched_at_all"] = searched
        out["lines"] = sum(v["lines"] for v in rec["coverage"].values())
        out["lines_received"] = sum(v["received"] for v in rec["coverage"].values())
        rc = [c for c in calls if c["tool"] == "Read" and c.get("file") in reading]
        out["reads"] = len(rc)
        out["reads_refused"] = sum(1 for c in rc if c.get("error") or not c.get("lines_returned"))
        cut = 0
        for c in rc:
            if c.get("lines_returned") and c.get("total_lines") and "limit" not in c["input"]:
                if (c.get("first_line") or 1) + c["lines_returned"] - 1 < c["total_lines"] - 1:
                    cut += 1
        out["reads_cut"] = cut
        if not whole:
            last = rc[-1] if rc else None
            if last is None:
                out["before_skip"] = "no read at all"
            elif last.get("error") or not last.get("lines_returned"):
                out["before_skip"] = "a refused read"
            elif "limit" not in last["input"] and (last.get("first_line") or 1) + last["lines_returned"] - 1 < (last.get("total_lines") or 0) - 1:
                out["before_skip"] = "a cut read"
            else:
                out["before_skip"] = "nothing"
    else:
        out["coverage"] = "not applicable"
    # the files written
    files = {}
    after = [c for c in calls if c["after_messages"] >= 2]
    tail_calls = [c for c in calls if c["tool"] == "Bash" and "tail -n +1 /home/user/out" in c["input"].get("command", "")]
    if tail_calls:
        files = parse_tail(tail_calls[-1].get("output", ""))
    if not files:
        out["flags"].append("files not printed; taken from the write calls")
        for c in calls:
            if c["tool"] == "Write" and c["input"].get("file_path", "").startswith(outdir):
                files[c["input"]["file_path"]] = c["input"].get("content", "").rstrip("\n")
    out["files_written"] = sorted(os.path.basename(f) for f in files)
    script = [f for f in files if f.endswith(".py")]
    notes = [f for f in files if f.endswith(".md")]
    v = key["values"]
    note_text = "\n".join(files[f] for f in notes)
    note_lines = [l.strip() for l in note_text.split("\n")]
    closing = None
    rules = {}
    for it in key["placed"]:
        if it["what"] != "rule":
            continue
        rk, val = it["rule"], it["value"]
        if rk == "first_line":
            ok = bool(files) and all(t.split("\n")[0].strip() == val for t in files.values())
        elif rk == "handover_last":
            ok = bool(notes) and all([l for l in files[f].split("\n") if l.strip()][-1].strip() == val for f in notes if files[f].strip())
        elif rk == "handover_name":
            ok = len(notes) >= 1 and all(os.path.basename(f) == val for f in notes)
        elif rk == "handover_line":
            ok = val in note_lines
        elif rk == "script_last":
            closing = val
            ok = None
        rules[it["place"]] = {"rule": rk, "kept": ok}
    work_ok, closing_ok, detail = (False, None, ["no script written"])
    if script:
        work_ok, closing_ok, detail = check_work(key["task"], files[script[0]], closing)
    for place, r in rules.items():
        if r["rule"] == "script_last":
            r["kept"] = bool(closing_ok)
    changed = (f"reviewer: {v['name_b']}" in note_lines) and (v["name_a"] not in note_text)
    out["rules"] = rules
    out["changed_rule_followed"] = changed
    out["changed_rule_old_name_written"] = v["name_a"] in note_text
    out["rules_kept"] = all(r["kept"] for r in rules.values()) and changed
    out["work_correct"] = bool(work_ok) and bool(notes)
    out["work_detail"] = detail[:2]
    # the answers after the second message
    extra_tools = [c for c in after if not (c["tool"] == "Bash" and "tail -n +1 /home/user/out" in c["input"].get("command", ""))]
    out["tools_after_questions"] = len(extra_tools)
    ans = "\n".join(t["text"] for t in rec["texts"] if t["after_messages"] >= 2)
    out["answers_raw"] = ans
    m = re.search(r"entries\s*[=:]\s*(\d+).{0,40}?total\s*[=:]\s*(\d+)", ans, re.S | re.I)
    out["count_answer"] = [int(m.group(1)), int(m.group(2))] if m else None
    out["count_right"] = bool(m) and int(m.group(1)) == key["count"]["entries"] and int(m.group(2)) == key["count"]["total"]
    facts = []
    for q in key.get("facts", []):
        mm = re.search(r"(?m)^\s*\**" + re.escape(q["id"]) + r"\b[.:)\*]*\s*(.*)$", ans)
        a = mm.group(1) if mm else ""
        facts.append({"id": q["id"], "zone": q["zone"], "right": any(x.lower() in a.lower() for x in q["accept"])})
    out["facts"] = facts
    out["facts_right"] = sum(f["right"] for f in facts)
    # tokens
    ctx = rec.get("context_by_request") or []
    first_turn = [c for c in ctx if not msgs or len(msgs) < 2 or c[0] < msgs[1]["at"]]
    out["tokens_at_first_request"] = ctx[0][1] if ctx else None
    out["tokens_at_end_of_work"] = first_turn[-1][1] if first_turn else None
    out["tokens_at_end"] = ctx[-1][1] if ctx else None
    out["usage"] = rec.get("usage")
    # verdicts
    aside = []
    if not out["start_text_exact"]:
        aside.append("starting text differs")
    if outside:
        aside.append("opened a file outside its reading set")
    if used_worker:
        aside.append("used a worker")
    if rec.get("status") not in ("SESSION_STATUS_IDLE", None):
        aside.append("session not idle: " + str(rec.get("status")))
    if len(msgs) < 2:
        aside.append("second message not delivered")
    out["set_aside"] = aside
    cov_ok = out["coverage"] in ("read whole", "not applicable")
    if out["tools_after_questions"]:
        out["flags"].append("used a tool after the questions; count and facts set aside")
    out["passes"] = bool(cov_ok and out["rules_kept"] and out["work_correct"] and out["count_right"]
                         and not out["tools_after_questions"])
    return out


def score(out_dir, scores_path):
    res = []
    for f in sorted(glob.glob(os.path.join(out_dir, "*.json"))):
        rec = json.load(open(f))
        key = json.load(open(os.path.join(KEYS, rec["trial"] + ".json")))
        res.append(score_run(rec, key))
    json.dump(res, open(scores_path, "w"), indent=1)
    for r in res:
        rk = " ".join(f"{p[0]}:{'Y' if x['kept'] else 'n'}" for p, x in r["rules"].items())
        print(f"{r['run']:12} {r['ladder']:6} {r['size']:>7} {str(r['model'])[7:13]:6} {r['coverage']:14} "
              f"rules[{rk} chg:{'Y' if r['changed_rule_followed'] else 'n'}] work:{'Y' if r['work_correct'] else 'n'} "
              f"count:{'Y' if r['count_right'] else 'n'} facts:{r['facts_right']}/{len(r['facts'])} "
              f"tok:{r['tokens_at_end_of_work']} {'PASS' if r['passes'] else 'fail'} {';'.join(r['set_aside'])} {';'.join(r['flags'])}")


if __name__ == "__main__":
    if sys.argv[1] == "collect":
        collect(sys.argv[2], sys.argv[3])
    else:
        score(sys.argv[2], sys.argv[3])
