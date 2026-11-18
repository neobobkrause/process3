#!/usr/bin/env python3
"""Build trials for the second reading measurement.

Cuts real texts from the corpus, places the passages (three rules, one changed rule, a count),
writes the readers' files into the readers' branch, and the key and starting text into the
private folder. Everything is drawn from a seed, so a trial can be rebuilt.

  build.py single SIZE FIRST COUNT          one text of SIZE bytes
  build.py set TOTAL PIECE FIRST COUNT      a set of TOTAL bytes in files of about PIECE bytes
  build.py start SIZE FIRST COUNT           a role's starting text of SIZE bytes
"""
import hashlib
import json
import os
import random
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tasks import TASKS, TASK_ORDER  # noqa: E402

CORPUS = "/home/user/r2/corpus"
GROUND = "/home/user/process3-probes"          # readers' branch working copy
PRIV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = os.path.join(PRIV, "keys")
START = os.path.join(PRIV, "start")
ALLOC = os.path.join(PRIV, "alloc")
SEED = "reading2-18nov2026"

KINDS = ["requirements", "principles", "design", "code", "logs"]
QUOTA = ["requirements", "requirements", "principles", "principles", "design", "design",
         "code", "code", "logs", "logs"]
PROSE_EXT = (".md", ".txt")

LEADS = [
    "Rule for jobs:", "Every job must note:", "Binding on all jobs:",
    "Jobs working from this file, take note:", "A requirement on what a job hands in:",
    "To be kept by any job that works from this text:", "Note for jobs, in force until withdrawn:",
    "Kept by every job without exception:",
]
WORDS = ("larkspur tamarind quillon bramblewick ostler varnish hollowell pemberley cinnabar "
         "saltmarsh drumlin fennimore galloway harrowgate ironbark juniper kestrel lodestone "
         "marlowe nettlecombe orrery pennant quarrystone rosehip sandalwood thistledown umberfield "
         "vetiver wainscot yarrow zephyrine alderney bellwether copperfield dunmore elderwood "
         "foxglove greywether").split()
NAMES = ["Maren Oduya", "Tobias Hallworth", "Ines Carrowby", "Soren Achterberg", "Priya Venkataram",
         "Calum Drysdale", "Odette Fairweather", "Mikko Rantanen", "Lucinda Abernathy",
         "Emeka Nwosuagwu", "Greta Lindqvist", "Hamish Colquhoun", "Yasmin Benhaddou",
         "Ruairi Mactavish", "Annelise Brouwer", "Dmitri Volkonsky", "Saoirse Kinsella",
         "Bartholomew Finch-Hatton", "Noor Al-Tamimi", "Jacinta Ravensworth", "Kwabena Asantewaa",
         "Liesel Hartmannsdorf", "Octavio Montenegro", "Tamsin Polkinghorne"]
PLACES = ["Varnel", "Osk", "Tamsin Row", "Hale End", "Corrie", "Lund", "Marsh Lane", "Pell",
          "Quay Nine", "Rigg", "Stane", "Thorpe", "Uller", "Wick", "Yarm", "Brae", "Dunn", "Eyre"]
FAMILIES = {
    "fruit": "pears plums quinces apricots figs cherries lemons mangoes peaches limes".split(),
    "birds": "herons wrens finches plovers swifts owls larks gulls robins cranes".split(),
    "hand tools": "hammers chisels wrenches pliers handsaws rasps mallets spanners awls trowels".split(),
    "musical instruments": "violins flutes cellos oboes harps trumpets banjos bassoons clarinets tubas".split(),
    "fish": "trout herring cod carp pike eels salmon perch mackerel bream".split(),
    "trees": "oaks elms birches cedars maples willows pines beeches larches alders".split(),
    "gemstones": "rubies opals garnets topazes emeralds sapphires pearls agates amethysts zircons".split(),
    "vegetables": "carrots leeks turnips beets onions radishes parsnips marrows cabbages shallots".split(),
}
COUNT_TEMPLATES = [
    "{n} {m} were logged at the {p} gate.",
    "The {p} store took in {n} {m}.",
    "A box of {n} {m} came through {p}.",
    "{p} desk entered {n} {m} on the sheet.",
    "Tally for {p}: {n} {m}.",
    "Received at {p}, {n} {m}.",
    "At {p} the clerk wrote down {n} {m}.",
    "{p} sent word of {n} {m} on hand.",
]


