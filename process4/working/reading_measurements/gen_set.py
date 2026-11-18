"""gen_set.py WORK READERS SERIES SIZE FIRST LAST -- makes a folder and the exact prompt for each reader of a set.
Run id: SERIES-setSIZE-h<n>. The folder holds the set's files and task.md, and nothing else."""
import sys, os, json, shutil
work, readers, series, size, first, last = sys.argv[1:7]
S = json.load(open(f"{work}/sets/sets.json"))
P = {m["file"]: m for m in S["pieces"]}; files = S["sets"][size]["files"]
os.makedirs(f"{work}/prompts", exist_ok=True)
for n in range(int(first), int(last) + 1):
    run = f"{series}-set{size}-h{n}"; d = f"{readers}/{run}"; os.makedirs(d, exist_ok=True)
    for f in files: shutil.copy(f"{work}/sets/pieces/{f}", d)
    shutil.copy(f"{work}/sets/s{size}/task.md", d)
    rows = "\n".join(f"| `{f}` | {P[f]['bytes']} |" for f in files)
    p = f"""# START: summary facts

You are a worker for the coordinator.

## Reading set (read each file whole)

All in `{d}/`:

| file | bytes |
|---|---|
{rows}
| total | {sum(P[f]['bytes'] for f in files)} |

## Task

Your task is in `{d}/task.md`.

Reply with your answers as a numbered list, each line carrying its id in square brackets, and nothing else."""
    open(f"{work}/prompts/{run}.txt", "w", encoding="utf-8").write(p)
    print(run)
