"""The bank of small work tasks: specification text, reference answer, hidden cases.

Kept out of the readers' reach. A reader sees only the specification text.
"""
import re
import subprocess
import sys
import tempfile
import os
from collections import Counter


def ref_sumby(inp):
    tot = {}
    for line in inp.splitlines():
        line = line.strip()
        if not line:
            continue
        name, amount = line.rsplit(",", 1)
        tot[name] = tot.get(name, 0) + int(amount)
    return "\n".join(f"{k} {tot[k]}" for k in sorted(tot))


def ref_merge(inp):
    iv = []
    for line in inp.splitlines():
        if line.strip():
            a, b = line.split()
            iv.append((int(a), int(b)))
    iv.sort()
    out = []
    for a, b in iv:
        if out and a <= out[-1][1] + 1:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return "\n".join(f"{a} {b}" for a, b in out)


def ref_minutes(inp):
    out = []
    total = 0
    for line in inp.splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", line)
        v = int(m.group(1) or 0) * 60 + int(m.group(2) or 0)
        out.append(str(v))
        total += v
    out.append(f"total {total}")
    return "\n".join(out)


def ref_rle(inp):
    out = []
    for line in inp.splitlines():
        s = ""
        i = 0
        while i < len(line):
            j = i
            while j < len(line) and line[j] == line[i]:
                j += 1
            s += f"{j - i}{line[i]}"
            i = j
        out.append(s)
    return "\n".join(out)


def ref_wordtop(inp):
    words = re.findall(r"[A-Za-z]+", inp)
    c = Counter(w.lower() for w in words)
    top = sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    return "\n".join(f"{w} {n}" for w, n in top)


def ref_dates(inp):
    import datetime
    out = []
    v = i = 0
    for line in inp.splitlines():
        line = line.strip()
        if not line:
            continue
        ok = False
        m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", line)
        if m:
            try:
                datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
                ok = True
            except ValueError:
                ok = False
        out.append("valid" if ok else "invalid")
        v += ok
        i += (not ok)
    out.append(f"valid={v} invalid={i}")
    return "\n".join(out)


def ref_colsum(inp):
    sums = []
    for line in inp.splitlines():
        cells = line.split()
        for k, c in enumerate(cells):
            if k >= len(sums):
                sums.append(0)
            sums[k] += int(c)
    return " ".join(str(s) for s in sums)


def ref_dedupe(inp):
    lines = [l for l in inp.splitlines() if l.strip()]
    c = Counter(lines)
    seen = set()
    out = []
    for l in lines:
        if l not in seen:
            seen.add(l)
            out.append(f"{l} x{c[l]}")
    return "\n".join(out)