def rng_for(*parts):
    h = hashlib.sha256(("|".join(str(p) for p in (SEED,) + parts)).encode()).hexdigest()
    return random.Random(int(h[:16], 16))


def load_corpus():
    docs = []
    with open(os.path.join(CORPUS, "manifest.tsv"), encoding="utf-8") as f:
        next(f)
        for line in f:
            kind, rel, nbytes, nlines, ref, src, sha = line.rstrip("\n").split("\t")
            ext = os.path.splitext(rel)[1]
            if kind == "code" and ext != ".mjs":
                continue
            if kind != "code" and ext not in PROSE_EXT:
                continue
            with open(os.path.join(CORPUS, rel), encoding="utf-8", errors="replace") as g:
                text = g.read()
            text = text.replace("\r\n", "\n")
            if not text.endswith("\n"):
                text += "\n"
            if kind != "code" and re.search(r"reading_measurements|RERUN_PROMPT|second measurement", text):
                continue
            docs.append({"kind": kind, "rel": rel, "src": f"{ref}:{src}", "text": text,
                         "bytes": len(text.encode("utf-8"))})
    return docs


def blen(s):
    return len(s.encode("utf-8"))


def para_starts(lines):
    """Indexes at which a paragraph (or block) starts: line 0 and any line after a blank line."""
    out = [0]
    for i in range(1, len(lines)):
        if lines[i - 1].strip() == "" and lines[i].strip() != "":
            out.append(i)
    return out


def span_from_doc(doc, size, rng, taken):
    """A run of whole lines of about `size` bytes from one document, not overlapping `taken`."""
    lines = doc["text"].splitlines(keepends=True)
    lens = [blen(l) for l in lines]
    total = sum(lens)
    if total < size * 0.985:
        return None
    cum = [0]
    for n in lens:
        cum.append(cum[-1] + n)
    starts = [i for i in para_starts(lines) if total - cum[i] >= size * 0.985]
    rng.shuffle(starts)
    for s in starts:
        e = s
        while e < len(lines) and cum[e] - cum[s] < size * 0.99:
            e += 1
        if cum[e] - cum[s] > size * 1.03:
            continue
        if any(not (e <= a or s >= b) for a, b in taken):
            continue
        return s, e, "".join(lines[s:e])
    return None


def header(kind, name):
    if kind == "code":
        return f"\n// ===== file: {name} =====\n\n"
    return f"\n\n# [file] {name}\n\n"


def short_name(rel):
    base = rel.split("/", 1)[1].split("__")[-1]
    return base


def joining(docs, kind, size, rng, used_docs):
    """Whole documents of one kind joined to about `size` bytes; the last is trimmed at a line."""
    pool = [d for d in docs if d["kind"] == kind and d["rel"] not in used_docs]
    if sum(d["bytes"] for d in pool) < size:
        return None
    rng.shuffle(pool)
    parts, members, total = [], [], 0
    for d in pool:
        h = header(kind, short_name(d["rel"]))
        room = size - total - blen(h)
        if room < 2000:
            break
        if d["bytes"] <= room:
            body = d["text"]
            members.append({"doc": d["rel"], "lines": "all"})
        else:
            lines = d["text"].splitlines(keepends=True)
            acc, n = [], 0
            for l in lines:
                if n + blen(l) > room:
                    break
                acc.append(l)
                n += blen(l)
            body = "".join(acc)
            members.append({"doc": d["rel"], "lines": f"1-{len(acc)}"})
        parts.append(h + body)
        total += blen(h) + blen(body)
        if total >= size * 0.985:
            break
    text = "".join(parts).lstrip("\n")
    if blen(text) < size * 0.97:
        return None
    return text, members


