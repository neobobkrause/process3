#!/usr/bin/env python3
"""Write a batch file for the worker that starts and collects runs, and each trial's second message.

  makebatch.py NAME ARM REP TRIAL [TRIAL...]
ARM: m main (Fable, 1M)   s small window (Fable, 200K)   o Opus   n Sonnet   h Haiku
"""
import json, os, sys
PRIV = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARMS = {"m": ("claude-fable-5-2", "claude/reading2-ground"),
        "s": ("claude-fable-5-2", "claude/reading2-ground-200k"),
        "o": ("claude-opus-5-5", "claude/reading2-ground"),
        "n": ("claude-sonnet-5-5", "claude/reading2-ground"),
        "h": ("claude-haiku-5-5", "claude/reading2-ground")}


def followup_text(key):
    qs = [("Q1", key["count_question"])] + [(q["id"], q["question"]) for q in key.get("facts", [])]
    src = "your starting text" if key["ladder"] == "start" else "the reading set"
    return ("Follow-up for the job you have just finished, from the session that started you.\n\n"
            f"Use no tool at all. From your memory of {src}, answer each question below in one line, "
            "numbered as here. Write \"unknown\" for any you do not know.\n\n"
            + "\n".join(f"{i}. {q}" for i, q in qs) + "\n")


if __name__ == "__main__":
    name, arm, rep = sys.argv[1:4]
    model, rev = ARMS[arm]
    os.makedirs(os.path.join(PRIV, "followup"), exist_ok=True)
    os.makedirs("/home/user/r2/batches", exist_ok=True)
    with open(f"/home/user/r2/batches/{name}.jsonl", "w") as f:
        for tid in sys.argv[4:]:
            key = json.load(open(os.path.join(PRIV, "keys", tid + ".json")))
            fp = os.path.join(PRIV, "followup", tid + ".txt")
            open(fp, "w").write(followup_text(key))
            f.write(json.dumps({"run": f"{tid}-{arm}{rep}", "model": model, "revision": rev,
                                "start": os.path.join(PRIV, "start", tid + ".txt"), "followup": fp}) + "\n")
    print("batch", name, len(sys.argv) - 4, "runs")
