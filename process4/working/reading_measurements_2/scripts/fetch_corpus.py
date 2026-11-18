#!/usr/bin/env python3
"""Rebuild the corpus folder from the manifest: every file is taken from the git ref it came from
and checked against its recorded sha1.  fetch_corpus.py REPO MANIFEST DEST"""
import hashlib, os, subprocess, sys
repo, manifest, dest = sys.argv[1:4]
refs = {}
bad = 0
with open(manifest, encoding="utf-8") as f:
    next(f)
    for line in f:
        kind, rel, nbytes, nlines, ref, src, sha = line.rstrip("\n").split("\t")
        if ref not in refs:
            r = subprocess.run(["git", "-C", repo, "rev-parse", "--verify", "-q", ref + "^{commit}"],
                               capture_output=True, text=True)
            if r.returncode != 0:
                name = ref.replace("origin/", "").replace("tmp_", "")
                subprocess.run(["git", "-C", repo, "fetch", "-q", "--depth", "1", "origin", name], check=False)
                r = subprocess.run(["git", "-C", repo, "rev-parse", "FETCH_HEAD"], capture_output=True, text=True)
            refs[ref] = r.stdout.strip()
        data = subprocess.run(["git", "-C", repo, "show", f"{refs[ref]}:{src}"], capture_output=True).stdout
        if hashlib.sha1(data).hexdigest() != sha:
            bad += 1
            print("sha differs", rel)
        p = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(data)
print("refs", refs, "bad", bad)