def load_alloc(name):
    p = os.path.join(ALLOC, name + ".json")
    return json.load(open(p)) if os.path.exists(p) else {}


def save_alloc(name, a):
    os.makedirs(ALLOC, exist_ok=True)
    json.dump(a, open(os.path.join(ALLOC, name + ".json"), "w"), indent=1, sort_keys=True)


def choose_single(docs, kind, size, rng, alloc):
    """Pick the text for one trial. alloc maps index -> {kind, members:[{doc,s,e}]} at this size."""
    used_docs = set()
    taken = {}
    for a in alloc.values():
        for m in a["members"]:
            used_docs.add(m["doc"])
            if "s" in m:
                taken.setdefault(m["doc"], []).append((m["s"], m["e"]))
    order = [kind] + [k for k in ("design", "code") if k != kind]
    for k in order:
        cands = [d for d in docs if d["kind"] == k and d["bytes"] >= size * 0.985]
        fresh = [d for d in cands if d["rel"] not in used_docs]
        rng.shuffle(fresh)
        for d in fresh:
            got = span_from_doc(d, size, rng, [])
            if got:
                s, e, text = got
                return k, text, [{"doc": d["rel"], "s": s, "e": e}], "one document"
        j = joining(docs, k, size, rng, used_docs)
        if j:
            text, members = j
            return k, text, members, "joined documents"
        stale = [d for d in cands if d["rel"] in used_docs]
        rng.shuffle(stale)
        for d in stale:
            got = span_from_doc(d, size, rng, taken.get(d["rel"], []))
            if got:
                s, e, text = got
                return k, text, [{"doc": d["rel"], "s": s, "e": e}], "another part of a document used at this size"
    for k in order:
        j = joining(docs, k, size, rng, set())
        if j:
            return k, j[0], j[1], "joined documents, some of them also in another text at this size"
    return None


# ---------- placing passages ----------

def wrap_passage(kind, body):
    if kind == "code":
        # break only at spaces outside backticks, so a placed value is never split over lines
        words = re.findall(r"`[^`]*`[^\s]*|\S+", body)
        out, cur = [], "//"
        for w in words:
            if len(cur) + 1 + len(w) > 100 and cur != "//":
                out.append(cur)
                cur = "//"
            cur += " " + w
        out.append(cur)
        if len(body) <= 110 and "`" not in body:
            out = ["// " + body]
        return "\n" + "\n".join(out) + "\n\n"
    return "\n" + body + "\n\n"


def insertion_points(lines, kind):
    """Line indexes before which a passage may go: after a blank line, outside a fenced block."""
    pts = []
    fence = False
    for i, l in enumerate(lines):
        if i > 0 and lines[i - 1].strip() == "" and not fence and l.strip() != "":
            pts.append(i)
        if kind != "code" and l.lstrip().startswith("```"):
            fence = not fence
    if len(pts) < 20:
        pts = list(range(1, len(lines)))
    return pts


