#!/usr/bin/env bash
# Delete civicsmith-copy branches whose work is already fully merged into the tranche.
# For Bob to run on his own computer (sessions may not delete branches: CLAUDE.md).
#
#   1. Install the GitHub CLI once (https://cli.github.com) and sign in:  gh auth login
#   2. Dry run (deletes nothing, writes the list to merged-branches.txt):
#        bash delete-merged-branches.sh
#   3. Read merged-branches.txt if you like, then delete:
#        bash delete-merged-branches.sh --delete
#
# A branch is deleted only when ALL of these hold, checked live at run time:
#   - GitHub's compare says it has 0 commits that the tranche does not have (nothing is lost);
#   - it is not tranche, main or process-state;
#   - it is not the head of an open pull request;
#   - its last commit is more than 2 hours old (leaves anything the merge train is using now).
# A deleted branch can be restored from its pull request page ("Restore branch") or recreated
# from the tranche, since every one of its commits is already there.
set -euo pipefail
REPO=neobobkrause/civicsmith-copy
BASE=tranche
DO_DELETE=${1:-}
OUT=merged-branches.txt
now=$(date +%s)

echo "Reading open pull requests..."
open_heads=$(gh pr list -R "$REPO" --state open --limit 1000 --json headRefName --jq '.[].headRefName')

echo "Reading branches..."
branches=$(gh api "repos/$REPO/branches" --paginate --jq '.[].name')
total=$(echo "$branches" | wc -l | tr -d ' ')
: > "$OUT"
n=0; checked=0
while IFS= read -r b; do
  checked=$((checked+1))
  case "$b" in tranche|main|process-state) continue;; esac
  if grep -qxF "$b" <<<"$open_heads"; then continue; fi
  enc=$(printf '%s' "$b" | sed 's|/|%2F|g')
  info=$(gh api "repos/$REPO/compare/$BASE...$enc" --jq '[.ahead_by, .commits[-1].commit.committer.date // ""] | @tsv' 2>/dev/null || true)
  ahead=$(cut -f1 <<<"$info"); [ "$ahead" = "0" ] || continue
  last=$(gh api "repos/$REPO/commits/$enc" --jq '.commit.committer.date' 2>/dev/null || true)
  [ -n "$last" ] || continue
  age=$(( now - $(date -d "$last" +%s 2>/dev/null || date -j -f '%Y-%m-%dT%H:%M:%SZ' "$last" +%s) ))
  [ "$age" -gt 7200 ] || continue
  echo "$b" >> "$OUT"; n=$((n+1))
  printf '\r%s of %s branches checked, %s fully merged' "$checked" "$total" "$n"
done <<<"$branches"
echo
echo "$n branches are fully merged into $BASE and safe to delete; list in $OUT"

if [ "$DO_DELETE" = "--delete" ]; then
  d=0
  while IFS= read -r b; do
    enc=$(printf '%s' "$b" | sed 's|/|%2F|g')
    if gh api -X DELETE "repos/$REPO/git/refs/heads/$enc" >/dev/null 2>&1; then d=$((d+1)); else echo "could not delete $b"; fi
  done < "$OUT"
  echo "deleted $d branches"
else
  echo "Dry run: nothing deleted. Run again with --delete to delete them."
fi
