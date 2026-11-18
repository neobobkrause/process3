"""gen.py WORK READERS SERIES SIZE ARM FIRST LAST

Makes one folder per reader run under READERS, and the exact prompt for each run under WORK/prompts/.
ARM: h = habit, t = told, n = no text. Run id: SERIES-SIZE-ARM<n>, for example a-070-h3.
The reader's folder holds only what that arm may see: the text and task.md (h), the text and
questions.md (t), task.md alone (n).
"""
import sys, os, shutil
work, readers, series, size, arm, first, last = sys.argv[1:8]
src = f"{work}/texts/s{size}"
nbytes = os.path.getsize(f"{src}/text.md")
os.makedirs(f"{work}/prompts", exist_ok=True)
HABIT = """# START: summary facts

You are a worker for the coordinator.

## Reading set (read each file whole)

| file | bytes |
|---|---|
| `{d}/text.md` | {b} |
| total | {b} |

## Task

Your task is in `{d}/task.md`.

Reply with your answers as a numbered list, each line carrying its id in square brackets, and nothing else."""
TOLD = """Read the file `{d}/text.md` whole, from its first line to its last, before doing anything else. It is {b} bytes. Questions about it will follow.

Only when you have read all of it, open `{d}/questions.md` and answer the questions from what you read. Once you have opened the questions, do not open the text again and do not use any other tool.

Reply with your answers as a numbered list, each line carrying its id in square brackets, and nothing else."""
NOTEXT = """# START: summary facts

You are a worker for the coordinator.

## Task

Your task is in `{d}/task.md`.

Reply with your answers as a numbered list, each line carrying its id in square brackets, and nothing else."""
for n in range(int(first), int(last) + 1):
    run = f"{series}-{size}-{arm}{n}"
    d = f"{readers}/{run}"
    os.makedirs(d, exist_ok=True)
    if arm in "ht":
        shutil.copy(f"{src}/text.md", d)
    shutil.copy(f"{src}/task.md" if arm in "hn" else f"{src}/questions.md", d)
    p = {"h": HABIT, "t": TOLD, "n": NOTEXT}[arm].format(d=d, b=nbytes)
    open(f"{work}/prompts/{run}.txt", "w", encoding="utf-8").write(p)
    print(run)