def place(text, kind, items):
    """items: list of dicts with 'frac' (0..1) and 'body'. Returns new text; sets item['line']."""
    lines = text.splitlines(keepends=True)
    lens = [blen(l) for l in lines]
    cum = [0]
    for n in lens:
        cum.append(cum[-1] + n)
    total = cum[-1]
    pts = insertion_points(lines, kind)
    allpts = list(range(1, len(lines)))
    used = set()
    for it in items:
        target = it["frac"] * total
        lo, hi = it.get("lo"), it.get("hi")
        cands = [p for p in pts if p not in used]
        if lo is not None:
            band = [p for p in cands if lo * total <= cum[p] <= hi * total]
            if not band:
                band = [p for p in allpts if p not in used and lo * total <= cum[p] <= hi * total]
            if band:
                cands = band
            else:
                it["out_of_band"] = True
        if not cands:
            cands = [p for p in allpts if p not in used]
        best = min(cands, key=lambda p: abs(cum[p] - target))
        used.add(best)
        it["_at"] = best
        it["frac_actual"] = round(cum[best] / total, 4)
    for it in sorted(items, key=lambda x: -x["_at"]):
        lines[it["_at"]:it["_at"]] = [wrap_passage(kind, it["body"])]
    new = "".join(lines)
    newlines = new.split("\n")
    for it in items:
        probe = it["probe"]
        hits = [i + 1 for i, l in enumerate(newlines) if probe in l]
        it["line"] = hits[0] if hits else None
        it["hits"] = len(hits)
        del it["_at"]
    return new


def absent(word, hay):
    return re.search(r"\b" + re.escape(word.lower()) + r"\b", hay) is None


def draw_values(rng, hay):
    """Draw the placed values, none of which occurs in the text (hay is lower-cased text)."""
    def code():
        L = "ABCDEFGHJKLMNPQRSTUVWXYZ"
        return f"{rng.choice(L)}{rng.randint(2, 9)}{rng.choice(L)}-{rng.randint(1000, 9999)}"
    words = [w for w in WORDS if absent(w, hay)]
    names = [n for n in NAMES if absent(n, hay) and absent(n.split()[-1], hay)]
    rng.shuffle(words)
    rng.shuffle(names)
    fams = [f for f in FAMILIES if absent(f, hay)]
    rng.shuffle(fams)
    for fam in fams:
        members = [m for m in FAMILIES[fam] if absent(m, hay) and absent(m.rstrip("s"), hay)]
        if len(members) >= 6:
            break
    else:
        raise RuntimeError("no family of things is absent from this text")
    rng.shuffle(members)
    return {"code1": code(), "code2": code(), "w_last": words[0], "w_name": words[1],
            "w_desk": words[2], "name_a": names[0], "name_b": names[1],
            "family": fam, "members": members}


def rule_bodies(v):
    return {
        "first_line": (f"every file the job writes begins with this exact first line: `# ref {v['code1']}`",
                       f"# ref {v['code1']}"),
        "handover_last": (f"the job's handover note ends with this exact last line: `-- filed under {v['w_last']}`",
                          f"-- filed under {v['w_last']}"),
        "handover_name": (f"the job's handover note is saved under the file name `{v['w_name']}-relay.md`, and under no other name",
                          f"{v['w_name']}-relay.md"),
        "script_last": (f"any script the job writes prints this exact line as the very last line of its output: `run closed {v['code2']}`",
                        f"run closed {v['code2']}"),
        "handover_line": (f"the job's handover note carries, on a line of its own, exactly: `desk: {v['w_desk']}`",
                          f"desk: {v['w_desk']}"),
    }