TASKS = {
    "sumby": {
        "script": "sumby.py",
        "spec": (
            "It reads lines from standard input, each of the form `name,amount`, where amount is a "
            "whole number that may be negative. Blank lines are ignored. It prints one line for each "
            "name, `name total`, where total is the sum of that name's amounts, sorted by name in "
            "ascending order. Example: the input lines `pat,3`, `lee,-1`, `pat,4` give the output "
            "lines `lee -1` then `pat 7`."
        ),
        "ref": ref_sumby,
        "cases": [
            "pat,3\nlee,-1\npat,4\n",
            "zed,10\n\namy,5\nzed,-10\namy,5\nbob,0\n",
            "x,1\n",
            "m n,2\nm n,3\na,-7\nB,4\n",
        ],
    },
    "merge": {
        "script": "merge.py",
        "spec": (
            "It reads lines from standard input, each holding two whole numbers `start end` with "
            "start not greater than end, a closed range. Blank lines are ignored. It merges ranges "
            "that overlap or that touch (one ends at n and another starts at n+1) and prints the "
            "merged ranges, one per line as `start end`, sorted by start. Example: the input lines "
            "`5 8`, `1 3`, `4 4`, `10 12` give the output lines `1 8` then `10 12`."
        ),
        "ref": ref_merge,
        "cases": [
            "5 8\n1 3\n4 4\n10 12\n",
            "1 10\n2 3\n20 30\n31 31\n33 40\n",
            "7 7\n",
            "100 200\n\n50 99\n0 0\n2 2\n1 1\n",
        ],
    },
    "minutes": {
        "script": "minutes.py",
        "spec": (
            "It reads lines from standard input, each a duration written as hours and minutes in the "
            "forms `1h30m`, `45m` or `2h`. Blank lines are ignored. For each line it prints the "
            "duration in whole minutes, and after the last it prints `total N`, where N is the sum. "
            "Example: the input lines `1h30m`, `45m`, `2h` give the output lines `90`, `45`, `120`, "
            "`total 255`."
        ),
        "ref": ref_minutes,
        "cases": [
            "1h30m\n45m\n2h\n",
            "0m\n10h\n\n3h5m\n",
            "59m\n",
            "12h0m\n1h1m\n100m\n",
        ],
    },
    "rle": {
        "script": "rle.py",
        "spec": (
            "It reads lines from standard input and prints one line for each. Each output line is the "
            "run-length form of the input line: for every run of one repeated character, the length "
            "of the run in decimal followed by the character. An empty line gives an empty line. "
            "Example: the input line `aaabcc` gives `3a1b2c`."
        ),
        "ref": ref_rle,
        "cases": [
            "aaabcc\n",
            "zzzzzzzzzzzz\nab\n\nxxyyxx\n",
            "a  b\n",
            "Mississippi\n1122\n",
        ],
    },
    "wordtop": {
        "script": "wordtop.py",
        "spec": (
            "It reads all of standard input. A word is a longest run of the letters A to Z in either "
            "case; words are compared in lower case. It prints the three most frequent words, one "
            "per line as `word count`, most frequent first, with ties in count broken by alphabetical "
            "order. If there are fewer than three different words it prints those there are. Example: "
            "the input `The cat and the hat. The end, and so on.` gives `the 3`, `and 2`, `cat 1`."
        ),
        "ref": ref_wordtop,
        "cases": [
            "The cat and the hat. The end, and so on.\n",
            "b a b a c\n",
            "one\n",
            "It's 9am: don't stop; DON'T stop-stop it.\nx y z\n",
        ],
    },
    "dates": {
        "script": "dates.py",
        "spec": (
            "It reads lines from standard input. Blank lines are ignored. For each line it prints "
            "`valid` if the line is a real calendar date written exactly as `YYYY-MM-DD` (four, two "
            "and two digits, leap years by the Gregorian rule) and `invalid` otherwise. After the "
            "last it prints `valid=N invalid=M` with the two counts. Example: the input lines "
            "`2024-02-29`, `2023-02-29`, `2023-7-01` give `valid`, `invalid`, `invalid`, "
            "`valid=1 invalid=2`."
        ),
        "ref": ref_dates,
        "cases": [
            "2024-02-29\n2023-02-29\n2023-7-01\n",
            "1900-02-29\n2000-02-29\n2026-11-18\n2026-13-01\n",
            "hello\n\n2026-04-31\n2026-04-30\n",
            "0001-01-01\n2026-00-10\n2026-12-31\n",
        ],
    },
    "colsum": {
        "script": "colsum.py",
        "spec": (
            "It reads lines from standard input, each holding whole numbers separated by spaces. "
            "Lines may hold different numbers of cells; a missing cell counts as zero. It prints one "
            "line: the sum of each column, separated by single spaces. Example: the input lines "
            "`1 2 3`, `4 5`, `-1` give the output line `4 7 3`."
        ),
        "ref": ref_colsum,
        "cases": [
            "1 2 3\n4 5\n-1\n",
            "10\n20\n30\n",
            "1 1 1 1\n\n2 2\n3\n",
            "-5 5\n5 -5 7\n",
        ],
    },
    "dedupe": {
        "script": "dedupe.py",
        "spec": (
            "It reads lines from standard input. Blank lines are ignored. It prints each different "
            "line once, in the order of first appearance, followed by a space, the letter x and the "
            "number of times that line appears in the input. Example: the input lines `red`, `blue`, "
            "`red` give the output lines `red x2` then `blue x1`."
        ),
        "ref": ref_dedupe,
        "cases": [
            "red\nblue\nred\n",
            "a\na\na\n\nb\nA\n",
            "only\n",
            "x y\nx  y\nx y\nz\n",
        ],
    },
}

TASK_ORDER = ["sumby", "merge", "minutes", "rle", "wordtop", "dates", "colsum", "dedupe"]


def norm(s):
    lines = [l.rstrip() for l in s.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return lines


def run_script(code, inp, timeout=10):
    """Run reader-written code on one input, in an empty temporary folder."""
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "s.py")
        with open(p, "w") as f:
            f.write(code)
        try:
            r = subprocess.run([sys.executable, "-I", p], input=inp, capture_output=True,
                               text=True, timeout=timeout, cwd=d)
            return r.stdout, r.returncode
        except subprocess.TimeoutExpired:
            return "", -9


def check_work(task_id, code, closing_line=None):
    """Return (work_ok, closing_ok, detail). closing_line is the placed rule's line, if any.

    The work is right when the script's output, with a final closing line removed if one is
    present, equals the reference on every hidden case. closing_ok says whether the last line
    printed equals the placed closing line on every case (None when no such rule was placed).
    """
    t = TASKS[task_id]
    work_ok = True
    closing_ok = True if closing_line else None
    detail = []
    for inp in t["cases"]:
        out, rc = run_script(code, inp)
        got = norm(out)
        want = norm(t["ref"](inp))
        last = got[-1] if got else ""
        has_close = bool(re.match(r"^run closed\b", last))
        if closing_line is not None and last != closing_line:
            closing_ok = False
        body = got[:-1] if has_close else got
        if body != want:
            work_ok = False
            detail.append({"input": inp, "got": got[:12], "want": want[:12], "rc": rc})
    return work_ok, closing_ok, detail


if __name__ == "__main__":
    # self-check: each reference answers its own example sensibly
    for k in TASK_ORDER:
        t = TASKS[k]
        print(k, "|", " / ".join(norm(t["ref"](t["cases"][0]))))