def make_items(rng, v, kmax=6):
    """The passages for one trial, with the fraction of the text at which each goes."""
    rb = rule_bodies(v)
    kinds = list(rb)
    rng.shuffle(kinds)
    leads = LEADS[:]
    rng.shuffle(leads)
    items = []
    for place_name, lo, hi, rk in (("early", 0.02, 0.10, kinds[0]), ("middle", 0.45, 0.55, kinds[1]),
                                   ("end", 0.90, 0.98, kinds[2])):
        body, probe = rb[rk]
        items.append({"what": "rule", "place": place_name, "rule": rk, "value": probe,
                      "lo": {"early": 0.0, "middle": 0.45, "end": 0.90}[place_name],
                      "hi": {"early": 0.10, "middle": 0.55, "end": 1.0}[place_name],
                      "frac": rng.uniform(lo, hi), "body": f"{leads.pop()} {body}.", "probe": probe})
    fo = rng.uniform(0.12, 0.40)
    fc = rng.uniform(fo + 0.25, 0.88)
    items.append({"what": "changed-original", "frac": fo, "value": f"reviewer: {v['name_a']}",
                  "body": f"{leads.pop()} the job's handover note names its reviewer on a line of its own, exactly: `reviewer: {v['name_a']}`.",
                  "probe": f"`reviewer: {v['name_a']}`"})
    items.append({"what": "changed-later", "frac": fc, "value": f"reviewer: {v['name_b']}",
                  "body": f"{leads.pop()} the reviewer for jobs has changed. Handover notes now carry the line `reviewer: {v['name_b']}`, and the name {v['name_a']} is no longer written anywhere in a handover note.",
                  "probe": f"`reviewer: {v['name_b']}`"})
    k = rng.randint(3, kmax)
    places = PLACES[:]
    rng.shuffle(places)
    temps = COUNT_TEMPLATES[:]
    rng.shuffle(temps)
    nums = rng.sample(range(2, 20), k)
    for i in range(k):
        m = v["members"][i]
        sent = temps[i].format(n=nums[i], m=m, p=places[i])
        sent = sent[0].upper() + sent[1:]
        items.append({"what": "count", "member": m, "n": nums[i],
                      "frac": 0.03 + 0.94 * (i + rng.random()) / k, "body": sent, "probe": sent})
    return items, {"entries": k, "total": sum(nums)}


def trial_id(*parts):
    r = rng_for("id", *parts)
    return "".join(r.choice("abcdefghjkmnpqrstuvwxyz") for _ in range(2)) + \
           "".join(r.choice("23456789abcdefghjkmnpqrstuvwxyz") for _ in range(4))


def task_block(tid, task_id, source_word):
    t = TASKS[task_id]
    out = f"/home/user/out/{tid}"
    return (
        f"1. Write a Python 3 script at {out}/{t['script']}. {t['spec']}\n"
        f"2. Write a handover note for the next session, as a Markdown file of at most ten lines in "
        f"the folder {out}: what you did and where the files are.\n"
        f"3. Follow every standing instruction {source_word} gives for a job's output.\n"
        f"4. Do the reading and the work yourself, without workers (subagents). Change nothing in "
        f"the repository: no edits, commits or pushes there.\n\n"
        f"Reply \"finished\" when the files are written."
    )


def start_text_reading(tid, files, task_id):
    lst = "\n".join(f"- {f}" for f in files)
    return ("You are starting a job in this repository. Its branch is already checked out.\n\n"
            f"Reading set (read each file whole):\n{lst}\n\n"
            "Task:\n" + task_block(tid, task_id, "the reading set") + "\n")


def count_question(fam):
    return (f"Across everything you were given to read, how many separate entries record a "
            f"quantity of some kind of {fam}, and what do those quantities add up to? "
            f"Answer as: entries=<number> total=<number>")


def soundness(key, texts, start_text):
    """Script checks of section 11.1. Returns a list of faults (empty when sound)."""
    faults = []
    whole = "\n".join(texts.values())
    for it in key["placed"]:
        if it.get("hits") != 1 or whole.count(it["probe"]) != 1:
            faults.append(f"placed value not exactly once: {it['probe']!r}")
    if key["ladder"] != "set":
        for it in key["placed"]:
            if it.get("out_of_band"):
                faults.append(f"passage outside its place: {it.get('place')}")
        o = [it for it in key["placed"] if it["what"] == "changed-original"][0]
        c = [it for it in key["placed"] if it["what"] == "changed-later"][0]
        if c["frac_actual"] - o["frac_actual"] < 0.2:
            faults.append("changed rule's two passages closer than a fifth of the text")
    fam = key["values"]["family"]
    if not absent(fam, whole.lower()):
        faults.append(f"family word occurs in text: {fam}")
    for it in key["placed"]:
        if it.get("value") and it["value"] in start_text:
            faults.append(f"placed value appears in the starting text: {it['value']}")
    return faults


def write_trial(key, files, start_text):
    tid = key["id"]
    for rel, text in files.items():
        p = os.path.join(GROUND, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
    os.makedirs(KEYS, exist_ok=True)
    os.makedirs(START, exist_ok=True)
    json.dump(key, open(os.path.join(KEYS, tid + ".json"), "w"), indent=1)
    with open(os.path.join(START, tid + ".txt"), "w", encoding="utf-8") as f:
        f.write(start_text)


FILE_NAME = {"requirements": "requirements.md", "principles": "principles.md", "design": "design.md",
             "code": "module.mjs", "logs": "log.md"}


def build_single(docs, size, first, count):
    alloc = load_alloc(f"single-{size}")
    for idx in range(first, first + count):
        if str(idx) in alloc:
            print("exists", size, idx, alloc[str(idx)]["id"])
            continue
        done = False
        for attempt in range(8):
            rng = rng_for("single", size, idx, attempt)
            want = QUOTA[idx % 10]
            got = choose_single(docs, want, size - 1000, rng, alloc)
            if not got:
                break
            kind, text, members, how = got
            tid = trial_id("single", size, idx)
            v = draw_values(rng, text.lower())
            items, count_key = make_items(rng, v)
            text2 = place(text, kind, items)
            rel = f"reading2/{tid}/{FILE_NAME[kind]}"
            task_id = TASK_ORDER[(idx + size // 12000) % 8]
            st = start_text_reading(tid, [rel], task_id)
            for it in items:
                it["file"] = rel
            key = {"id": tid, "ladder": "single", "size": size, "index": idx, "kind": kind,
                   "kind_wanted": want, "how": how, "members": members, "files": [rel],
                   "bytes": blen(text2), "lines": text2.count("\n"), "task": task_id, "values": v,
                   "placed": items, "count": count_key, "count_question": count_question(v["family"]),
                   "facts": []}
            f = soundness(key, {rel: text2}, st)
            if not f:
                done = True
                break
        if not done:
            print("NO TEXT", size, idx)
            continue
        write_trial(key, {rel: text2}, st)
        alloc[str(idx)] = {"id": tid, "kind": kind, "members": members}
        print("built", "single", size, idx, tid, kind, how, blen(text2))
    save_alloc(f"single-{size}", alloc)


def piece_pool(docs, piece, rng):
    """Cut the whole corpus into pieces of about `piece` bytes. A large document gives several
    pieces, cut at paragraph starts. Smaller documents of one kind, and the tails of large ones,
    are laid end to end under their names and cut the same way. No two pieces share a line."""
    pool = []
    for kind in KINDS:
        ds = [d for d in docs if d["kind"] == kind]
        rng.shuffle(ds)
        stream = []                      # (doc, first line index, lines)
        for d in ds:
            lines = d["text"].splitlines(keepends=True)
            if d["bytes"] >= piece * 1.6:
                starts = set(para_starts(lines))
                acc, n, s0 = [], 0, 0
                for i, l in enumerate(lines):
                    if n >= piece * 0.98 and (i in starts or n >= piece * 1.02):
                        pool.append({"kind": kind, "text": "".join(acc),
                                     "members": [{"doc": d["rel"], "s": s0, "e": i}],
                                     "name": short_name(d["rel"])})
                        acc, n, s0 = [], 0, i
                    acc.append(l)
                    n += blen(l)
                if n >= 3000:
                    stream.append((d, s0, acc))
            else:
                stream.append((d, 0, lines))
        acc, members, n = [], [], 0
        for d, s0, lines in stream:
            name = short_name(d["rel"])
            h = header(kind, name if s0 == 0 else name + " (later part)")
            acc.append(h)
            n += blen(h)
            first = s0
            for j, l in enumerate(lines):
                if n >= piece * 0.99:
                    members.append({"doc": d["rel"], "s": first, "e": s0 + j})
                    pool.append({"kind": kind, "text": "".join(acc).lstrip("\n"), "members": members,
                                 "name": members[0]["doc"].split("__")[-1] if len(members) == 1 else "joined"})
                    h2 = header(kind, name + " (continued)")
                    acc, members, n, first = [h2], [], blen(h2), s0 + j
                acc.append(l)
                n += blen(l)
            members.append({"doc": d["rel"], "s": first, "e": s0 + len(lines)})
    return pool


def slug(name):
    s = re.sub(r"\.[a-z]+$", "", name.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:28] or "text"


def build_set(docs, total, piece, first, count):
    n_files = total // piece
    name = f"set-{total}-{piece}"
    alloc = load_alloc(name)
    rng0 = rng_for("pool", total, piece)
    pool = piece_pool(docs, piece, rng0)
    rng0.shuffle(pool)
    # deal the pool into sets in a fixed order, so a set's files never depend on which sets are built
    need = n_files * 30
    reuse = len(pool) < n_files * (first + count)
    deck = pool[:]
    while len(deck) < need:
        extra = pool[:]
        rng0.shuffle(extra)
        deck += extra
    for idx in range(first, first + count):
        if str(idx) in alloc:
            print("exists", name, idx, alloc[str(idx)]["id"])
            continue
        rng = rng_for("set", total, piece, idx)
        pieces = deck[idx * n_files:(idx + 1) * n_files]
        rng.shuffle(pieces)
        tid = trial_id("set", total, piece, idx)
        whole = "\n".join(p["text"] for p in pieces).lower()
        v = draw_values(rng, whole)
        items, count_key = make_items(rng, v)
        # which file each passage goes in
        mid = n_files // 2
        per_file = {i: [] for i in range(n_files)}
        counts = [it for it in items if it["what"] == "count"]
        for it in items:
            if it["what"] == "rule":
                if it["place"] == "early":
                    fi, lo, hi = 0, 0.10, 0.90
                elif it["place"] == "end":
                    fi, lo, hi = n_files - 1, (0.60 if n_files == 2 else 0.10), 0.95
                else:
                    fi = mid
                    lo, hi = (0.02, 0.30) if n_files == 2 else (0.10, 0.90)
            elif it["what"] == "changed-original":
                fi = rng.randrange(0, max(1, mid))
                lo, hi = 0.10, 0.90
            elif it["what"] == "changed-later":
                fi = rng.randrange(mid, n_files) if n_files > 2 else 1
                lo, hi = (0.35, 0.55) if n_files == 2 else (0.10, 0.90)
            else:
                j = counts.index(it)
                fi = min(n_files - 1, int((j + rng.random()) * n_files / len(counts)))
                lo, hi = 0.05, 0.95
            it["frac"] = rng.uniform(lo, hi)
            it["file_index"] = fi
            per_file[fi].append(it)
        files, rels = {}, []
        for i, p in enumerate(pieces):
            ext = "mjs" if p["kind"] == "code" else "md"
            rel = f"reading2/{tid}/{i + 1:02d}-{slug(p['name'])}.{ext}"
            text = place(p["text"], p["kind"], per_file[i]) if per_file[i] else p["text"]
            for it in per_file[i]:
                it["file"] = rel
            files[rel] = text
            rels.append(rel)
        task_id = TASK_ORDER[(idx + total // 96000 + piece // 12000) % 8]
        st = start_text_reading(tid, rels, task_id)
        key = {"id": tid, "ladder": "set", "size": total, "piece": piece, "n_files": n_files,
               "index": idx, "files": rels, "file_kinds": [p["kind"] for p in pieces],
               "members": [p["members"] for p in pieces], "pool_reused": reuse,
               "bytes": sum(blen(t) for t in files.values()),
               "lines": sum(t.count("\n") for t in files.values()),
               "task": task_id, "values": v, "placed": items, "count": count_key,
               "count_question": count_question(v["family"]), "facts": []}
        f = soundness(key, files, st)
        if f:
            print("UNSOUND", tid, f)
            continue
        write_trial(key, files, st)
        alloc[str(idx)] = {"id": tid, "members": [m for p in pieces for m in p["members"]]}
        print("built", name, idx, tid, n_files, "files", key["bytes"], "reuse" if reuse else "")
    save_alloc(name, alloc)


def build_start(docs, size, first, count):
    alloc = load_alloc(f"start-{size}")
    for idx in range(first, first + count):
        if str(idx) in alloc:
            print("exists start", size, idx, alloc[str(idx)]["id"])
            continue
        tid = trial_id("start", size, idx)
        task_id = TASK_ORDER[(idx + size // 4096) % 8]
        head = ("You are starting in a role. This message is your starting text: your role's "
                "principles first, then your first job.\n\n== Role principles ==\n\n")
        tail = "\n== Your first job ==\n\n" + task_block(tid, task_id, "your starting text") + "\n"
        allowance = 1350
        done = False
        for attempt in range(12):
            rng = rng_for("start", size, idx, attempt)
            body_size = size - blen(head) - blen(tail) - allowance
            used_docs = {m["doc"] for a_ in alloc.values() for m in a_["members"]}
            got = None
            for kind in ("principles", "requirements", "design"):
                cands = [d for d in docs if d["kind"] == kind and d["bytes"] >= body_size * 0.985
                         and d["rel"] not in used_docs]
                rng.shuffle(cands)
                for d in cands:
                    sp = span_from_doc(d, body_size, rng, [])
                    if sp:
                        got = (kind, sp[2], [{"doc": d["rel"], "s": sp[0], "e": sp[1]}], "one document")
                        break
                if got:
                    break
                j = joining(docs, kind, body_size, rng, used_docs)
                if j:
                    got = (kind, j[0], j[1], "joined documents")
                    break
            if not got:
                break
            kind, text, members, how = got
            if text.count("\n") < 40:
                # a very short text may have too few lines to place passages between: one sentence a line
                text = re.sub(r"(?<=[.!?:]) +", "\n", text)
            v = draw_values(rng, text.lower())
            items, count_key = make_items(rng, v, kmax=3 if size <= 8192 else 6)
            text2 = place(text, "prose", items)
            st = head + text2 + tail
            for it in items:
                it["file"] = "(starting text)"
            key = {"id": tid, "ladder": "start", "size": size, "index": idx, "kind": kind, "how": how,
                   "members": members, "files": [], "bytes": blen(st), "lines": st.count("\n"),
                   "task": task_id, "values": v, "placed": items, "count": count_key,
                   "count_question": count_question(v["family"]), "facts": []}
            faults = soundness(key, {"start": st}, "")
            off = blen(st) - size
            if abs(off) > size * 0.02:
                allowance += off
                continue
            if not faults:
                done = True
                break
        if not done:
            print("NO TEXT start", size, idx)
            continue
        write_trial(key, {}, st)
        alloc[str(idx)] = {"id": tid, "kind": kind, "members": members}
        print("built start", size, idx, tid, kind, how, blen(st))
    save_alloc(f"start-{size}", alloc)


if __name__ == "__main__":
    docs = load_corpus()
    a = sys.argv[1:]
    if a[0] == "single":
        build_single(docs, int(a[1]), int(a[2]), int(a[3]))
    elif a[0] == "set":
        build_set(docs, int(a[1]), int(a[2]), int(a[3]), int(a[4]))
    elif a[0] == "start":
        build_start(docs, int(a[1]), int(a[2]), int(a[3]))
    elif a[0] == "pool":
        import collections
        pool = piece_pool(docs, int(a[1]), rng_for("pool", 0, int(a[1])))
        c = collections.Counter(p["kind"] for p in pool)
        print(len(pool), dict(c), sum(blen(p["text"]) for p in pool))
